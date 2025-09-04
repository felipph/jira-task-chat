<template>
  <div class="chat-interface">
    <q-card class="chat-card">
      <!-- Header do Chat -->
      <q-card-section class="chat-header bg-primary text-white">
        <div class="row items-center">
          <div class="col">
            <div class="text-h6">
              <q-icon name="smart_toy" class="q-mr-sm" />
              Assistente JIRA IA
            </div>
            <div class="text-caption">
              Crie cartões JIRA usando linguagem natural
            </div>
          </div>
          <div class="col-auto">
            <q-btn
              flat
              round
              icon="clear_all"
              @click="clearChat"
              color="white"
            >
              <q-tooltip>Limpar Chat</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>

      <!-- Área de Mensagens -->
      <q-card-section class="chat-messages" ref="messagesContainer">
        <div v-if="!hasMessages" class="welcome-message text-center q-pa-lg">
          <q-icon name="waving_hand" size="3rem" color="primary" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">Olá! Como posso ajudar?</div>
          <div class="text-body2 text-grey-7">
            Descreva a tarefa que você quer criar no JIRA e eu identificarei o melhor template para você.
          </div>
          
          <!-- Sugestões de comandos -->
          <div class="q-mt-lg">
            <div class="text-subtitle2 q-mb-sm">Exemplos:</div>
            <q-chip
              v-for="example in exampleCommands"
              :key="example"
              clickable
              @click="sendMessage(example)"
              color="primary"
              text-color="white"
              class="q-ma-xs"
            >
              {{ example }}
            </q-chip>
          </div>
        </div>

        <!-- Lista de Mensagens -->
        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-wrapper"
            :class="message.type"
          >
            <q-chat-message
              :name="message.sender"
              :text="[message.text]"
              :sent="message.type === 'user'"
              :stamp="formatTimestamp(message.timestamp)"
              :bg-color="message.type === 'user' ? 'primary' : 'grey-3'"
              :text-color="message.type === 'user' ? 'white' : 'black'"
            >
              <!-- Dados adicionais para preview de cartão -->
              <template v-if="message.data && message.data.type === 'card_preview'" #default>
                <div class="card-preview q-mt-md">
                  <q-card flat bordered>
                    <q-card-section class="q-pa-sm">
                      <div class="text-weight-medium text-primary">
                        {{ message.data.template.name }}
                      </div>
                      <div class="text-body2 q-mt-xs">
                        <strong>Título:</strong> {{ message.data.extractedData.title }}
                      </div>
                      <div class="text-body2 q-mt-xs">
                        <strong>Descrição:</strong> {{ message.data.extractedData.description }}
                      </div>
                    </q-card-section>
                    
                    <q-card-actions align="center" class="q-pa-sm">
                      <q-btn
                        size="sm"
                        color="primary"
                        label="Confirmar"
                        @click="confirmCard"
                        :loading="isProcessingCard"
                      />
                      <q-btn
                        size="sm"
                        flat
                        label="Cancelar"
                        @click="cancelCard"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </template>

              <!-- Dados para cartão criado -->
              <template v-if="message.data && message.data.type === 'card_created'" #default>
                <div class="card-created q-mt-md">
                  <q-card flat bordered class="bg-green-1">
                    <q-card-section class="q-pa-sm">
                      <div class="text-weight-medium text-green-8">
                        <q-icon name="check_circle" class="q-mr-xs" />
                        Cartão Criado com Sucesso!
                      </div>
                      <div class="text-body2 q-mt-xs">
                        <strong>Chave:</strong> {{ message.data.cardKey }}
                      </div>
                    </q-card-section>
                    
                    <q-card-actions class="q-pa-sm">
                      <q-btn
                        size="sm"
                        color="primary"
                        :href="message.data.cardUrl"
                        target="_blank"
                        label="Ver no JIRA"
                        icon="open_in_new"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </template>
            </q-chat-message>
          </div>

          <!-- Indicador de digitação -->
          <div v-if="isTyping" class="typing-indicator">
            <q-chat-message
              name="Assistente IA"
              bg-color="grey-3"
            >
              <q-spinner-dots size="2rem" color="primary" />
            </q-chat-message>
          </div>
        </div>
      </q-card-section>

      <!-- Input de Mensagem -->
      <q-card-section class="chat-input">
        <q-form @submit.prevent="handleSendMessage">
          <div class="row q-gutter-sm">
            <div class="col">
              <q-input
                v-model="currentMessage"
                placeholder="Digite sua mensagem..."
                outlined
                dense
                :disable="isTyping || isProcessingCard"
                @keyup.enter="handleSendMessage"
                autofocus
              >
                <template #prepend>
                  <q-icon name="chat" />
                </template>
              </q-input>
            </div>
            <div class="col-auto">
              <q-btn
                type="submit"
                color="primary"
                icon="send"
                :disable="!currentMessage.trim() || isTyping || isProcessingCard"
                :loading="isTyping"
              />
            </div>
          </div>
        </q-form>

        <!-- Comandos rápidos -->
        <div class="quick-commands q-mt-sm">
          <q-chip
            v-for="command in quickCommands"
            :key="command"
            clickable
            @click="sendMessage(command)"
            size="sm"
            color="grey-4"
            class="q-mr-xs"
            :disable="isTyping || isProcessingCard"
          >
            {{ command }}
          </q-chip>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useChatStore } from '../stores/chatStore.js';

const chatStore = useChatStore();

// Estado local
const currentMessage = ref('');
const messagesContainer = ref(null);

// Computed
const messages = computed(() => chatStore.messages);
const hasMessages = computed(() => chatStore.hasMessages);
const isTyping = computed(() => chatStore.isTyping);
const isProcessingCard = computed(() => chatStore.isProcessingCard);

// Dados estáticos
const exampleCommands = [
  'Corrigir bug no login',
  'Nova funcionalidade de relatórios',
  'Documentar API',
  'templates'
];

const quickCommands = [
  'ajuda',
  'templates',
  'limpar'
];

// Métodos
const handleSendMessage = async () => {
  if (!currentMessage.value.trim()) return;
  
  const message = currentMessage.value.trim();
  currentMessage.value = '';
  
  await sendMessage(message);
};

const sendMessage = async (message) => {
  await chatStore.processUserMessage(message);
  scrollToBottom();
};

const confirmCard = async () => {
  await chatStore.confirmCardCreation();
  scrollToBottom();
};

const cancelCard = () => {
  chatStore.cancelCardCreation();
  scrollToBottom();
};

const clearChat = () => {
  chatStore.clearChat();
  scrollToBottom();
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    const container = messagesContainer.value.$el || messagesContainer.value;
    container.scrollTop = container.scrollHeight;
  }
};

// Watchers
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

// Inicialização
chatStore.addAssistantMessage('Olá! Sou seu assistente para criar cartões no JIRA. Como posso ajudar você hoje?');
</script>

<style scoped>
.chat-interface {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.chat-card {
  height: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  flex-shrink: 0;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background-color: #f5f5f5;
}

.welcome-message {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.messages-list {
  padding: 16px;
  min-height: 100%;
}

.message-wrapper {
  margin-bottom: 16px;
}

.card-preview,
.card-created {
  max-width: 300px;
}

.typing-indicator {
  margin-bottom: 16px;
}

.chat-input {
  flex-shrink: 0;
  background-color: white;
  border-top: 1px solid #e0e0e0;
}

.quick-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* Responsividade */
@media (max-width: 600px) {
  .chat-card {
    height: calc(100vh - 100px);
  }
  
  .card-preview,
  .card-created {
    max-width: 250px;
  }
}
</style>

