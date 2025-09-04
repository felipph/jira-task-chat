<template>
  <q-page class="chat-page">
    <div class="q-pa-md">
      <div class="text-h4 q-mb-md">Chat com Assistente IA</div>
      <div class="text-subtitle1 text-grey-7 q-mb-lg">
        Crie cartões JIRA de forma natural através de conversas com nosso assistente inteligente
      </div>
      
      <!-- Interface de Chat -->
      <div class="chat-container">
        <ChatInterface />
      </div>

      <!-- Informações e Dicas -->
      <div class="row q-gutter-md q-mt-lg">
        <!-- Dicas de Uso -->
        <div class="col-12 col-md-12">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="lightbulb" color="orange" class="q-mr-sm" />
                Dicas de Uso
              </div>
              
              <q-list dense>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="chat" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Seja específico</q-item-label>
                    <q-item-label caption>
                      Descreva claramente o que você quer fazer
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="psychology" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Use linguagem natural</q-item-label>
                    <q-item-label caption>
                      Fale como você falaria com um colega
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section avatar>
                    <q-icon name="category" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Mencione o tipo</q-item-label>
                    <q-item-label caption>
                      Use palavras como "bug", "funcionalidade", "documentação"
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- Exemplos -->
        <div class="col-md-12">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="forum" color="green" class="q-mr-sm" />
                Exemplos de Comandos
              </div>
              
              <div class="examples-list">
                <div 
                  v-for="example in examples" 
                  :key="example.text"
                  class="example-item q-mb-md"
                >
                  <q-chip
                    :color="example.color"
                    text-color="white"
                    size="sm"
                    class="q-mb-xs"
                  >
                    {{ example.type }}
                  </q-chip>
                  <div class="text-body2">
                    "{{ example.text }}"
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Estatísticas do Chat -->
      <div class="row q-gutter-md q-mt-lg">
        <div class="col-12">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-md">
                <q-icon name="analytics" color="blue" class="q-mr-sm" />
                Estatísticas da Sessão
              </div>
              
              <div class="row q-gutter-md">
                <div class="col-auto">
                  <q-circular-progress
                    :value="messageCount"
                    :max="50"
                    size="80px"
                    :thickness="0.15"
                    color="primary"
                    track-color="grey-3"
                    class="q-ma-md"
                  >
                    <div class="text-h6">{{ messageCount }}</div>
                    <div class="text-caption">mensagens</div>
                  </q-circular-progress>
                </div>
                
                <div class="col">
                  <div class="row q-gutter-md">
                    <div class="col-12 col-sm-6 col-md-3">
                      <q-card flat class="bg-blue-1">
                        <q-card-section class="text-center">
                          <div class="text-h4 text-blue">{{ userMessageCount }}</div>
                          <div class="text-caption">Suas mensagens</div>
                        </q-card-section>
                      </q-card>
                    </div>
                    
                    <div class="col-12 col-sm-6 col-md-3">
                      <q-card flat class="bg-green-1">
                        <q-card-section class="text-center">
                          <div class="text-h4 text-green">{{ assistantMessageCount }}</div>
                          <div class="text-caption">Respostas da IA</div>
                        </q-card-section>
                      </q-card>
                    </div>
                    
                    <div class="col-12 col-sm-6 col-md-3">
                      <q-card flat class="bg-orange-1">
                        <q-card-section class="text-center">
                          <div class="text-h4 text-orange">{{ cardsCreated }}</div>
                          <div class="text-caption">Cartões criados</div>
                        </q-card-section>
                      </q-card>
                    </div>
                    
                    <div class="col-12 col-sm-6 col-md-3">
                      <q-card flat class="bg-purple-1">
                        <q-card-section class="text-center">
                          <div class="text-h4 text-purple">{{ sessionDuration }}</div>
                          <div class="text-caption">Tempo de sessão</div>
                        </q-card-section>
                      </q-card>
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '../stores/chatStore.js';
import ChatInterface from '../components/ChatInterface.vue';

const chatStore = useChatStore();

// Estado local
const sessionStartTime = ref(Date.now());
const currentTime = ref(Date.now());
const timer = ref(null);

// Computed
const messageCount = computed(() => chatStore.messages.length);
const userMessageCount = computed(() => chatStore.userMessages.length);
const assistantMessageCount = computed(() => chatStore.assistantMessages.length);

const cardsCreated = computed(() => {
  return chatStore.messages.filter(msg => 
    msg.data && msg.data.type === 'card_created'
  ).length;
});

const sessionDuration = computed(() => {
  const duration = Math.floor((currentTime.value - sessionStartTime.value) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Dados estáticos
const examples = [
  {
    type: 'Bug',
    color: 'red',
    text: 'Preciso corrigir um bug na tela de login que não valida emails'
  },
  {
    type: 'Feature',
    color: 'blue',
    text: 'Quero desenvolver uma funcionalidade de relatórios em PDF'
  },
  {
    type: 'Técnica',
    color: 'orange',
    text: 'Criar tarefa para otimizar consultas do banco de dados'
  },
  {
    type: 'Documentação',
    color: 'green',
    text: 'Documentar a nova API de integração com terceiros'
  }
];

// Métodos
const updateTimer = () => {
  currentTime.value = Date.now();
};

// Lifecycle
onMounted(() => {
  timer.value = setInterval(updateTimer, 1000);
});

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value);
  }
});
</script>

<style scoped>
.chat-page {
  max-width: 1200px;
  margin: 0 auto;
}

.chat-container {
  max-width: 100%;
  margin: 0 auto;
}

.example-item {
  padding: 8px;
  border-left: 3px solid #e0e0e0;
  margin-left: 8px;
}

.examples-list {
  max-height: 300px;
  overflow-y: auto;
}

/* Responsividade */
@media (max-width: 600px) {
  .chat-container {
    margin: 0 -16px;
  }
}
</style>

