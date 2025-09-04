<template>
  <div class="jira-config">
    <q-card>
      <!-- Header -->
      <q-card-section class="bg-blue text-white">
        <div class="text-h6">
          <q-icon name="bug_report" class="q-mr-sm" />
          Configuração do JIRA
        </div>
        <div class="text-caption">
          Configure a conexão com sua instância do JIRA
        </div>
      </q-card-section>

      <!-- Status da Conexão -->
      <q-card-section>
        <div class="connection-status q-mb-md">
          <div class="row items-center q-gutter-md">
            <div class="col-auto">
              <q-chip
                :color="statusColor"
                text-color="white"
                :icon="statusIcon"
              >
                {{ statusText }}
              </q-chip>
            </div>
            
            <div class="col" v-if="lastConnectionTest">
              <div class="text-caption text-grey-7">
                Último teste: {{ formatDate(lastConnectionTest) }}
              </div>
            </div>
            
            <div class="col-auto">
              <q-btn
                :color="isConnected ? 'green' : 'blue'"
                :icon="isConnecting ? 'sync' : 'link'"
                :loading="isConnecting"
                @click="testConnection"
                :disable="!isConfigValid"
                size="sm"
              >
                {{ isConnecting ? 'Testando...' : 'Testar Conexão' }}
              </q-btn>
            </div>
          </div>
          
          <!-- Erro de conexão -->
          <div v-if="connectionError" class="q-mt-sm">
            <q-banner class="bg-red-1 text-red-8">
              <template #avatar>
                <q-icon name="error" color="red" />
              </template>
              {{ connectionError }}
            </q-banner>
          </div>

          <!-- Loading message -->
          <div v-if="isLoading" class="q-mt-sm">
            <q-banner class="bg-blue-1 text-blue-8">
              <template #avatar>
                <q-spinner color="blue" />
              </template>
              {{ loadingMessage }}
            </q-banner>
          </div>
        </div>
      </q-card-section>

      <!-- Formulário de Configuração -->
      <q-card-section>
        <q-form @submit.prevent="saveConfiguration" class="q-gutter-md">
          <!-- URL da Instância -->
          <q-input
            v-model="localConfig.baseUrl"
            label="URL da Instância JIRA"
            placeholder="https://sua-empresa.atlassian.net"
            outlined
            :rules="[val => !!val || 'URL é obrigatória', val => isValidJiraUrl(val) || 'URL inválida']"
            hint="URL completa da sua instância JIRA"
          >
            <template #prepend>
              <q-icon name="link" />
            </template>
          </q-input>

          <!-- Email -->
          <q-input
            v-model="localConfig.email"
            label="Email"
            placeholder="seu-email@empresa.com"
            outlined
            type="email"
            :rules="[val => !!val || 'Email é obrigatório', val => isValidEmail(val) || 'Email inválido']"
            hint="Seu email de login no JIRA"
          >
            <template #prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <!-- API Token -->
          <q-input
            v-model="localConfig.apiToken"
            label="API Token"
            placeholder="Seu API Token do JIRA"
            outlined
            :type="showApiToken ? 'text' : 'password'"
            :rules="[val => !!val || 'API Token é obrigatório', val => val.length >= 10 || 'Token muito curto']"
            hint="Gere um API Token em: Configurações > Segurança > API Tokens"
          >
            <template #prepend>
              <q-icon name="vpn_key" />
            </template>
            <template #append>
              <q-btn
                flat
                round
                :icon="showApiToken ? 'visibility_off' : 'visibility'"
                @click="showApiToken = !showApiToken"
              />
            </template>
          </q-input>

          <!-- Projeto Padrão -->
          <q-select
            v-model="localConfig.defaultProject"
            :options="availableProjects"
            option-value="value"
            option-label="label"
            emit-value
            map-options
            label="Projeto Padrão (Opcional)"
            outlined
            clearable
            hint="Projeto usado por padrão ao criar cartões"
            :loading="isLoading"
            :disable="!isConnected"
          >
            <template #prepend>
              <q-icon name="folder" />
            </template>
            
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>

            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ isConnected ? 'Nenhum projeto encontrado' : 'Conecte-se primeiro para carregar projetos' }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Configurações Avançadas -->
          <q-expansion-item
            icon="tune"
            label="Configurações Avançadas"
            class="q-mt-md"
          >
            <div class="q-pa-md q-gutter-md">
              <!-- Timeout -->
              <q-input
                v-model.number="localConfig.timeout"
                label="Timeout (ms)"
                type="number"
                outlined
                :min="5000"
                :max="60000"
                hint="Tempo limite para requisições (5000-60000ms)"
              >
                <template #prepend>
                  <q-icon name="timer" />
                </template>
              </q-input>
            </div>
          </q-expansion-item>

          <!-- Botões de Ação -->
          <div class="row q-gutter-sm q-mt-lg">
            <q-btn
              type="submit"
              color="blue"
              icon="save"
              label="Salvar Configuração"
              :disable="!isFormValid"
            />
            
            <q-btn
              color="secondary"
              icon="restore"
              label="Restaurar Padrões"
              flat
              @click="restoreDefaults"
            />
            
            <q-space />
            
            <q-btn
              color="green"
              icon="bookmark"
              label="Salvar Preset"
              flat
              @click="showSavePresetDialog = true"
              :disable="!isFormValid"
            />
          </div>
        </q-form>
      </q-card-section>

      <!-- Informações da Conexão -->
      <q-card-section v-if="isConnected && currentUser">
        <q-separator class="q-mb-md" />
        
        <div class="text-h6 q-mb-md">
          <q-icon name="person" class="q-mr-sm" />
          Informações da Conexão
        </div>
        
        <div class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="text-weight-medium">Usuário Conectado</div>
                <div class="text-body2">{{ currentUser.displayName }}</div>
                <div class="text-caption text-grey-7">{{ currentUser.emailAddress }}</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-md-6">
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="text-weight-medium">Projetos Disponíveis</div>
                <div class="text-h4 text-blue">{{ projects.length }}</div>
                <div class="text-caption text-grey-7">projetos acessíveis</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <!-- Presets Salvos -->
      <q-card-section v-if="savedConfigs.length > 0">
        <q-separator class="q-mb-md" />
        
        <div class="text-h6 q-mb-md">
          <q-icon name="bookmark" class="q-mr-sm" />
          Presets Salvos
        </div>
        
        <div class="row q-gutter-sm">
          <q-card
            v-for="preset in savedConfigs"
            :key="preset.id"
            flat
            bordered
            class="preset-card cursor-pointer"
            :class="{ 'bg-blue-1': currentConfigId === preset.id }"
            @click="loadPreset(preset.id)"
          >
            <q-card-section class="q-pa-sm">
              <div class="text-weight-medium">{{ preset.name }}</div>
              <div class="text-caption text-grey-7">{{ preset.description }}</div>
              <div class="text-caption text-grey-6">
                {{ formatDate(preset.createdAt) }}
              </div>
            </q-card-section>
            
            <q-card-actions align="right" class="q-pa-xs">
              <q-btn
                flat
                round
                size="sm"
                icon="delete"
                color="red"
                @click.stop="removePreset(preset.id)"
              >
                <q-tooltip>Remover preset</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </div>
      </q-card-section>

      <!-- Estatísticas de Uso -->
      <q-card-section v-if="usage.totalRequests > 0">
        <q-separator class="q-mb-md" />
        
        <div class="text-h6 q-mb-md">
          <q-icon name="analytics" class="q-mr-sm" />
          Estatísticas de Uso
        </div>
        
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-blue">{{ usage.totalRequests }}</div>
                <div class="text-caption">Total de Requisições</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-green">{{ usage.cardsCreated }}</div>
                <div class="text-caption">Cartões Criados</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ Math.round(successRate) }}%</div>
                <div class="text-caption">Taxa de Sucesso</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-purple-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-purple">{{ usage.timeLogged }}m</div>
                <div class="text-caption">Tempo Registrado</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        
        <div class="q-mt-md">
          <q-btn
            flat
            color="red"
            icon="refresh"
            label="Resetar Estatísticas"
            @click="resetStats"
            size="sm"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Dialog para Salvar Preset -->
    <q-dialog v-model="showSavePresetDialog">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Salvar Preset JIRA</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="savePreset" class="q-gutter-md">
            <q-input
              v-model="presetName"
              label="Nome do Preset"
              outlined
              :rules="[val => !!val || 'Nome é obrigatório']"
              autofocus
            />
            
            <q-input
              v-model="presetDescription"
              label="Descrição (opcional)"
              outlined
              type="textarea"
              rows="2"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="blue"
            label="Salvar"
            @click="savePreset"
            :disable="!presetName"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useJiraStore } from '../stores/jiraStore.js';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const jiraStore = useJiraStore();

// Estado local
const localConfig = ref({ ...jiraStore.config });
const showApiToken = ref(false);
const showSavePresetDialog = ref(false);
const presetName = ref('');
const presetDescription = ref('');
const currentUser = ref(null);

// Computed
const isConnected = computed(() => jiraStore.isConnected);
const isConnecting = computed(() => jiraStore.isConnecting);
const isLoading = computed(() => jiraStore.isLoading);
const loadingMessage = computed(() => jiraStore.loadingMessage);
const connectionError = computed(() => jiraStore.connectionError);
const lastConnectionTest = computed(() => jiraStore.lastConnectionTest);
const savedConfigs = computed(() => jiraStore.savedConfigs);
const currentConfigId = computed(() => jiraStore.currentConfigId);
const usage = computed(() => jiraStore.usage);
const successRate = computed(() => jiraStore.successRate);
const projects = computed(() => jiraStore.projects);
const availableProjects = computed(() => jiraStore.availableProjects);

const statusColor = computed(() => {
  switch (jiraStore.connectionStatus) {
    case 'connected': return 'green';
    case 'connecting': return 'blue';
    case 'error': return 'red';
    default: return 'grey';
  }
});

const statusIcon = computed(() => {
  switch (jiraStore.connectionStatus) {
    case 'connected': return 'check_circle';
    case 'connecting': return 'sync';
    case 'error': return 'error';
    default: return 'radio_button_unchecked';
  }
});

const statusText = computed(() => {
  switch (jiraStore.connectionStatus) {
    case 'connected': return 'Conectado';
    case 'connecting': return 'Conectando...';
    case 'error': return 'Erro de Conexão';
    default: return 'Desconectado';
  }
});

const isConfigValid = computed(() => {
  return localConfig.value.baseUrl && localConfig.value.email && localConfig.value.apiToken;
});

const isFormValid = computed(() => {
  const validation = jiraStore.validateConfig(localConfig.value);
  return validation.valid;
});

// Métodos
const isValidJiraUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('atlassian.net') || urlObj.hostname.includes('jira');
  } catch {
    return false;
  }
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const saveConfiguration = () => {
  const validation = jiraStore.validateConfig(localConfig.value);
  
  if (!validation.valid) {
    $q.notify({
      type: 'negative',
      message: 'Configuração inválida: ' + validation.errors.join(', ')
    });
    return;
  }

  jiraStore.updateConfig(localConfig.value);
  
  $q.notify({
    type: 'positive',
    message: 'Configuração salva com sucesso!'
  });
};

const testConnection = async () => {
  // Salvar configuração antes de testar
  jiraStore.updateConfig(localConfig.value);
  
  try {
    const result = await jiraStore.testConnection();
    currentUser.value = result.user;
    
    $q.notify({
      type: 'positive',
      message: result.message
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Erro na conexão: ' + error.message
    });
  }
};

const restoreDefaults = () => {
  localConfig.value = {
    baseUrl: '',
    email: '',
    apiToken: '',
    defaultProject: '',
    timeout: 30000
  };
};

const savePreset = () => {
  if (!presetName.value) return;
  
  // Salvar configuração atual primeiro
  jiraStore.updateConfig(localConfig.value);
  
  const preset = jiraStore.saveConfig(presetName.value, presetDescription.value);
  
  $q.notify({
    type: 'positive',
    message: `Preset "${preset.name}" salvo com sucesso!`
  });
  
  // Limpar dialog
  presetName.value = '';
  presetDescription.value = '';
  showSavePresetDialog.value = false;
};

const loadPreset = (presetId) => {
  if (jiraStore.loadConfig(presetId)) {
    localConfig.value = { ...jiraStore.config };
    currentUser.value = null;
    
    $q.notify({
      type: 'positive',
      message: 'Preset carregado com sucesso!'
    });
  }
};

const removePreset = (presetId) => {
  $q.dialog({
    title: 'Confirmar Remoção',
    message: 'Tem certeza que deseja remover este preset?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    if (jiraStore.removeConfig(presetId)) {
      $q.notify({
        type: 'positive',
        message: 'Preset removido com sucesso!'
      });
    }
  });
};

const resetStats = () => {
  $q.dialog({
    title: 'Confirmar Reset',
    message: 'Tem certeza que deseja resetar todas as estatísticas?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    jiraStore.resetUsageStats();
    $q.notify({
      type: 'positive',
      message: 'Estatísticas resetadas!'
    });
  });
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('pt-BR');
};

// Watchers
watch(() => jiraStore.config, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

// Lifecycle
onMounted(() => {
  // Sincronizar configuração local com o store
  localConfig.value = { ...jiraStore.config };
});
</script>

<style scoped>
.jira-config {
  max-width: 800px;
  margin: 0 auto;
}

.connection-status {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.preset-card {
  min-width: 200px;
  transition: all 0.3s ease;
}

.preset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Responsividade */
@media (max-width: 600px) {
  .preset-card {
    min-width: 100%;
  }
}
</style>

