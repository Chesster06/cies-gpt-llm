import { create } from 'zustand';
import type { Conversation, Message, ProviderInfo } from '../types';
import { api, getGuestId } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  providers: ProviderInfo[];
  selectedProvider: string;
  selectedModel: string;
  isLoading: boolean;
  isStreaming: boolean;
  abortController: AbortController | null;
  sidebarOpen: boolean;
  searchOpen: boolean;
  webSearchEnabled: boolean;

  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleWebSearch: () => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;

  loadProviders: () => Promise<void>;
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  newChat: () => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  pinnedConversationIds: string[];
  archivedConversationIds: string[];
  togglePinConversation: (id: string) => void;
  archiveConversation: (id: string) => void;
  unarchiveConversation: (id: string) => void;
  archiveAllConversations: () => void;

  sendMessage: (text: string) => Promise<void>;
  regenerateMessage: () => Promise<void>;
  editMessage: (id: string, newContent: string) => Promise<void>;
  stopGenerating: () => void;
}

export const DEFAULT_PROVIDERS: ProviderInfo[] = [
  {
    id: 'cies',
    name: 'CiesGPT AI',
    description: 'CiesGPT Webchat AI Model',
    available: true,
    models: [
      { id: 'cies-llm-v1', name: 'cies-llm-v1', default: true },
    ],
  },
];

const getInitialPinned = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('cies_pinned_chats') || '[]');
  } catch {
    return [];
  }
};

const getInitialArchived = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem('cies_archived_chats') || '[]');
  } catch {
    return [];
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  pinnedConversationIds: getInitialPinned(),
  archivedConversationIds: getInitialArchived(),
  providers: DEFAULT_PROVIDERS,
  selectedProvider: 'cies',
  selectedModel: 'cies-llm-v1',
  isLoading: false,
  isStreaming: false,
  abortController: null,
  sidebarOpen: true,
  searchOpen: false,
  webSearchEnabled: false,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSearchOpen: (open) => set({ searchOpen: open }),
  toggleWebSearch: () => set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),

  setSelectedProvider: (provider) => {
    const p = get().providers.find((item) => item.id === provider);
    const defaultModel = p?.models.find((m) => m.default)?.id || p?.models[0]?.id || '';
    set({ selectedProvider: provider, selectedModel: defaultModel });
  },

  setSelectedModel: (model) => set({ selectedModel: model }),

  loadProviders: async () => {
    try {
      const providers = await api.getProviders();
      if (Array.isArray(providers) && providers.length > 0) {
        set({ providers });
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  },

  loadConversations: async () => {
    try {
      const conversations = await api.getConversations();
      set({ conversations: Array.isArray(conversations) ? conversations : [] });
    } catch (err) {
      console.error('Failed to load conversations:', err);
      set({ conversations: [] });
    }
  },

  selectConversation: async (id: string) => {
    set({ isLoading: true });
    try {
      const { conversation, messages } = await api.getConversation(id);
      set({
        currentConversation: conversation,
        messages,
        selectedProvider: conversation.provider,
        selectedModel: conversation.model,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load conversation:', err);
      set({ isLoading: false });
    }
  },

  newChat: () => {
    set({
      currentConversation: null,
      messages: [],
    });
  },

  renameConversation: async (id: string, title: string) => {
    try {
      await api.renameConversation(id, title);
      set((state) => ({
        conversations: (state.conversations || []).map((c) => (c.id === id ? { ...c, title } : c)),
        currentConversation:
          state.currentConversation?.id === id
            ? { ...state.currentConversation, title }
            : state.currentConversation,
      }));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await api.deleteConversation(id);
      set((state) => {
        const newPinned = state.pinnedConversationIds.filter((item) => item !== id);
        const newArchived = state.archivedConversationIds.filter((item) => item !== id);
        try {
          localStorage.setItem('cies_pinned_chats', JSON.stringify(newPinned));
          localStorage.setItem('cies_archived_chats', JSON.stringify(newArchived));
        } catch {}
        return {
          conversations: (state.conversations || []).filter((c) => c.id !== id),
          pinnedConversationIds: newPinned,
          archivedConversationIds: newArchived,
          currentConversation: state.currentConversation?.id === id ? null : state.currentConversation,
          messages: state.currentConversation?.id === id ? [] : state.messages,
        };
      });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  },

  togglePinConversation: (id: string) => {
    set((state) => {
      const isPinned = state.pinnedConversationIds.includes(id);
      const newPinned = isPinned
        ? state.pinnedConversationIds.filter((item) => item !== id)
        : [id, ...state.pinnedConversationIds];
      try {
        localStorage.setItem('cies_pinned_chats', JSON.stringify(newPinned));
      } catch {}
      return { pinnedConversationIds: newPinned };
    });
  },

  archiveConversation: (id: string) => {
    set((state) => {
      const newArchived = state.archivedConversationIds.includes(id)
        ? state.archivedConversationIds
        : [id, ...state.archivedConversationIds];
      const newPinned = state.pinnedConversationIds.filter((item) => item !== id);
      try {
        localStorage.setItem('cies_archived_chats', JSON.stringify(newArchived));
        localStorage.setItem('cies_pinned_chats', JSON.stringify(newPinned));
      } catch {}

      const isActive = state.currentConversation?.id === id;
      return {
        archivedConversationIds: newArchived,
        pinnedConversationIds: newPinned,
        currentConversation: isActive ? null : state.currentConversation,
        messages: isActive ? [] : state.messages,
      };
    });
  },

  unarchiveConversation: (id: string) => {
    set((state) => {
      const newArchived = state.archivedConversationIds.filter((item) => item !== id);
      try {
        localStorage.setItem('cies_archived_chats', JSON.stringify(newArchived));
      } catch {}
      return { archivedConversationIds: newArchived };
    });
  },

  archiveAllConversations: () => {
    set((state) => {
      const allIds = (state.conversations || []).map((c) => c.id);
      const newArchived = Array.from(new Set([...state.archivedConversationIds, ...allIds]));
      try {
        localStorage.setItem('cies_archived_chats', JSON.stringify(newArchived));
        localStorage.setItem('cies_pinned_chats', JSON.stringify([]));
      } catch {}
      return {
        archivedConversationIds: newArchived,
        pinnedConversationIds: [],
        currentConversation: null,
        messages: [],
      };
    });
  },

  stopGenerating: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isStreaming: false, abortController: null });
    }
  },

  sendMessage: async (text: string) => {
    const { currentConversation, selectedProvider, selectedModel, messages } = get();
    if (!text.trim()) return;

    const controller = new AbortController();
    const token = localStorage.getItem('cies_token');

    // Optimistically create user message
    const tempUserMsg: Message = {
      id: 'temp-user-' + Date.now(),
      conversation_id: currentConversation?.id || '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    // Placeholder for assistant streaming
    const tempAiMsg: Message = {
      id: 'temp-ai-' + Date.now(),
      conversation_id: currentConversation?.id || '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    set({
      messages: [...messages, tempUserMsg, tempAiMsg],
      isStreaming: true,
      abortController: controller,
    });

    let outgoingText = text;
    let effectiveWebSearch = get().webSearchEnabled;
    const isLocationEnabled = localStorage.getItem('cies_location_enabled') === 'true';
    const savedLocName = localStorage.getItem('cies_location_name');
    if (isLocationEnabled && savedLocName) {
      const isLocalQuery = /\b(cuaca|weather|suhu|temperature|hujan|lokasi|berdekatan|dekat sini|near me|nearby|restoran|makanan|kedai|masjid|klinik|hospital)\b/i.test(text);
      if (isLocalQuery) {
        effectiveWebSearch = true;
        const mainCity = savedLocName.split(',')[0].trim().toLowerCase();
        if (!text.toLowerCase().includes(mainCity)) {
          outgoingText = `${text} (Lokasi semasa: ${savedLocName})`;
        }
      }
    }

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Guest-ID': getGuestId() }),
        },
        body: JSON.stringify({
          conversation_id: currentConversation?.id || undefined,
          message: outgoingText,
          provider: selectedProvider,
          model: selectedModel,
          web_search: effectiveWebSearch,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to stream: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let assistantMsgId = tempAiMsg.id;
      const requestStartTime = Date.now();
      let hasRenderedFirstChunk = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (eventType === 'message_start') {
            try {
              const meta = JSON.parse(dataStr);
              if (meta.conversation_id) {
                if (!currentConversation) {
                  const newConv: Conversation = {
                    id: meta.conversation_id,
                    user_id: '',
                    title: meta.title || text.slice(0, 30),
                    provider: selectedProvider,
                    model: selectedModel,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  set((state) => ({
                    currentConversation: newConv,
                    conversations: [newConv, ...state.conversations],
                  }));
                }
              }
              if (meta.message_id) {
                assistantMsgId = meta.message_id;
              }
            } catch (e) {
              console.error('Error parsing message_start:', e);
            }
          } else if (eventType === 'content_delta') {
            try {
              const deltaObj = JSON.parse(dataStr);
              const chunk = deltaObj.text || '';
              if (chunk) {
                if (!hasRenderedFirstChunk) {
                  hasRenderedFirstChunk = true;
                  const elapsed = Date.now() - requestStartTime;
                  if (elapsed < 800) {
                    await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
                  }
                }
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === tempAiMsg.id || m.id === assistantMsgId
                      ? { ...m, id: assistantMsgId, content: m.content + chunk }
                      : m
                  ),
                }));
              }
            } catch (e) {
              console.error('Error parsing delta:', e);
            }
          } else if (eventType === 'message_complete') {
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === assistantMsgId || m.id === tempAiMsg.id
                  ? { ...m, isStreaming: false }
                  : m
              ),
            }));
          } else if (eventType === 'error') {
            try {
              const errObj = JSON.parse(dataStr);
              const errMsg = errObj.message || 'Error generating response';
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMsgId || m.id === tempAiMsg.id
                    ? { ...m, content: m.content || `⚠️ ${errMsg}`, isStreaming: false }
                    : m
                ),
              }));
            } catch {}
          }
        }
      }

      set((state) => ({
        isStreaming: false,
        abortController: null,
        messages: state.messages.map((m) =>
          m.id === assistantMsgId || m.id === tempAiMsg.id ? { ...m, isStreaming: false } : m
        ),
      }));

      // Reload conversations list to sync titles
      get().loadConversations();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Chat error:', err);
      }
      set((state) => ({
        isStreaming: false,
        abortController: null,
        messages: state.messages.map((m) =>
          m.id === tempAiMsg.id ? { ...m, content: m.content || `⚠️ Error: ${err.message || 'Connection failed'}`, isStreaming: false } : m
        ),
      }));
    }
  },

  regenerateMessage: async () => {
    const { currentConversation, selectedProvider, selectedModel, messages } = get();
    if (!currentConversation) return;

    const controller = new AbortController();
    const token = localStorage.getItem('cies_token');

    // Remove last assistant message if present
    const filtered = [...messages];
    if (filtered.length > 0 && filtered[filtered.length - 1].role === 'assistant') {
      filtered.pop();
    }

    const tempAiMsg: Message = {
      id: 'regen-' + Date.now(),
      conversation_id: currentConversation.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    set({
      messages: [...filtered, tempAiMsg],
      isStreaming: true,
      abortController: controller,
    });

    try {
      const response = await fetch(`${API_BASE}/chat/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Guest-ID': getGuestId() }),
        },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          provider: selectedProvider,
          model: selectedModel,
        }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream available');
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      const regenStartTime = Date.now();
      let hasRenderedFirstRegenChunk = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataStr = line.slice(6).trim();
          }

          if (eventType === 'content_delta') {
            try {
              const delta = JSON.parse(dataStr);
              const chunk = delta.text || '';
              if (chunk) {
                if (!hasRenderedFirstRegenChunk) {
                  hasRenderedFirstRegenChunk = true;
                  const elapsed = Date.now() - regenStartTime;
                  if (elapsed < 800) {
                    await new Promise((resolve) => setTimeout(resolve, 800 - elapsed));
                  }
                }
                set((state) => ({
                  messages: state.messages.map((m) =>
                    m.id === tempAiMsg.id ? { ...m, content: m.content + chunk } : m
                  ),
                }));
              }
            } catch {}
          }
        }
      }

      set((state) => ({
        isStreaming: false,
        abortController: null,
        messages: state.messages.map((m) =>
          m.id === tempAiMsg.id ? { ...m, isStreaming: false } : m
        ),
      }));
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Regenerate error:', err);
      set({ isStreaming: false, abortController: null });
    }
  },

  editMessage: async (id: string, newContent: string) => {
    try {
      await api.editMessage(id, newContent);
      const { currentConversation } = get();
      if (currentConversation) {
        await get().selectConversation(currentConversation.id);
        await get().regenerateMessage();
      }
    } catch (err) {
      console.error('Edit message error:', err);
    }
  },
}));
