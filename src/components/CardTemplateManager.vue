<template>
  <div class="card-template-manager">
    <q-card class="q-ma-md">
      <q-card-section>
        <div class="text-h6">Templates de Cartões JIRA</div>
        <div class="text-subtitle2 text-grey-7">
          Gerencie os templates disponíveis para criação de cartões
        </div>
      </q-card-section>

      <q-separator />

      <!-- Lista de Templates -->
      <q-card-section>
        <div class="row q-gutter-md">
          <div 
            v-for="template in availableTemplates" 
            :key="template.id"
            class="col-12 col-md-6 col-lg-4"
          >
            <q-card 
              class="template-card cursor-pointer"
              :class="{ 'selected': isSelected(template.id) }"
              @click="selectTemplate(template.id)"
              bordered
              flat
            >
              <q-card-section>
                <div class="text-h6">{{ template.name }}</div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  {{ template.description }}
                </div>
                
                <!-- Keywords -->
                <div class="q-mt-md">
                  <q-chip
                    v-for="keyword in template.keywords.slice(0, 3)"
                    :key="keyword"
                    size="sm"
                    color="primary"
                    text-color="white"
                    dense
                  >
                    {{ keyword }}
                  </q-chip>
                  <q-chip
                    v-if="template.keywords.length > 3"
                    size="sm"
                    color="grey-5"
                    dense
                  >
                    +{{ template.keywords.length - 3 }}
                  </q-chip>
                </div>
              </q-card-section>

              <!-- Ações do Template -->
              <q-card-actions align="right">
                <q-btn
                  flat
                  dense
                  icon="visibility"
                  color="primary"
                  @click.stop="viewTemplate(template.id)"
                >
                  <q-tooltip>Visualizar Template</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  icon="edit"
                  color="orange"
                  @click.stop="editTemplate(template.id)"
                >
                  <q-tooltip>Editar Template</q-tooltip>
                </q-btn>
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <!-- Botão para adicionar novo template -->
      <q-card-actions align="center">
        <q-btn
          color="primary"
          icon="add"
          label="Novo Template"
          @click="createNewTemplate"
        />
      </q-card-actions>
    </q-card>

    <!-- Template Selecionado -->
    <q-card v-if="currentTemplate" class="q-ma-md">
      <q-card-section>
        <div class="text-h6">Template Selecionado</div>
        <div class="text-subtitle1">{{ currentTemplate.template.name }}</div>
        <div class="text-body2 text-grey-7">
          Confiança: {{ Math.round(currentTemplate.confidence * 100) }}%
        </div>
      </q-card-section>

      <q-separator />

      <!-- Campos do Template -->
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">Campos do Template</div>
        
        <div class="row q-gutter-md">
          <div 
            v-for="(field, fieldKey) in currentTemplate.template.fields"
            :key="fieldKey"
            class="col-12 col-md-6"
          >
            <q-card flat bordered>
              <q-card-section class="q-pa-sm">
                <div class="text-weight-medium">
                  {{ fieldKey }}
                  <q-chip 
                    v-if="field.required" 
                    size="xs" 
                    color="red" 
                    text-color="white"
                    dense
                  >
                    Obrigatório
                  </q-chip>
                </div>
                
                <div class="text-body2 text-grey-7 q-mt-xs">
                  <div v-if="field.template">
                    <strong>Template:</strong> {{ field.template }}
                  </div>
                  <div v-if="field.placeholder">
                    <strong>Placeholder:</strong> {{ field.placeholder }}
                  </div>
                  <div v-if="field.name">
                    <strong>Valor:</strong> {{ field.name }}
                  </div>
                  <div v-if="field.key">
                    <strong>Chave:</strong> {{ field.key }}
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Dialog para visualizar template -->
    <q-dialog v-model="showTemplateDialog">
      <q-card style="min-width: 600px">
        <q-card-section>
          <div class="text-h6">{{ selectedTemplateForView?.name }}</div>
        </q-card-section>

        <q-card-section>
          <pre class="template-json">{{ JSON.stringify(selectedTemplateForView, null, 2) }}</pre>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Fechar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useCardTemplateStore } from '../stores/cardTemplateStore.js';

const templateStore = useCardTemplateStore();

// Estado local
const showTemplateDialog = ref(false);
const selectedTemplateForView = ref(null);

// Computed
const availableTemplates = computed(() => templateStore.availableTemplates);
const currentTemplate = computed(() => templateStore.currentTemplate);

// Métodos
const selectTemplate = (templateId) => {
  templateStore.selectTemplate(templateId);
};

const isSelected = (templateId) => {
  return currentTemplate.value && currentTemplate.value.templateId === templateId;
};

const viewTemplate = (templateId) => {
  selectedTemplateForView.value = templateStore.templateById(templateId);
  showTemplateDialog.value = true;
};

const editTemplate = (templateId) => {
  // TODO: Implementar edição de template
  console.log('Editar template:', templateId);
};

const createNewTemplate = () => {
  // TODO: Implementar criação de novo template
  console.log('Criar novo template');
};
</script>

<style scoped>
.template-card {
  transition: all 0.3s ease;
  min-height: 200px;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.template-card.selected {
  border-color: var(--q-primary);
  background-color: rgba(25, 118, 210, 0.05);
}

.template-json {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
</style>

