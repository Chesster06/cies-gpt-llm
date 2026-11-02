package provider

import (
	"context"
)

type MessageItem struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIRequest struct {
	Model       string        `json:"model"`
	Messages    []MessageItem `json:"messages"`
	Temperature float32       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	WebSearch   bool          `json:"web_search,omitempty"`
}

type AIResponse struct {
	Text         string `json:"text"`
	FinishReason string `json:"finish_reason"`
	PromptTokens int    `json:"prompt_tokens,omitempty"`
	OutputTokens int    `json:"output_tokens,omitempty"`
}

type StreamEvent struct {
	Delta        string `json:"delta,omitempty"`
	FinishReason string `json:"finish_reason,omitempty"`
	Err          error  `json:"-"`
}

type AIProvider interface {
	ID() string
	Name() string
	IsConfigured() bool
	DefaultModel() string
	AvailableModels() []string
	Generate(ctx context.Context, req AIRequest) (*AIResponse, error)
	Stream(ctx context.Context, req AIRequest) (<-chan StreamEvent, error)
}
