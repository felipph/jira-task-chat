// Templates de cartões JIRA
export const cardTemplates = {
  'feature_development': {
    name: 'Desenvolvimento de Funcionalidade',
    description: 'Template para criação de cartões de desenvolvimento de novas funcionalidades',
    keywords: ['desenvolvimento', 'funcionalidade', 'feature', 'implementar', 'criar', 'desenvolver'],
    fields: {
      project: {
        key: 'PROJ', // Será configurável
        required: true
      },
      issuetype: {
        name: 'Tarefa',
        required: true
      },
      summary: {
        template: '[FEATURE] {title}',
        required: true,
        placeholder: 'Nome da funcionalidade'
      },
      description: {
        template: `## Descrição
{description}

## Critérios de Aceitação
{acceptance_criteria}

## Observações
{notes}`,
        required: true,
        placeholder: 'Descrição detalhada da funcionalidade'
      },
      parent: {
        key: '', // Épico - será configurável
        required: false
      },
      priority: {
        name: 'Medium',
        required: false
      },
      // Campos customizados (exemplo)
      customfield_10001: {
        name: 'Story Points',
        value: null,
        required: false
      },
      customfield_10002: {
        name: 'Sprint',
        value: null,
        required: false
      }
    }
  },
  
  'bug_fix': {
    name: 'Correção de Bug',
    description: 'Template para criação de cartões de correção de bugs',
    keywords: ['bug', 'erro', 'correção', 'corrigir', 'problema', 'falha'],
    fields: {
      project: {
        key: 'PROJ',
        required: true
      },
      issuetype: {
        name: 'Bug',
        required: true
      },
      summary: {
        template: '[BUG] {title}',
        required: true,
        placeholder: 'Descrição do bug'
      },
      description: {
        template: `## Descrição do Problema
{description}

## Passos para Reproduzir
{steps_to_reproduce}

## Comportamento Esperado
{expected_behavior}

## Comportamento Atual
{actual_behavior}

## Ambiente
{environment}`,
        required: true,
        placeholder: 'Descrição detalhada do bug'
      },
      priority: {
        name: 'High',
        required: false
      },
      customfield_10003: {
        name: 'Severity',
        value: 'Medium',
        required: false
      }
    }
  },
  
  'technical': {
    name: 'Tarefa Técnica',
    description: 'Template para criação de cartões de tarefas técnicas',
    keywords: ['técnica', 'refatoração', 'melhoria', 'otimização', 'configuração', 'setup'],
    fields: {
      project: {
        key: 'PROJ',
        required: true
      },
      issuetype: {
        name: 'Tarefa',
        required: true
      },
      summary: {
        template: '[TECH] {title}',
        required: true,
        placeholder: 'Nome da tarefa técnica'
      },
      description: {
        template: `## Objetivo
{objective}

## Descrição Técnica
{technical_description}

## Impacto
{impact}

## Recursos Necessários
{resources}`,
        required: true,
        placeholder: 'Descrição da tarefa técnica'
      },
      priority: {
        name: 'Medium',
        required: false
      }
    }
  },
  
  'documentation': {
    name: 'Documentação',
    description: 'Template para criação de cartões de documentação',
    keywords: ['documentação', 'documentar', 'manual', 'guia', 'readme'],
    fields: {
      project: {
        key: 'PROJ',
        required: true
      },
      issuetype: {
        name: 'Tarefa',
        required: true
      },
      summary: {
        template: '[DOC] {title}',
        required: true,
        placeholder: 'Título da documentação'
      },
      description: {
        template: `## Escopo da Documentação
{scope}

## Público-Alvo
{target_audience}

## Conteúdo a ser Documentado
{content}

## Formato
{format}`,
        required: true,
        placeholder: 'Descrição da documentação'
      },
      priority: {
        name: 'Low',
        required: false
      }
    }
  }
};

// Configurações globais
export const globalConfig = {
  defaultProject: 'PROJ',
  defaultEpic: '',
  jiraUrl: '',
  customFields: {
    storyPoints: 'customfield_10001',
    sprint: 'customfield_10002',
    severity: 'customfield_10003'
  }
};

// Função para identificar o template baseado na entrada do usuário
export function identifyTemplate(userInput) {
  const input = userInput.toLowerCase();
  
  for (const [templateId, template] of Object.entries(cardTemplates)) {
    for (const keyword of template.keywords) {
      if (input.includes(keyword)) {
        return {
          templateId,
          template,
          confidence: calculateConfidence(input, template.keywords)
        };
      }
    }
  }
  
  // Template padrão se nenhum for identificado
  return {
    templateId: 'desenvolvimento-funcionalidade',
    template: cardTemplates['desenvolvimento-funcionalidade'],
    confidence: 0.1
  };
}

// Função para calcular a confiança da identificação
function calculateConfidence(input, keywords) {
  let matches = 0;
  for (const keyword of keywords) {
    if (input.includes(keyword)) {
      matches++;
    }
  }
  return matches / keywords.length;
}

// Função para extrair informações da entrada do usuário
export function extractFieldsFromInput(userInput, template) {
  const extracted = {};
  
  // Extração básica do título (primeira frase ou até 50 caracteres)
  const sentences = userInput.split(/[.!?]/);
  extracted.title = sentences[0].trim().substring(0, 50);
  
  // Extração da descrição (resto do texto)
  if (sentences.length > 1) {
    extracted.description = sentences.slice(1).join('. ').trim();
  } else {
    extracted.description = userInput;
  }
  
  // Aqui poderia ser implementada lógica mais sofisticada de NLP
  // para extrair critérios de aceitação, prioridade, etc.
  
  return extracted;
}

// Função para preencher o template com os dados extraídos
export function fillTemplate(template, extractedData) {
  const filledFields = {};
  
  for (const [fieldKey, fieldConfig] of Object.entries(template.fields)) {
    if (fieldConfig.template) {
      // Substituir placeholders no template
      let filledValue = fieldConfig.template;
      for (const [key, value] of Object.entries(extractedData)) {
        filledValue = filledValue.replace(`{${key}}`, value || '');
      }
      filledFields[fieldKey] = filledValue;
    } else {
      filledFields[fieldKey] = fieldConfig.value || fieldConfig.name || fieldConfig.key;
    }
  }
  
  return filledFields;
}

