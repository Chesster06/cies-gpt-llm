package cies

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"cies/backend/internal/provider"
)

type CiesProvider struct {
	baseURL string
	client  *http.Client
}

func New(baseURL string) *CiesProvider {
	if baseURL == "" {
		baseURL = "http://localhost:8081"
	}
	return &CiesProvider{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		client:  &http.Client{},
	}
}

func (p *CiesProvider) ID() string {
	return "cies"
}

func (p *CiesProvider) Name() string {
	return "CiesGPT AI"
}

func (p *CiesProvider) IsConfigured() bool {
	return true
}

func (p *CiesProvider) DefaultModel() string {
	return "cies-llm-v1"
}

func (p *CiesProvider) AvailableModels() []string {
	return []string{
		"cies-llm-v1",
	}
}

type sseDelta struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
	} `json:"choices"`
}

type jsonResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

func (p *CiesProvider) Generate(ctx context.Context, req provider.AIRequest) (*provider.AIResponse, error) {
	model := req.Model
	if model == "" {
		model = p.DefaultModel()
	}

	temp := req.Temperature
	if temp <= 0 {
		temp = 0.6
	}
	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 512
	}

	payload := map[string]interface{}{
		"model":       model,
		"messages":    req.Messages,
		"stream":      false,
		"temperature": temp,
		"max_tokens":  maxTokens,
		"web_search":  req.WebSearch,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("CIES model server unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("CIES model error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var res jsonResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	content := ""
	finishReason := "stop"
	if len(res.Choices) > 0 {
		content = res.Choices[0].Message.Content
		if res.Choices[0].FinishReason != "" {
			finishReason = res.Choices[0].FinishReason
		}
	}

	return &provider.AIResponse{
		Text:         content,
		FinishReason: finishReason,
	}, nil
}

func (p *CiesProvider) Stream(ctx context.Context, req provider.AIRequest) (<-chan provider.StreamEvent, error) {
	model := req.Model
	if model == "" {
		model = p.DefaultModel()
	}

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 512
	}
	temp := req.Temperature
	if temp <= 0 {
		temp = 0.6
	}

	payload := map[string]interface{}{
		"model":       model,
		"messages":    req.Messages,
		"stream":      true,
		"temperature": temp,
		"max_tokens":  maxTokens,
		"web_search":  req.WebSearch,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("CIES in-house model server unreachable: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		return nil, fmt.Errorf("CIES model stream error (status %d): %s", resp.StatusCode, string(respBody))
	}

	eventChan := make(chan provider.StreamEvent, 100)

	go func() {
		defer resp.Body.Close()
		defer close(eventChan)

		reader := bufio.NewReader(resp.Body)
		for {
			select {
			case <-ctx.Done():
				eventChan <- provider.StreamEvent{Err: ctx.Err()}
				return
			default:
			}

			line, err := reader.ReadString('\n')
			if err != nil {
				if err != io.EOF {
					eventChan <- provider.StreamEvent{Err: err}
				}
				return
			}

			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data:") {
				continue
			}

			dataStr := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			if dataStr == "" {
				continue
			}
			if dataStr == "[DONE]" {
				eventChan <- provider.StreamEvent{FinishReason: "stop"}
				return
			}

			var delta sseDelta
			if err := json.Unmarshal([]byte(dataStr), &delta); err != nil {
				continue
			}

			if len(delta.Choices) > 0 && delta.Choices[0].Delta.Content != "" {
				eventChan <- provider.StreamEvent{Delta: delta.Choices[0].Delta.Content}
			}
		}
	}()

	return eventChan, nil
}
