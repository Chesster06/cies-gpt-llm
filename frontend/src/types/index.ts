export type MessageRole = 'system' | 'user' | 'assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  plan?: string;
  gpt_profile?: string;
  age?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  provider: string;
  model: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  is_archived?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at?: string;
  updated_at?: string;
  isStreaming?: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  default?: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  available: boolean;
  models: ModelInfo[];
}

export interface UserSettings {
  id?: string;
  user_id?: string;
  theme: 'light' | 'dark' | 'system';
  default_provider: string;
  default_model: string;
}
