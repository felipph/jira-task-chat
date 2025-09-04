<template>
  <q-page class="config-page">
    <div class="q-pa-md">
      <div class="text-h4 q-mb-md">Configurações</div>
      <div class="text-subtitle1 text-grey-7 q-mb-lg">
        Configure os provedores e integrações do JIRA Task Manager
      </div>
      
      <!-- Tabs de Configuração -->
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="ai" icon="psychology" label="Provedor de IA" />
        <q-tab name="jira" icon="bug_report" label="JIRA" />
        <q-tab name="general" icon="settings" label="Geral" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Configuração do Provedor de IA -->
        <q-tab-panel name="ai">
          <div class="text-h6 q-mb-md">
            <q-icon name="psychology" class="q-mr-sm" />
            Configuração do Provedor de IA
          </div>
          <div class="text-body2 text-grey-7 q-mb-lg">
            Configure a conexão com seu provedor de IA para análise inteligente de tarefas
          </div>
          
          <AIProviderConfig />
        </q-tab-panel>

        <!-- Configuração do JIRA -->
        <q-tab-panel name="jira">
          <div class="text-h6 q-mb-md">
            <q-icon name="bug_report" class="q-mr-sm" />
            Configuração do JIRA
          </div>
          <div class="text-body2 text-grey-7 q-mb-lg">
            Configure a conexão com sua instância do JIRA
          </div>
          
          <JIRAConfig />
        </q-tab-panel>

        <!-- Configurações Gerais -->
        <q-tab-panel name="general">
          <div class="text-h6 q-mb-md">
            <q-icon name="settings" class="q-mr-sm" />
            Configurações Gerais
          </div>
          <div class="text-body2 text-grey-7 q-mb-lg">
            Configurações gerais da aplicação
          </div>
          
          <GeneralConfig />
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue';
import AIProviderConfig from '../components/AIProviderConfig.vue';
import JIRAConfig from '../components/JIRAConfig.vue';

// Componente placeholder para configurações gerais
const GeneralConfig = {
  template: `
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Configurações Gerais</div>
        
        <q-form class="q-gutter-md">
          <!-- Tema -->
          <q-select
            v-model="theme"
            :options="themeOptions"
            label="Tema"
            outlined
            emit-value
            map-options
          >
            <template #prepend>
              <q-icon name="palette" />
            </template>
          </q-select>
          
          <!-- Idioma -->
          <q-select
            v-model="language"
            :options="languageOptions"
            label="Idioma"
            outlined
            emit-value
            map-options
          >
            <template #prepend>
              <q-icon name="language" />
            </template>
          </q-select>
          
          <!-- Notificações -->
          <q-toggle
            v-model="notifications"
            label="Habilitar notificações"
            color="primary"
          />
          
          <!-- Auto-save -->
          <q-toggle
            v-model="autoSave"
            label="Salvamento automático"
            color="primary"
          />
          
          <!-- Timeout de sessão -->
          <q-input
            v-model.number="sessionTimeout"
            label="Timeout de sessão (minutos)"
            type="number"
            outlined
            :min="5"
            :max="480"
          >
            <template #prepend>
              <q-icon name="timer" />
            </template>
          </q-input>
          
          <div class="q-mt-lg">
            <q-btn color="primary" label="Salvar Configurações" />
            <q-btn flat label="Restaurar Padrões" class="q-ml-sm" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  `,
  setup() {
    const theme = ref('auto');
    const language = ref('pt-BR');
    const notifications = ref(true);
    const autoSave = ref(true);
    const sessionTimeout = ref(60);
    
    const themeOptions = [
      { label: 'Automático', value: 'auto' },
      { label: 'Claro', value: 'light' },
      { label: 'Escuro', value: 'dark' }
    ];
    
    const languageOptions = [
      { label: 'Português (Brasil)', value: 'pt-BR' },
      { label: 'English', value: 'en-US' },
      { label: 'Español', value: 'es-ES' }
    ];
    
    return {
      theme,
      language,
      notifications,
      autoSave,
      sessionTimeout,
      themeOptions,
      languageOptions
    };
  }
};

// Estado local
const activeTab = ref('ai');
</script>

<style scoped>
.config-page {
  max-width: 1000px;
  margin: 0 auto;
}
</style>

