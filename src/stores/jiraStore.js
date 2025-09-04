import { defineStore } from 'pinia';

export const useJiraStore = defineStore('jira', {
  state: () => ({
    // Configurações de conexão
    config: {
      baseUrl: '',
      email: '',
      apiToken: '',
      defaultProject: '',
      timeout: 30000
    },
    
    // Estado da conexão
    isConnected: false,
    isConnecting: false,
    lastConnectionTest: null,
    connectionError: null,
    
    // Cache de dados
    projects: [],
    issueTypes: [],
    priorities: [],
    statuses: [],
    users: [],
    
    // Configurações salvas
    savedConfigs: [],
    currentConfigId: null,
    
    // Estatísticas de uso
    usage: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cardsCreated: 0,
      timeLogged: 0,
      lastRequestTime: null
    },
    
    // Cache de cartões criados
    createdCards: [],
    
    // Estado de loading
    isLoading: false,
    loadingMessage: ''
  }),

  getters: {
    isConfigured: (state) => {
      return state.config.baseUrl && state.config.email && state.config.apiToken;
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
    },

    availableProjects: (state) => {
      return state.projects.map(project => ({
        value: project.key,
        label: `${project.name} (${project.key})`,
        description: project.description || 'Sem descrição'
      }));
    },

    availableIssueTypes: (state) => {
      return state.issueTypes.map(type => ({
        value: type.id,
        label: type.name,
        description: type.description || '',
        iconUrl: type.iconUrl
      }));
    }
  },

  actions: {
    // Atualizar configuração
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      this.isConnected = false;
      this.connectionError = null;
      this.clearCache();
    },

    // Limpar cache
    clearCache() {
      this.projects = [];
      this.issueTypes = [];
      this.priorities = [];
      this.statuses = [];
      this.users = [];
    },

    // Fazer requisição para API do JIRA
    async makeJiraRequest(endpoint, options = {}) {
      if (!this.isConfigured) {
        throw new Error('JIRA não configurado');
      }

      const { method = 'GET', body, headers = {} } = options;
      
      // Preparar headers de autenticação
      const auth = btoa(`${this.config.email}:${this.config.apiToken}`);
      const requestHeaders = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      };

      this.usage.totalRequests++;
      this.usage.lastRequestTime = new Date().toISOString();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const url = `${this.config.baseUrl}/rest/api/3/${endpoint}`;
        
        const response = await fetch(url, {
          mode: 'no-cors',
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.errorMessages?.[0] || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.usage.successfulRequests++;
        
        return data;
      } catch (error) {
        this.usage.failedRequests++;
        
        if (error.name === 'AbortError') {
          throw new Error('Timeout: A requisição demorou muito para responder');
        }
        
        throw error;
      }
    },

    // Testar conexão com JIRA
    async testConnection() {
      if (!this.isConfigured) {
        throw new Error('Configuração incompleta. Forneça URL, email e API token.');
      }

      this.isConnecting = true;
      this.connectionError = null;

      try {
        // Testar com endpoint simples
        const response = await this.makeJiraRequest('myself');
        
        if (response && response.accountId) {
          this.isConnected = true;
          this.lastConnectionTest = new Date().toISOString();
          
          // Carregar dados básicos
          await this.loadBasicData();
          
          return { 
            success: true, 
            message: `Conexão estabelecida com sucesso! Usuário: ${response.displayName}`,
            user: response
          };
        } else {
          throw new Error('Resposta inválida do JIRA');
        }
      } catch (error) {
        this.isConnected = false;
        this.connectionError = error.message;
        throw error;
      } finally {
        this.isConnecting = false;
      }
    },

    // Carregar dados básicos do JIRA
    async loadBasicData() {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Carregando dados do JIRA...';

        // Carregar projetos
        this.loadingMessage = 'Carregando projetos...';
        const projectsResponse = await this.makeJiraRequest('project/search');
        this.projects = projectsResponse.values || [];

        // Carregar tipos de issue
        this.loadingMessage = 'Carregando tipos de issue...';
        const issueTypesResponse = await this.makeJiraRequest('issuetype');
        this.issueTypes = issueTypesResponse || [];

        // Carregar prioridades
        this.loadingMessage = 'Carregando prioridades...';
        const prioritiesResponse = await this.makeJiraRequest('priority');
        this.priorities = prioritiesResponse || [];

        // Carregar status
        this.loadingMessage = 'Carregando status...';
        const statusesResponse = await this.makeJiraRequest('status');
        this.statuses = statusesResponse || [];

      } catch (error) {
        console.error('Erro ao carregar dados básicos:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingMessage = '';
      }
    },

    // Criar cartão no JIRA
    async createIssue(issueData) {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Criando cartão no JIRA...';

        const response = await this.makeJiraRequest('issue', {
          method: 'POST',
          body: issueData
        });

        if (response && response.key) {
          // Adicionar ao cache de cartões criados
          const createdCard = {
            key: response.key,
            id: response.id,
            self: response.self,
            url: `${this.config.baseUrl}/browse/${response.key}`,
            createdAt: new Date().toISOString(),
            data: issueData
          };
          
          this.createdCards.unshift(createdCard);
          this.usage.cardsCreated++;
          
          return createdCard;
        } else {
          throw new Error('Resposta inválida ao criar cartão');
        }
      } catch (error) {
        console.error('Erro ao criar cartão:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingMessage = '';
      }
    },

    // Buscar cartão por chave
    async getIssue(issueKey) {
      try {
        const response = await this.makeJiraRequest(`issue/${issueKey}`);
        return response;
      } catch (error) {
        console.error('Erro ao buscar cartão:', error);
        throw error;
      }
    },

    // Atualizar cartão
    async updateIssue(issueKey, updateData) {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Atualizando cartão...';

        await this.makeJiraRequest(`issue/${issueKey}`, {
          method: 'PUT',
          body: updateData
        });

        return { success: true, message: 'Cartão atualizado com sucesso' };
      } catch (error) {
        console.error('Erro ao atualizar cartão:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingMessage = '';
      }
    },

    // Registrar tempo de trabalho
    async logWork(issueKey, worklogData) {
      try {
        this.isLoading = true;
        this.loadingMessage = 'Registrando tempo...';

        const response = await this.makeJiraRequest(`issue/${issueKey}/worklog`, {
          method: 'POST',
          body: worklogData
        });

        if (response && response.id) {
          this.usage.timeLogged += this.parseTimeSpent(worklogData.timeSpent);
          return response;
        } else {
          throw new Error('Erro ao registrar tempo');
        }
      } catch (error) {
        console.error('Erro ao registrar tempo:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingMessage = '';
      }
    },

    // Buscar projetos do usuário
    async searchProjects(query = '') {
      try {
        const endpoint = query 
          ? `project/search?query=${encodeURIComponent(query)}`
          : 'project/search';
        
        const response = await this.makeJiraRequest(endpoint);
        return response.values || [];
      } catch (error) {
        console.error('Erro ao buscar projetos:', error);
        throw error;
      }
    },

    // Converter template para formato JIRA
    convertTemplateToJiraFormat(template, extractedData, projectKey) {
      const jiraIssue = {
        fields: {}
      };

      // Mapear campos do template para campos JIRA
      for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
        const value = extractedData[fieldKey] || fieldConfig.defaultValue;
        
        switch (fieldKey) {
          case 'project':
            jiraIssue.fields.project = { key: projectKey || this.config.defaultProject };
            break;
          case 'issuetype':
            jiraIssue.fields.issuetype = { name: value };
            break;
          case 'summary':
            jiraIssue.fields.summary = value;
            break;
          case 'description':
            jiraIssue.fields.description = {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: value
                    }
                  ]
                }
              ]
            };
            break;
          case 'priority':
            jiraIssue.fields.priority = { name: value };
            break;
          default:
            // Campos customizados
            if (fieldKey.startsWith('customfield_')) {
              jiraIssue.fields[fieldKey] = value;
            }
        }
      }

      return jiraIssue;
    },

    // Parsear tempo gasto (ex: "2h 30m" -> 150 minutos)
    parseTimeSpent(timeSpent) {
      const regex = /(?:(\d+)h)?\s*(?:(\d+)m)?/;
      const match = timeSpent.match(regex);
      
      if (match) {
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        return hours * 60 + minutes;
      }
      
      return 0;
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
        this.clearCache();
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
        cardsCreated: 0,
        timeLogged: 0,
        lastRequestTime: null
      };
    },

    // Validar configuração
    validateConfig(config = this.config) {
      const errors = [];
      
      if (!config.baseUrl) {
        errors.push('URL da instância JIRA é obrigatória');
      } else {
        try {
          const url = new URL(config.baseUrl);
          if (!url.hostname.includes('atlassian.net') && !url.hostname.includes('jira')) {
            errors.push('URL deve ser uma instância válida do JIRA');
          }
        } catch {
          errors.push('URL da instância JIRA inválida');
        }
      }
      
      if (!config.email) {
        errors.push('Email é obrigatório');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
        errors.push('Email inválido');
      }
      
      if (!config.apiToken) {
        errors.push('API Token é obrigatório');
      } else if (config.apiToken.length < 10) {
        errors.push('API Token muito curto');
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    },

    // Obter informações do usuário atual
    async getCurrentUser() {
      try {
        return await this.makeJiraRequest('myself');
      } catch (error) {
        console.error('Erro ao obter usuário atual:', error);
        throw error;
      }
    },

    // Buscar usuários (para atribuição)
    async searchUsers(query) {
      try {
        const response = await this.makeJiraRequest(`user/search?query=${encodeURIComponent(query)}`);
        return response || [];
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
      }
    }
  }
});

