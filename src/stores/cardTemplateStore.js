import { defineStore } from 'pinia';
import { 
  cardTemplates, 
  globalConfig, 
  identifyTemplate, 
  extractFieldsFromInput, 
  fillTemplate 
} from '../config/cardTemplates.js';

export const useCardTemplateStore = defineStore('cardTemplate', {
  state: () => ({
    templates: cardTemplates,
    config: globalConfig,
    currentTemplate: null,
    extractedData: {},
    filledCard: {},
    isProcessing: false,
    lastCreatedCard: null
  }),

  getters: {
    availableTemplates: (state) => {
      return Object.entries(state.templates).map(([id, template]) => ({
        id,
        name: template.name,
        description: template.description,
        keywords: template.keywords
      }));
    },

    templateById: (state) => {
      return (templateId) => state.templates[templateId];
    },

    isTemplateSelected: (state) => {
      return state.currentTemplate !== null;
    }
  },

  actions: {
    // Processar entrada do usuário e identificar template
    async processUserInput(userInput) {
      this.isProcessing = true;
      
      try {
        // Identificar o template mais adequado
        const identification = identifyTemplate(userInput);
        this.currentTemplate = identification;
        
        // Extrair dados da entrada do usuário
        this.extractedData = extractFieldsFromInput(userInput, identification.template);
        
        // Preencher o template com os dados extraídos
        this.filledCard = fillTemplate(identification.template, this.extractedData);
        
        return {
          success: true,
          template: identification.template,
          confidence: identification.confidence,
          extractedData: this.extractedData,
          filledCard: this.filledCard
        };
      } catch (error) {
        console.error('Erro ao processar entrada do usuário:', error);
        return {
          success: false,
          error: error.message
        };
      } finally {
        this.isProcessing = false;
      }
    },

    // Selecionar template manualmente
    selectTemplate(templateId) {
      if (this.templates[templateId]) {
        this.currentTemplate = {
          templateId,
          template: this.templates[templateId],
          confidence: 1.0
        };
        return true;
      }
      return false;
    },

    // Atualizar dados extraídos
    updateExtractedData(field, value) {
      this.extractedData[field] = value;
      
      // Reprocessar o template com os novos dados
      if (this.currentTemplate) {
        this.filledCard = fillTemplate(this.currentTemplate.template, this.extractedData);
      }
    },

    // Atualizar campo específico do cartão
    updateCardField(field, value) {
      this.filledCard[field] = value;
    },

    // Validar cartão antes da criação
    validateCard() {
      if (!this.currentTemplate) {
        return { valid: false, errors: ['Nenhum template selecionado'] };
      }

      const errors = [];
      const template = this.currentTemplate.template;

      // Verificar campos obrigatórios
      for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
        if (fieldConfig.required && (!this.filledCard[fieldKey] || this.filledCard[fieldKey].trim() === '')) {
          errors.push(`Campo obrigatório não preenchido: ${fieldKey}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    },

    // Preparar dados para envio ao JIRA
    prepareJiraPayload() {
      const validation = this.validateCard();
      if (!validation.valid) {
        throw new Error(`Cartão inválido: ${validation.errors.join(', ')}`);
      }

      // Estrutura básica do payload do JIRA
      const payload = {
        fields: {}
      };

      // Mapear campos do template para estrutura do JIRA
      for (const [fieldKey, value] of Object.entries(this.filledCard)) {
        if (fieldKey === 'project') {
          payload.fields.project = { key: value.key || value };
        } else if (fieldKey === 'issuetype') {
          payload.fields.issuetype = { name: value.name || value };
        } else if (fieldKey === 'parent') {
          if (value && value.key) {
            payload.fields.parent = { key: value.key };
          }
        } else if (fieldKey === 'priority') {
          payload.fields.priority = { name: value.name || value };
        } else if (fieldKey.startsWith('customfield_')) {
          payload.fields[fieldKey] = value;
        } else {
          payload.fields[fieldKey] = value;
        }
      }

      return payload;
    },

    // Resetar estado
    reset() {
      this.currentTemplate = null;
      this.extractedData = {};
      this.filledCard = {};
      this.lastCreatedCard = null;
    },

    // Atualizar configuração global
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
    },

    // Adicionar novo template
    addTemplate(templateId, template) {
      this.templates[templateId] = template;
    },

    // Remover template
    removeTemplate(templateId) {
      if (this.templates[templateId]) {
        delete this.templates[templateId];
        
        // Se o template removido estava selecionado, resetar
        if (this.currentTemplate && this.currentTemplate.templateId === templateId) {
          this.reset();
        }
      }
    },

    // Salvar cartão criado
    setLastCreatedCard(cardData) {
      this.lastCreatedCard = {
        ...cardData,
        createdAt: new Date().toISOString()
      };
    },

    // Processar entrada do usuário com resultado de IA
    async processUserInputWithAI(userInput, aiResult) {
      try {
        // Mapear tipo de IA para template
        const typeMapping = {
          'bug': 'bug_fix',
          'feature': 'feature_development', 
          'documentation': 'documentation',
          'technical': 'technical_task'
        };
        
        const templateType = typeMapping[aiResult.type] || 'feature_development';
        const template = this.templates[templateType];
        
        if (!template) {
          return { success: false, error: 'Template não encontrado' };
        }

        // Usar dados da IA ou extrair localmente
        const extractedData = {
          title: aiResult.title || this.extractTitle(userInput),
          description: aiResult.description || userInput,
          priority: aiResult.priority || 'medium'
        };

        // Preencher cartão com template
        const filledCard = fillTemplate(template, extractedData);
        
        return {
          success: true,
          template,
          extractedData,
          filledCard,
          confidence: aiResult.confidence || 0.7,
          source: 'ai'
        };
      } catch (error) {
        console.error('Erro ao processar com IA:', error);
        return { success: false, error: error.message };
      }
    }
  }
});

