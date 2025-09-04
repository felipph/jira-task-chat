import { defineStore } from 'pinia';
import { useCardTemplateStore } from './cardTemplateStore.js';
import { useAIProviderStore } from './aiProviderStore.js';
import { useJiraStore } from './jiraStore.js';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [],
    isTyping: false,
    currentConversation: null,
    chatHistory: [],
    isProcessingCard: false,
    pendingCard: null
  }),

  getters: {
    lastMessage: (state) => {
      return state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
    },

    hasMessages: (state) => {
      return state.messages.length > 0;
    },

    userMessages: (state) => {
      return state.messages.filter(msg => msg.type === 'user');
    },

    assistantMessages: (state) => {
      return state.messages.filter(msg => msg.type === 'assistant');
    }
  },

  actions: {
    // Adicionar mensagem ao chat
    addMessage(message) {
      const newMessage = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        ...message
      };
      
      this.messages.push(newMessage);
      return newMessage;
    },

    // Adicionar mensagem do usuário
    addUserMessage(text) {
      return this.addMessage({
        type: 'user',
        text,
        sender: 'Usuário'
      });
    },

    // Adicionar mensagem do assistente
    addAssistantMessage(text, data = null) {
      return this.addMessage({
        type: 'assistant',
        text,
        sender: 'Assistente IA',
        data
      });
    },

    // Simular digitação do assistente
    async simulateTyping(duration = 1500) {
      this.isTyping = true;
      await new Promise(resolve => setTimeout(resolve, duration));
      this.isTyping = false;
    },

    // Processar mensagem do usuário
    async processUserMessage(userInput) {
      // Adicionar mensagem do usuário
      this.addUserMessage(userInput);
      
      // Simular digitação
      await this.simulateTyping();
      
      // Analisar a intenção do usuário
      const intent = this.analyzeUserIntent(userInput);
      
      switch (intent.type) {
        case 'create_card':
          await this.handleCreateCardIntent(userInput, intent);
          break;
        case 'greeting':
          this.handleGreeting();
          break;
        case 'help':
          this.handleHelp();
          break;
        case 'list_templates':
          this.handleListTemplates();
          break;
        default:
          this.handleUnknownIntent(userInput);
      }
    },

    // Analisar intenção do usuário
    analyzeUserIntent(input) {
      const lowerInput = input.toLowerCase();
      
      // Palavras-chave para criação de cartão
      const createKeywords = [
        'criar', 'preciso', 'quero', 'gostaria', 'desenvolver', 'implementar',
        'corrigir', 'bug', 'erro', 'problema', 'tarefa', 'funcionalidade',
        'feature', 'documentar', 'documentação'
      ];
      
      // Palavras-chave para saudação
      const greetingKeywords = ['oi', 'olá', 'hello', 'bom dia', 'boa tarde', 'boa noite'];
      
      // Palavras-chave para ajuda
      const helpKeywords = ['ajuda', 'help', 'como', 'o que', 'comandos'];
      
      // Palavras-chave para listar templates
      const templateKeywords = ['templates', 'tipos', 'modelos', 'categorias'];
      
      if (createKeywords.some(keyword => lowerInput.includes(keyword))) {
        return { type: 'create_card', confidence: 0.8 };
      }
      
      if (greetingKeywords.some(keyword => lowerInput.includes(keyword))) {
        return { type: 'greeting', confidence: 0.9 };
      }
      
      if (helpKeywords.some(keyword => lowerInput.includes(keyword))) {
        return { type: 'help', confidence: 0.7 };
      }
      
      if (templateKeywords.some(keyword => lowerInput.includes(keyword))) {
        return { type: 'list_templates', confidence: 0.8 };
      }
      
      return { type: 'unknown', confidence: 0.1 };
    },

    // Lidar com intenção de criar cartão
    async handleCreateCardIntent(userInput, intent) {
      this.isProcessingCard = true;
      
      try {
        const templateStore = useCardTemplateStore();
        const aiStore = useAIProviderStore();
        
        let analysisResult;
        
        // Sempre usar análise local primeiro para garantir funcionamento
        analysisResult = aiStore.fallbackAnalysis(userInput);
        
        // Tentar usar IA real se configurada (mas não bloquear se falhar)
        if (aiStore.isConfigured && aiStore.config.apiKey && aiStore.config.apiKey !== 'sk-test-1234567890abcdef123456') {
          try {
            const aiResult = await aiStore.analyzeUserIntent(userInput);
            // Se IA funcionar, usar resultado da IA
            analysisResult = aiResult;
          } catch (error) {
            console.warn('IA não disponível, usando análise local:', error);
            // Manter analysisResult do fallback
          }
        }
        
        // Processar resultado com o template store
        const result = await templateStore.processUserInputWithAI(userInput, analysisResult);
        
        if (result.success) {
          this.pendingCard = result;
          
          const aiSource = (aiStore.isConfigured && aiStore.config.apiKey && aiStore.config.apiKey !== 'sk-test-1234567890abcdef123456') ? 'IA' : 'análise local';
          
          const response = `Identifiquei que você quer criar um cartão do tipo **${result.template.name}** com ${Math.round(result.confidence * 100)}% de confiança (${aiSource}).

**Dados extraídos:**
- **Título:** ${result.extractedData.title}
- **Descrição:** ${result.extractedData.description}
- **Prioridade:** ${result.extractedData.priority || 'Medium'}

Gostaria de confirmar a criação deste cartão ou fazer alguma alteração?

*Comandos disponíveis:*
- "confirmar" - para criar o cartão
- "alterar título [novo título]" - para alterar o título
- "alterar descrição [nova descrição]" - para alterar a descrição
- "cancelar" - para cancelar a criação`;

          this.addAssistantMessage(response, {
            type: 'card_preview',
            template: result.template,
            extractedData: result.extractedData,
            filledCard: result.filledCard,
            aiSource
          });
        } else {
          this.addAssistantMessage(
            'Desculpe, não consegui processar sua solicitação. Pode tentar reformular sua mensagem?'
          );
        }
      } catch (error) {
        console.error('Erro ao processar criação de cartão:', error);
        this.addAssistantMessage(
          'Ocorreu um erro ao processar sua solicitação. Tente novamente ou reformule sua mensagem.'
        );
      } finally {
        this.isProcessingCard = false;
      }
    },

    // Lidar com saudação
    handleGreeting() {
      const greetings = [
        'Olá! Sou seu assistente para gerenciar cartões do JIRA. Como posso ajudar você hoje?',
        'Oi! Estou aqui para ajudar você a criar e gerenciar cartões do JIRA. O que você gostaria de fazer?',
        'Olá! Pronto para criar alguns cartões no JIRA? Me diga o que você precisa!'
      ];
      
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      this.addAssistantMessage(randomGreeting);
    },

    // Lidar com pedido de ajuda
    handleHelp() {
      const helpText = `Posso ajudar você a criar cartões no JIRA de forma natural! Aqui estão algumas coisas que você pode fazer:

**Criar cartões:**
- "Preciso corrigir um bug na tela de login"
- "Quero desenvolver uma nova funcionalidade de relatórios"
- "Criar uma tarefa técnica para otimizar o banco de dados"

**Outros comandos:**
- "templates" - ver tipos de cartões disponíveis
- "ajuda" - mostrar esta mensagem
- "limpar" - limpar o chat

Basta descrever o que você precisa fazer e eu identificarei o tipo de cartão mais adequado!`;

      this.addAssistantMessage(helpText);
    },

    // Lidar com listagem de templates
    handleListTemplates() {
      const templateStore = useCardTemplateStore();
      const templates = templateStore.availableTemplates;
      
      let response = 'Aqui estão os tipos de cartões disponíveis:\n\n';
      
      templates.forEach((template, index) => {
        response += `**${index + 1}. ${template.name}**\n`;
        response += `${template.description}\n`;
        response += `*Palavras-chave:* ${template.keywords.join(', ')}\n\n`;
      });
      
      response += 'Para criar um cartão, basta descrever sua tarefa usando linguagem natural!';
      
      this.addAssistantMessage(response);
    },

    // Lidar com intenção desconhecida
    handleUnknownIntent(userInput) {
      const responses = [
        'Não entendi muito bem. Você pode me dizer o que gostaria de fazer? Por exemplo: "Preciso criar um cartão para corrigir um bug".',
        'Desculpe, não compreendi sua solicitação. Tente descrever a tarefa que você quer criar no JIRA.',
        'Hmm, não consegui identificar o que você quer fazer. Pode reformular sua mensagem? Ou digite "ajuda" para ver os comandos disponíveis.'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      this.addAssistantMessage(randomResponse);
    },

    // Confirmar criação de cartão
    async confirmCardCreation() {
      if (!this.pendingCard) {
        this.addAssistantMessage('Não há nenhum cartão pendente para confirmar.');
        return;
      }

      this.isProcessingCard = true;
      
      try {
        const jiraStore = useJiraStore();
        const templateStore = useCardTemplateStore();
        
        // Verificar se JIRA está configurado
        if (!jiraStore.isConfigured) {
          this.addAssistantMessage(
            '⚠️ **JIRA não configurado**\n\nPara criar cartões reais, você precisa configurar a conexão com o JIRA primeiro.\n\n**Como configurar:**\n1. Vá em Configurações → JIRA\n2. Preencha URL da instância, email e API token\n3. Teste a conexão\n\nPor enquanto, vou simular a criação do cartão.',
            {
              type: 'warning',
              action: 'configure_jira'
            }
          );
          
          // Simular criação se JIRA não estiver configurado
          await this.simulateCardCreation();
          return;
        }

        // Verificar se há conexão com JIRA
        if (!jiraStore.isConnected) {
          this.addAssistantMessage('🔄 Testando conexão com JIRA...');
          
          try {
            await jiraStore.testConnection();
            this.addAssistantMessage('✅ Conexão estabelecida! Criando cartão...');
          } catch (error) {
            this.addAssistantMessage(
              `❌ **Erro de conexão com JIRA**\n\n${error.message}\n\nVerifique suas configurações e tente novamente.\n\nPor enquanto, vou simular a criação do cartão.`,
              {
                type: 'error',
                action: 'configure_jira'
              }
            );
            
            // Simular criação se conexão falhar
            await this.simulateCardCreation();
            return;
          }
        }

        // Converter template para formato JIRA
        const jiraIssueData = jiraStore.convertTemplateToJiraFormat(
          this.pendingCard.template,
          this.pendingCard.extractedData,
          jiraStore.config.defaultProject
        );

        this.addAssistantMessage('🚀 Criando cartão no JIRA...');

        // Criar cartão no JIRA
        const createdCard = await jiraStore.createIssue(jiraIssueData);
        
        // Salvar cartão criado no template store
        templateStore.setLastCreatedCard({
          key: createdCard.key,
          url: createdCard.url,
          template: this.pendingCard.template.name,
          extractedData: this.pendingCard.extractedData
        });

        // Resposta de sucesso
        const successMessage = `🎉 **Cartão criado com sucesso no JIRA!**

**${createdCard.key}** - ${this.pendingCard.extractedData.title}

**Tipo:** ${this.pendingCard.template.name}
**Projeto:** ${jiraStore.config.defaultProject || 'Padrão'}

🔗 [**Abrir cartão no JIRA**](${createdCard.url})

**Próximos passos:**
• Atualizar descrição ou campos
• Registrar tempo trabalhado
• Criar outro cartão
• Ver templates disponíveis

Como posso ajudar você agora?`;

        this.addAssistantMessage(successMessage, {
          type: 'card_created',
          cardKey: createdCard.key,
          cardUrl: createdCard.url,
          cardData: createdCard
        });

        // Atualizar estatísticas
        this.cardsCreated++;

      } catch (error) {
        console.error('Erro ao criar cartão no JIRA:', error);
        
        let errorMessage = '❌ **Erro ao criar cartão no JIRA**\n\n';
        
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          errorMessage += '🔐 **Credenciais inválidas**\nVerifique seu email e API token nas configurações.';
        } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
          errorMessage += '🚫 **Sem permissão**\nVocê não tem permissão para criar cartões neste projeto.';
        } else if (error.message.includes('Not Found') || error.message.includes('404')) {
          errorMessage += '📁 **Projeto não encontrado**\nVerifique se o projeto padrão está correto.';
        } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage += '⏱️ **Timeout na conexão**\nA requisição demorou muito. Tente novamente.';
        } else {
          errorMessage += `🔧 **Erro técnico:**\n${error.message}`;
        }
        
        errorMessage += '\n\n**Sugestões:**\n• Verifique suas configurações do JIRA\n• Teste a conexão novamente\n• Entre em contato com o administrador';

        this.addAssistantMessage(errorMessage, {
          type: 'error',
          action: 'configure_jira'
        });
        
        // Simular criação como fallback
        this.addAssistantMessage('🔄 Criando cartão simulado como alternativa...');
        await this.simulateCardCreation();
        
      } finally {
        this.isProcessingCard = false;
        this.pendingCard = null;
      }
    },

    // Simular criação de cartão (fallback)
    async simulateCardCreation() {
      await this.simulateTyping(1500);
      
      const cardKey = `PROJ-${Math.floor(Math.random() * 1000) + 100}`;
      const cardUrl = `https://sua-empresa.atlassian.net/browse/${cardKey}`;
      
      const simulatedMessage = `🎭 **Cartão simulado criado!**

**${cardKey}** - ${this.pendingCard.extractedData.title}

**Tipo:** ${this.pendingCard.template.name}
**Status:** Simulado (não criado no JIRA real)

📝 **Nota:** Este é um cartão simulado. Para criar cartões reais, configure a integração com o JIRA nas configurações.

**Dados que seriam enviados:**
• **Título:** ${this.pendingCard.extractedData.title}
• **Descrição:** ${this.pendingCard.extractedData.description}
• **Tipo:** ${this.pendingCard.template.name}
• **Prioridade:** ${this.pendingCard.extractedData.priority || 'Medium'}`;

      this.addAssistantMessage(simulatedMessage, {
        type: 'card_simulated',
        cardKey,
        cardUrl,
        cardData: this.pendingCard
      });

      // Atualizar estatísticas (simuladas)
      this.cardsCreated++;
    },

    // Cancelar criação de cartão
    cancelCardCreation() {
      this.pendingCard = null;
      this.addAssistantMessage('Criação de cartão cancelada. Como posso ajudar você agora?');
    },

    // Limpar chat
    clearChat() {
      this.messages = [];
      this.pendingCard = null;
      this.addAssistantMessage('Chat limpo! Como posso ajudar você?');
    },

    // Salvar conversa no histórico
    saveConversation() {
      if (this.messages.length > 0) {
        const conversation = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          messages: [...this.messages],
          summary: this.generateConversationSummary()
        };
        
        this.chatHistory.push(conversation);
        return conversation;
      }
    },

    // Gerar resumo da conversa
    generateConversationSummary() {
      const userMessages = this.userMessages;
      if (userMessages.length === 0) return 'Conversa vazia';
      
      const firstMessage = userMessages[0].text;
      return firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage;
    },

    // Carregar conversa do histórico
    loadConversation(conversationId) {
      const conversation = this.chatHistory.find(c => c.id === conversationId);
      if (conversation) {
        this.messages = [...conversation.messages];
        this.currentConversation = conversation;
      }
    }
  }
});

