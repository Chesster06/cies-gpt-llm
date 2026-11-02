package dto

import "github.com/google/uuid"

type ChatMessageRequest struct {
	ConversationID *uuid.UUID `json:"conversation_id,omitempty"`
	Message        string     `json:"message"`
	Provider       string     `json:"provider,omitempty"`
	Model          string     `json:"model,omitempty"`
	WebSearch      bool       `json:"web_search,omitempty"`
}

type RegenerateRequest struct {
	ConversationID uuid.UUID `json:"conversation_id"`
	Provider       string    `json:"provider,omitempty"`
	Model          string    `json:"model,omitempty"`
}

type EditMessageRequest struct {
	Content string `json:"content"`
}

type StreamEvent struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}

type ProviderInfo struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Available   bool         `json:"available"`
	Models      []ModelInfo  `json:"models"`
}

type ModelInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Default     bool   `json:"default,omitempty"`
}
