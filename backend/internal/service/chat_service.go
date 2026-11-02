package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"cies/backend/internal/dto"
	"cies/backend/internal/model"
	"cies/backend/internal/provider"
	"cies/backend/internal/repository"
)

type ChatService struct {
	convRepo         repository.ConversationRepository
	msgRepo          repository.MessageRepository
	providerRegistry *provider.Registry
	defaultProvider  string
	defaultModel     string
}

func NewChatService(
	convRepo repository.ConversationRepository,
	msgRepo repository.MessageRepository,
	registry *provider.Registry,
	defaultProvider string,
	defaultModel string,
) *ChatService {
	return &ChatService{
		convRepo:         convRepo,
		msgRepo:          msgRepo,
		providerRegistry: registry,
		defaultProvider:  defaultProvider,
		defaultModel:     defaultModel,
	}
}

func (s *ChatService) prepareConversation(ctx context.Context, userID uuid.UUID, convID *uuid.UUID, userMsg string, prov string, mdl string) (*model.Conversation, error) {
	var conv *model.Conversation
	var err error

	if convID != nil && *convID != uuid.Nil {
		conv, err = s.convRepo.GetByID(ctx, *convID)
		if err != nil {
			return nil, err
		}
		if conv.UserID != userID {
			return nil, errors.New("unauthorized")
		}
		conv.Provider = "cies"
		if mdl != "" {
			conv.Model = mdl
		} else {
			conv.Model = s.defaultModel
		}
		_ = s.convRepo.UpdateModel(ctx, conv.ID, conv.Provider, conv.Model)
	} else {
		prov = "cies"
		if mdl == "" {
			mdl = s.defaultModel
		}

		titleWords := strings.Fields(userMsg)
		title := "New Chat"
		if len(titleWords) > 0 {
			if len(titleWords) > 6 {
				title = strings.Join(titleWords[:6], " ")
			} else {
				title = strings.Join(titleWords, " ")
			}
		}

		conv = &model.Conversation{
			ID:       uuid.New(),
			UserID:   userID,
			Title:    title,
			Provider: prov,
			Model:    mdl,
		}
		if err := s.convRepo.Create(ctx, conv); err != nil {
			return nil, err
		}
	}

	return conv, nil
}

func (s *ChatService) SendMessage(ctx context.Context, userID uuid.UUID, req dto.ChatMessageRequest) (*model.Message, *model.Message, *model.Conversation, error) {
	if strings.TrimSpace(req.Message) == "" {
		return nil, nil, nil, errors.New("message cannot be empty")
	}

	conv, err := s.prepareConversation(ctx, userID, req.ConversationID, req.Message, req.Provider, req.Model)
	if err != nil {
		return nil, nil, nil, err
	}

	userMsg := &model.Message{
		ID:             uuid.New(),
		ConversationID: conv.ID,
		Role:           model.RoleUser,
		Content:        req.Message,
	}
	if err := s.msgRepo.Create(ctx, userMsg); err != nil {
		return nil, nil, nil, err
	}

	allMessages, err := s.msgRepo.ListByConversationID(ctx, conv.ID)
	if err != nil {
		return nil, nil, nil, err
	}

	var aiMessages []provider.MessageItem
	for _, m := range allMessages {
		aiMessages = append(aiMessages, provider.MessageItem{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

	aiReq := provider.AIRequest{
		Model:     conv.Model,
		Messages:  aiMessages,
		WebSearch: req.WebSearch,
	}

	aiProv, err := s.providerRegistry.Get("cies")
	if err != nil {
		return nil, nil, nil, fmt.Errorf("CIES in-house model provider unavailable: %w", err)
	}

	aiResp, err := aiProv.Generate(ctx, aiReq)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("CIES model generation failed: %w", err)
	}
	responseText := aiResp.Text

	aiMsg := &model.Message{
		ID:             uuid.New(),
		ConversationID: conv.ID,
		Role:           model.RoleAssistant,
		Content:        responseText,
	}
	if err := s.msgRepo.Create(ctx, aiMsg); err != nil {
		return nil, nil, nil, err
	}

	return userMsg, aiMsg, conv, nil
}

type StreamResult struct {
	Conversation   *model.Conversation
	UserMessage    *model.Message
	AssistantMsgID uuid.UUID
	EventChan      <-chan provider.StreamEvent
	SaveFinal      func(finalText string) error
}

func (s *ChatService) StreamMessage(ctx context.Context, userID uuid.UUID, req dto.ChatMessageRequest) (*StreamResult, error) {
	if strings.TrimSpace(req.Message) == "" {
		return nil, errors.New("message cannot be empty")
	}

	conv, err := s.prepareConversation(ctx, userID, req.ConversationID, req.Message, req.Provider, req.Model)
	if err != nil {
		return nil, err
	}

	userMsg := &model.Message{
		ID:             uuid.New(),
		ConversationID: conv.ID,
		Role:           model.RoleUser,
		Content:        req.Message,
	}
	if err := s.msgRepo.Create(ctx, userMsg); err != nil {
		return nil, err
	}

	allMessages, err := s.msgRepo.ListByConversationID(ctx, conv.ID)
	if err != nil {
		return nil, err
	}

	var aiMessages []provider.MessageItem
	for _, m := range allMessages {
		aiMessages = append(aiMessages, provider.MessageItem{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

	assistantMsgID := uuid.New()
	aiReq := provider.AIRequest{
		Model:     conv.Model,
		Messages:  aiMessages,
		WebSearch: req.WebSearch,
	}

	aiProv, err := s.providerRegistry.Get("cies")
	if err != nil {
		return nil, fmt.Errorf("CIES in-house model provider unavailable: %w", err)
	}

	eventChan, err := aiProv.Stream(ctx, aiReq)
	if err != nil {
		return nil, fmt.Errorf("CIES model stream error: %w", err)
	}

	saveFinal := func(finalText string) error {
		aiMsg := &model.Message{
			ID:             assistantMsgID,
			ConversationID: conv.ID,
			Role:           model.RoleAssistant,
			Content:        finalText,
		}
		return s.msgRepo.Create(context.Background(), aiMsg)
	}

	return &StreamResult{
		Conversation:   conv,
		UserMessage:    userMsg,
		AssistantMsgID: assistantMsgID,
		EventChan:      eventChan,
		SaveFinal:      saveFinal,
	}, nil
}

func (s *ChatService) Regenerate(ctx context.Context, userID uuid.UUID, req dto.RegenerateRequest) (*StreamResult, error) {
	conv, err := s.convRepo.GetByID(ctx, req.ConversationID)
	if err != nil {
		return nil, err
	}
	if conv.UserID != userID {
		return nil, errors.New("unauthorized")
	}

	if req.Provider != "" {
		conv.Provider = req.Provider
		conv.Model = req.Model
		_ = s.convRepo.UpdateModel(ctx, conv.ID, req.Provider, req.Model)
	}

	allMessages, err := s.msgRepo.ListByConversationID(ctx, conv.ID)
	if err != nil || len(allMessages) == 0 {
		return nil, errors.New("no messages to regenerate")
	}

	lastMsg := allMessages[len(allMessages)-1]
	if lastMsg.Role == model.RoleAssistant {
		_ = s.msgRepo.Delete(ctx, lastMsg.ID)
		allMessages = allMessages[:len(allMessages)-1]
	}

	var aiMessages []provider.MessageItem
	for _, m := range allMessages {
		aiMessages = append(aiMessages, provider.MessageItem{
			Role:    string(m.Role),
			Content: m.Content,
		})
	}

	assistantMsgID := uuid.New()
	aiReq := provider.AIRequest{
		Model:    conv.Model,
		Messages: aiMessages,
	}

	aiProv, err := s.providerRegistry.Get("cies")
	if err != nil {
		return nil, fmt.Errorf("CIES in-house model provider unavailable: %w", err)
	}

	eventChan, err := aiProv.Stream(ctx, aiReq)
	if err != nil {
		return nil, fmt.Errorf("CIES model stream error: %w", err)
	}

	saveFinal := func(finalText string) error {
		aiMsg := &model.Message{
			ID:             assistantMsgID,
			ConversationID: conv.ID,
			Role:           model.RoleAssistant,
			Content:        finalText,
		}
		return s.msgRepo.Create(context.Background(), aiMsg)
	}

	return &StreamResult{
		Conversation:   conv,
		AssistantMsgID: assistantMsgID,
		EventChan:      eventChan,
		SaveFinal:      saveFinal,
	}, nil
}
