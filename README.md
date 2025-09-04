# JIRA Task Manager

Um Progressive Web App (PWA) desenvolvido com Vue.js e Quasar para gerenciar tarefas do JIRA através de linguagem natural e IA.

## 🚀 Funcionalidades

### 🤖 Chat Inteligente com IA
- **Linguagem Natural**: Crie cartões JIRA conversando naturalmente
- **IA Configurável**: Suporte a qualquer provedor compatível com OpenAI
- **Análise Local**: Fallback inteligente quando IA não disponível
- **Templates Automáticos**: Identificação automática do tipo de cartão

### 📋 Sistema de Templates
- **Templates Pré-definidos**: Bug, Feature, Documentação, Tarefa Técnica
- **Campos Customizados**: Configuração flexível por tipo de cartão
- **Preenchimento Automático**: Extração inteligente de dados
- **Gerenciamento Visual**: Interface para visualizar e testar templates

### 🔗 Integração JIRA Completa
- **API Oficial**: Integração direta com API REST do JIRA
- **Autenticação Segura**: Basic Auth com API Token
- **Criação de Cartões**: Criação real de issues no JIRA
- **Validação**: Teste de conexão e validação de credenciais

### ⚙️ Configurações Avançadas
- **Provedor de IA**: URL customizável, chave de API, modelos
- **JIRA**: Instância, credenciais, projeto padrão
- **Presets**: Salvar e carregar configurações
- **Estatísticas**: Tracking de uso e performance

### 📱 PWA Completo
- **Instalação Nativa**: Funciona como app nativo
- **Offline**: Service Worker com cache inteligente
- **Responsivo**: Interface adaptável para mobile e desktop
- **Performance**: Build otimizado e compressão

## 🛠️ Tecnologias

- **Frontend**: Vue.js 3 + Quasar Framework
- **Estado**: Pinia (Vuex successor)
- **Build**: Vite
- **PWA**: Workbox
- **HTTP**: Axios
- **Estilo**: SCSS + Material Design

## 📦 Instalação

### Pré-requisitos
- Node.js 20+
- npm ou yarn

### Desenvolvimento
```bash
# Instalar dependências
npm install
# ou
yarn

# Executar em modo desenvolvimento
npm run dev
# ou
quasar dev
```

### Build PWA
```bash
# Build para produção PWA
quasar build -m pwa

# Servir build PWA
quasar serve dist/pwa --port 8080
```

## ⚙️ Configuração

### 1. Provedor de IA
1. Acesse **Configurações → Provedor de IA**
2. Configure:
   - **URL da API**: Ex: `https://api.openai.com/v1`
   - **Chave da API**: Sua chave do provedor
   - **Modelo**: Ex: `gpt-3.5-turbo`
3. Teste a conexão

### 2. JIRA
1. Acesse **Configurações → JIRA**
2. Configure:
   - **URL da Instância**: Ex: `https://sua-empresa.atlassian.net`
   - **Email**: Seu email de login no JIRA
   - **API Token**: [Gere aqui](https://id.atlassian.com/manage-profile/security/api-tokens)
   - **Projeto Padrão**: Chave do projeto (opcional)
3. Teste a conexão

## 🎯 Como Usar

### Criando Cartões via Chat
1. Acesse **Chat IA**
2. Digite naturalmente, ex:
   - "Preciso corrigir um bug no login"
   - "Criar funcionalidade de relatórios"
   - "Documentar a nova API"
3. Confirme os dados extraídos
4. O cartão será criado no JIRA

### Gerenciando Templates
1. Acesse **Templates**
2. Visualize templates disponíveis
3. Teste identificação com descrições
4. Veja o payload JIRA gerado

## 🏗️ Arquitetura

### Stores (Pinia)
- **chatStore**: Gerencia conversas e criação de cartões
- **cardTemplateStore**: Templates e processamento
- **aiProviderStore**: Configuração e análise de IA
- **jiraStore**: Integração com API do JIRA

### Componentes Principais
- **ChatInterface**: Interface de chat com IA
- **CardTemplateManager**: Gerenciamento de templates
- **AIProviderConfig**: Configuração de IA
- **JIRAConfig**: Configuração do JIRA

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev
quasar dev

# Build produção
npm run build
quasar build

# Build PWA
quasar build -m pwa

# Servir build
quasar serve dist/pwa
```

## 🐛 Problemas Conhecidos

### Chat não processa mensagens
**Status**: Identificado, correção pendente  
**Causa**: Possível issue no método `processUserInputWithAI`  
**Workaround**: Funcionalidade de templates funciona normalmente

## 📄 Configuração Quasar

Veja [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js) para customizações.

---

**Desenvolvido com ❤️ usando Vue.js + Quasar Framework**
