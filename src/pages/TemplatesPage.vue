<template>
  <q-page class="templates-page">
    <div class="q-pa-md">
      <div class="text-h4 q-mb-md">Gerenciamento de Templates</div>
      
      <!-- Teste de Processamento de Entrada -->
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-h6">Teste de Identificação de Template</div>
          <div class="text-subtitle2 text-grey-7">
            Digite uma descrição de tarefa para testar a identificação automática de template
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="testInput"
            type="textarea"
            label="Descrição da tarefa"
            placeholder="Ex: Preciso corrigir um bug na tela de login que não está validando o email corretamente"
            rows="3"
            outlined
            class="q-mb-md"
          />
          
          <q-btn
            color="primary"
            label="Processar"
            icon="psychology"
            @click="processTestInput"
            :loading="isProcessing"
            :disable="!testInput.trim()"
          />
        </q-card-section>

        <!-- Resultado do Processamento -->
        <q-card-section v-if="processResult">
          <q-separator class="q-mb-md" />
          
          <div class="text-h6 q-mb-md">Resultado do Processamento</div>
          
          <div class="row q-gutter-md">
            <!-- Template Identificado -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle1">Template Identificado</div>
                  <div class="text-h6 text-primary">{{ processResult.template.name }}</div>
                  <div class="text-body2 text-grey-7">
                    Confiança: {{ Math.round(processResult.confidence * 100) }}%
                  </div>
                  
                  <div class="q-mt-md">
                    <q-chip
                      v-for="keyword in processResult.template.keywords"
                      :key="keyword"
                      size="sm"
                      color="primary"
                      text-color="white"
                      dense
                      class="q-mr-xs q-mb-xs"
                    >
                      {{ keyword }}
                    </q-chip>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Dados Extraídos -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle1">Dados Extraídos</div>
                  
                  <div v-for="(value, key) in processResult.extractedData" :key="key" class="q-mt-sm">
                    <div class="text-weight-medium">{{ key }}:</div>
                    <div class="text-body2 text-grey-8">{{ value }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Cartão Preenchido -->
          <div class="q-mt-md">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1 q-mb-md">Cartão JIRA Preenchido</div>
                
                <div class="row q-gutter-md">
                  <div 
                    v-for="(value, field) in processResult.filledCard" 
                    :key="field"
                    class="col-12 col-md-6"
                  >
                    <q-input
                      :model-value="value"
                      :label="field"
                      outlined
                      readonly
                      dense
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Payload JIRA -->
          <div class="q-mt-md">
            <q-expansion-item
              icon="code"
              label="Payload JIRA"
              header-class="text-primary"
            >
              <q-card>
                <q-card-section>
                  <pre class="jira-payload">{{ JSON.stringify(jiraPayload, null, 2) }}</pre>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </div>
        </q-card-section>
      </q-card>

      <!-- Gerenciador de Templates -->
      <CardTemplateManager />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCardTemplateStore } from '../stores/cardTemplateStore.js';
import CardTemplateManager from '../components/CardTemplateManager.vue';

const templateStore = useCardTemplateStore();

// Estado local
const testInput = ref('');
const processResult = ref(null);

// Computed
const isProcessing = computed(() => templateStore.isProcessing);
const jiraPayload = computed(() => {
  if (processResult.value) {
    try {
      return templateStore.prepareJiraPayload();
    } catch (error) {
      return { error: error.message };
    }
  }
  return null;
});

// Métodos
const processTestInput = async () => {
  if (!testInput.value.trim()) return;
  
  const result = await templateStore.processUserInput(testInput.value);
  
  if (result.success) {
    processResult.value = result;
  } else {
    console.error('Erro ao processar entrada:', result.error);
    // TODO: Mostrar notificação de erro
  }
};
</script>

<style scoped>
.templates-page {
  max-width: 1200px;
  margin: 0 auto;
}

.jira-payload {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
}
</style>

