import type { Conversation, Message, ProviderInfo, User, UserSettings } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export function getGuestId(): string {
  let guestId = localStorage.getItem('cies_guest_id');
  const isUuid = guestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guestId);
  if (!guestId || !isUuid) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      guestId = crypto.randomUUID();
    } else {
      guestId = '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
        (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
      );
    }
    localStorage.setItem('cies_guest_id', guestId);
  }
  return guestId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('cies_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.set('X-Guest-ID', getGuestId());
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'omit',
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error?.message) {
        errorMsg = errJson.error.message;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: { name: string; username?: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  deleteAccount: () =>
    request<{ message: string }>('/auth/account', {
      method: 'DELETE',
    }),

  getMe: () => request<User>('/auth/me'),

  updateProfile: (data: { name?: string; username?: string }) =>
    request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Providers
  getProviders: () => request<ProviderInfo[]>('/providers'),
  getModels: () => request<any[]>('/models'),

  // Conversations
  getConversations: async () => {
    const res = await request<Conversation[]>('/conversations');
    return Array.isArray(res) ? res : [];
  },

  createConversation: (data: { title?: string; provider?: string; model?: string }) =>
    request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    request<{ message: string }>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    request<{ message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    }),

  searchConversations: async (query: string) => {
    const res = await request<Conversation[]>(`/conversations/search?q=${encodeURIComponent(query)}`);
    return Array.isArray(res) ? res : [];
  },

  // Settings
  getSettings: () => request<UserSettings>('/settings'),
  updateSettings: (data: Partial<UserSettings>) =>
    request<UserSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Message actions
  editMessage: (id: string, content: string) =>
    request<{ message: string }>(`/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (id: string) =>
    request<{ message: string }>(`/messages/${id}`, {
      method: 'DELETE',
    }),
};
