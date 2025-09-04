import { defineStore } from 'pinia';

export const useAIProviderStore = defineStore('aiProvider', {
  state: () => ({
    // Configurações do provedor de IA
    config: {
      apiUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.7,
      timeout: 30000
    },
    
    // Estado da conexão
    isConnected: false,
    isConnecting: false,
    lastConnectionTest: null,
    connectionError: null,
    
    // Configurações salvas
    savedConfigs: [],
    currentConfigId: null,
    
    // Estatísticas de uso
    usage: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokensUsed: 0,
      lastRequestTime: null
    }
  }),

  getters: {
    isConfigured: (state) => {
      return state.config.apiUrl && state.config.apiKey;
    },

    connectionStatus: (state) => {
      if (state.isConnecting) return 'connecting';
      if (state.isConnected) return 'connected';
      if (state.connectionError) return 'error';
      return 'disconnected';
    },

    successRate: (state) => {
      if (state.usage.totalRequests === 0) return 0;
      return (state.usage.successfulRequests / state.usage.totalRequests) * 100;
    },

    currentConfig: (state) => {
      if (state.currentConfigId) {
        return state.savedConfigs.find(config => config.id === state.currentConfigId);
      }
      return null;
    }
  },

  actions: {
    // Atualizar configuração
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.isConnected = false;
      this.connectionError = null;
    },

    // Testar conexão com o provedor de IA
    async testConnection() {
      if (!this.isConfigured) {
        throw new Error('Configuração incompleta. Forneça URL da API e chave de API.');
      }

      this.isConnecting = true;
      this.connectionError = null;

      try {
        const response = await this.makeAIRequest({
          messages: [
            {
              role: 'user',
              content: 'Teste de conexão. Responda apenas "OK".'
            }
          ],
          max_tokens: 10
        });

        if (response && response.choices && response.choices.length > 0) {
          this.isConnected = true;
          this.lastConnectionTest = new Date().toISOString();
          return { success: true, message: 'Conexão estabelecida com sucesso!' };
        } else {
          throw new Error('Resposta inválida do provedor de IA');
        }
      } catch (error) {
        this.isConnected = false;
        this.connectionError = error.message;
        throw error;
      } finally {
        this.isConnecting = false;
      }
    },

    // Fazer requisição para o provedor de IA
    async makeAIRequest(payload) {
      if (!this.isConfigured) {
        throw new Error('Provedor de IA não configurado');
      }

      const requestPayload = {
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        ...payload
      };

      this.usage.totalRequests++;
      this.usage.lastRequestTime = new Date().toISOString();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Atualizar estatísticas
        this.usage.successfulRequests++;
        if (data.usage && data.usage.total_tokens) {
          this.usage.totalTokensUsed += data.usage.total_tokens;
        }

        return data;
      } catch (error) {
        this.usage.failedRequests++;
        
        if (error.name === 'AbortError') {
          throw new Error('Timeout: A requisição demorou muito para responder');
        }
        
        throw error;
      }
    },

    // Processar texto com IA para análise de intenção
    async analyzeUserIntent(userInput) {
      const prompt = `Analise a seguinte mensagem do usuário e identifique:
1. Tipo de tarefa (bug, feature, documentação, tarefa técnica)
2. Título sugerido (máximo 50 caracteres)
3. Descrição extraída
4. Prioridade sugerida (low, medium, high, critical)
5. Confiança da análise (0-1)

Mensagem: "${userInput}"

Responda APENAS em formato JSON válido sem nenhum tipo de delimitador ou \"\`\`\`\":
{
  "type": "bug|feature|documentation|technical",
  "title": "título sugerido",
  "description": "descrição extraída",
  "priority": "low|medium|high|critical",
  "confidence": 0.8
}`;

      try {
        const response = await this.makeAIRequest({
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em análise de requisitos para JIRA. Sempre responda em JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        });

        const content = response.choices[0].message.content.trim();
        
        // Tentar extrair JSON da resposta
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Resposta da IA não está em formato JSON válido');
        }
      } catch (error) {
        console.error('Erro na análise de intenção:', error);
        // Fallback para análise local em caso de erro
        return this.fallbackAnalysis(userInput);
      }
    },

    // Análise de fallback local
    fallbackAnalysis(userInput) {
      const input = userInput.toLowerCase();
      
      let type = 'feature';
      let priority = 'medium';
      
      if (input.includes('bug') || input.includes('erro') || input.includes('problema')) {
        type = 'bug';
        priority = 'high';
      } else if (input.includes('documentar') || input.includes('documentação')) {
        type = 'documentation';
        priority = 'low';
      } else if (input.includes('técnica') || input.includes('refatorar') || input.includes('otimizar')) {
        type = 'technical';
        priority = 'medium';
      }
      
      if (input.includes('crítico') || input.includes('urgente')) {
        priority = 'critical';
      } else if (input.includes('baixa') || input.includes('opcional')) {
        priority = 'low';
      }

      const sentences = userInput.split(/[.!?]/);
      const title = sentences[0].trim().substring(0, 50);
      
      return {
        type,
        title,
        description: userInput,
        priority,
        confidence: 0.6
      };
    },

    // Salvar configuração
    saveConfig(name, description = '') {
      const config = {
        id: Date.now().toString(),
        name,
        description,
        config: { ...this.config },
        createdAt: new Date().toISOString()
      };
      
      this.savedConfigs.push(config);
      return config;
    },

    // Carregar configuração salva
    loadConfig(configId) {
      const config = this.savedConfigs.find(c => c.id === configId);
      if (config) {
        this.config = { ...config.config };
        this.currentConfigId = configId;
        this.isConnected = false;
        this.connectionError = null;
        return true;
      }
      return false;
    },

    // Remover configuração salva
    removeConfig(configId) {
      const index = this.savedConfigs.findIndex(c => c.id === configId);
      if (index !== -1) {
        this.savedConfigs.splice(index, 1);
        if (this.currentConfigId === configId) {
          this.currentConfigId = null;
        }
        return true;
      }
      return false;
    },

    // Resetar estatísticas
    resetUsageStats() {
      this.usage = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokensUsed: 0,
        lastRequestTime: null
      };
    },

    // Validar configuração
    validateConfig(config = this.config) {
      const errors = [];
      
      if (!config.apiUrl) {
        errors.push('URL da API é obrigatória');
      } else {
        try {
          new URL(config.apiUrl);
        } catch {
          errors.push('URL da API inválida');
        }
      }
      
      if (!config.apiKey) {
        errors.push('Chave da API é obrigatória');
      } else if (config.apiKey.length < 10) {
        errors.push('Chave da API muito curta');
      }
      
      if (!config.model) {
        errors.push('Modelo é obrigatório');
      }
      
      if (config.maxTokens < 1 || config.maxTokens > 4000) {
        errors.push('Max tokens deve estar entre 1 e 4000');
      }
      
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push('Temperature deve estar entre 0 e 2');
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    },

    // Obter modelos disponíveis (simulado)
    getAvailableModels() {
      return [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e eficiente' },
        { id: 'gpt-4', name: 'GPT-4', description: 'Mais avançado e preciso' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão otimizada do GPT-4' },
        { id: 'openai/gpt-oss-120b:free', name: 'gpt-oss-120b:free', description: 'GPT-OSS' },
        { id: 'deepseek/deepseek-chat-v3.1:free', name: 'deepseek-chat-v3.1:free', description: 'deepseek-chat-v3.1:free' },
      ];
    }
  }
});

