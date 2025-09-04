<template>
  <div class="ai-provider-config">
    <q-card>
      <!-- Header -->
      <q-card-section class="bg-primary text-white">
        <div class="text-h6">
          <q-icon name="psychology" class="q-mr-sm" />
          Configuração do Provedor de IA
        </div>
        <div class="text-caption">
          Configure a conexão com seu provedor de IA compatível com OpenAI
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
                :color="isConnected ? 'green' : 'primary'"
                :icon="isConnecting ? 'sync' : 'wifi'"
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
        </div>
      </q-card-section>

      <!-- Formulário de Configuração -->
      <q-card-section>
        <q-form @submit.prevent="saveConfiguration" class="q-gutter-md">
          <!-- URL da API -->
          <q-input
            v-model="localConfig.apiUrl"
            label="URL da API"
            placeholder="https://api.openai.com/v1"
            outlined
            :rules="[val => !!val || 'URL é obrigatória', val => isValidUrl(val) || 'URL inválida']"
            hint="URL base da API compatível com OpenAI"
          >
            <template #prepend>
              <q-icon name="link" />
            </template>
          </q-input>

          <!-- Chave da API -->
          <q-input
            v-model="localConfig.apiKey"
            label="Chave da API"
            placeholder="sk-..."
            outlined
            :type="showApiKey ? 'text' : 'password'"
            :rules="[val => !!val || 'Chave da API é obrigatória', val => val.length >= 10 || 'Chave muito curta']"
            hint="Sua chave de API do provedor"
          >
            <template #prepend>
              <q-icon name="key" />
            </template>
            <template #append>
              <q-btn
                flat
                round
                :icon="showApiKey ? 'visibility_off' : 'visibility'"
                @click="showApiKey = !showApiKey"
              />
            </template>
          </q-input>

          <!-- Modelo -->
          <q-select
            v-model="localConfig.model"
            :options="availableModels"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            label="Modelo"
            outlined
            hint="Modelo de IA a ser utilizado"
          >
            <template #prepend>
              <q-icon name="smart_toy" />
            </template>
            
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
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
              <!-- Max Tokens -->
              <q-input
                v-model.number="localConfig.maxTokens"
                label="Máximo de Tokens"
                type="number"
                outlined
                :min="1"
                :max="4000"
                hint="Número máximo de tokens por resposta (1-4000)"
              >
                <template #prepend>
                  <q-icon name="format_list_numbered" />
                </template>
              </q-input>

              <!-- Temperature -->
              <q-slider
                v-model="localConfig.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                label
                label-always
                color="primary"
                class="q-mt-lg"
              />
              <div class="text-caption text-grey-7 q-mt-xs">
                Temperature: {{ localConfig.temperature }} (0 = mais determinístico, 2 = mais criativo)
              </div>

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
              color="primary"
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
                <div class="text-h4 text-green">{{ Math.round(successRate) }}%</div>
                <div class="text-caption">Taxa de Sucesso</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ usage.totalTokensUsed }}</div>
                <div class="text-caption">Tokens Utilizados</div>
              </q-card-section>
            </q-card>
          </div>
          
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat class="bg-purple-1">
              <q-card-section class="text-center">
                <div class="text-h4 text-purple">{{ usage.failedRequests }}</div>
                <div class="text-caption">Falhas</div>
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
          <div class="text-h6">Salvar Preset</div>
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
            color="primary"
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
import { useAIProviderStore } from '../stores/aiProviderStore.js';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const aiStore = useAIProviderStore();

// Estado local
const localConfig = ref({ ...aiStore.config });
const showApiKey = ref(false);
const showSavePresetDialog = ref(false);
const presetName = ref('');
const presetDescription = ref('');

// Computed
const isConnected = computed(() => aiStore.isConnected);
const isConnecting = computed(() => aiStore.isConnecting);
const connectionError = computed(() => aiStore.connectionError);
const lastConnectionTest = computed(() => aiStore.lastConnectionTest);
const savedConfigs = computed(() => aiStore.savedConfigs);
const currentConfigId = computed(() => aiStore.currentConfigId);
const usage = computed(() => aiStore.usage);
const successRate = computed(() => aiStore.successRate);
const availableModels = computed(() => aiStore.getAvailableModels());

const statusColor = computed(() => {
  switch (aiStore.connectionStatus) {
    case 'connected': return 'green';
    case 'connecting': return 'blue';
    case 'error': return 'red';
    default: return 'grey';
  }
});

const statusIcon = computed(() => {
  switch (aiStore.connectionStatus) {
    case 'connected': return 'wifi';
    case 'connecting': return 'sync';
    case 'error': return 'wifi_off';
    default: return 'wifi_off';
  }
});

const statusText = computed(() => {
  switch (aiStore.connectionStatus) {
    case 'connected': return 'Conectado';
    case 'connecting': return 'Conectando...';
    case 'error': return 'Erro de Conexão';
    default: return 'Desconectado';
  }
});

const isConfigValid = computed(() => {
  return localConfig.value.apiUrl && localConfig.value.apiKey;
});

const isFormValid = computed(() => {
  const validation = aiStore.validateConfig(localConfig.value);
  return validation.valid;
});

// Métodos
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const saveConfiguration = () => {
  const validation = aiStore.validateConfig(localConfig.value);
  
  if (!validation.valid) {
    $q.notify({
      type: 'negative',
      message: 'Configuração inválida: ' + validation.errors.join(', ')
    });
    return;
  }

  aiStore.updateConfig(localConfig.value);
  
  $q.notify({
    type: 'positive',
    message: 'Configuração salva com sucesso!'
  });
};

const testConnection = async () => {
  // Salvar configuração antes de testar
  aiStore.updateConfig(localConfig.value);
  
  try {
    const result = await aiStore.testConnection();
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
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000
  };
};

const savePreset = () => {
  if (!presetName.value) return;
  
  // Salvar configuração atual primeiro
  aiStore.updateConfig(localConfig.value);
  
  const preset = aiStore.saveConfig(presetName.value, presetDescription.value);
  
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
  if (aiStore.loadConfig(presetId)) {
    localConfig.value = { ...aiStore.config };
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
    if (aiStore.removeConfig(presetId)) {
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
    aiStore.resetUsageStats();
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
watch(() => aiStore.config, (newConfig) => {
  localConfig.value = { ...newConfig };
}, { deep: true });

// Lifecycle
onMounted(() => {
  // Sincronizar configuração local com o store
  localConfig.value = { ...aiStore.config };
});
</script>

<style scoped>
.ai-provider-config {
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

