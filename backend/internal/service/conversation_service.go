package service

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"cies/backend/internal/dto"
	"cies/backend/internal/model"
	"cies/backend/internal/repository"
)

type ConversationService struct {
	convRepo     repository.ConversationRepository
	msgRepo      repository.MessageRepository
	settingsRepo repository.SettingsRepository
}

func NewConversationService(
	convRepo repository.ConversationRepository,
	msgRepo repository.MessageRepository,
	settingsRepo repository.SettingsRepository,
) *ConversationService {
	return &ConversationService{
		convRepo:     convRepo,
		msgRepo:      msgRepo,
		settingsRepo: settingsRepo,
	}
}

func (s *ConversationService) Create(ctx context.Context, userID uuid.UUID, req dto.CreateConversationRequest) (*model.Conversation, error) {
	title := req.Title
	if title == "" {
		title = "New Chat"
	}
	providerName := req.Provider
	if providerName == "" {
		providerName = "cies"
	}
	modelName := req.Model
	if modelName == "" {
		modelName = "cies-llm-v1"
	}

	conv := &model.Conversation{
		ID:       uuid.New(),
		UserID:   userID,
		Title:    title,
		Provider: providerName,
		Model:    modelName,
	}

	if err := s.convRepo.Create(ctx, conv); err != nil {
		return nil, err
	}
	return conv, nil
}

func (s *ConversationService) List(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Conversation, error) {
	return s.convRepo.ListByUserID(ctx, userID, limit, offset)
}

func (s *ConversationService) GetByID(ctx context.Context, userID uuid.UUID, convID uuid.UUID) (*model.Conversation, []*model.Message, error) {
	conv, err := s.convRepo.GetByID(ctx, convID)
	if err != nil {
		return nil, nil, err
	}
	if conv.UserID != userID {
		return nil, nil, errors.New("unauthorized to view this conversation")
	}

	messages, err := s.msgRepo.ListByConversationID(ctx, convID)
	if err != nil {
		return nil, nil, err
	}

	return conv, messages, nil
}

func (s *ConversationService) Rename(ctx context.Context, userID uuid.UUID, convID uuid.UUID, title string) error {
	conv, err := s.convRepo.GetByID(ctx, convID)
	if err != nil {
		return err
	}
	if conv.UserID != userID {
		return errors.New("unauthorized")
	}
	return s.convRepo.UpdateTitle(ctx, convID, title)
}

func (s *ConversationService) Delete(ctx context.Context, userID uuid.UUID, convID uuid.UUID) error {
	conv, err := s.convRepo.GetByID(ctx, convID)
	if err != nil {
		return err
	}
	if conv.UserID != userID {
		return errors.New("unauthorized")
	}
	return s.convRepo.Delete(ctx, convID)
}

func (s *ConversationService) Search(ctx context.Context, userID uuid.UUID, query string) ([]*model.Conversation, error) {
	return s.convRepo.Search(ctx, userID, query)
}

func (s *ConversationService) GetSettings(ctx context.Context, userID uuid.UUID) (*model.UserSettings, error) {
	return s.settingsRepo.GetByUserID(ctx, userID)
}

func (s *ConversationService) UpdateSettings(ctx context.Context, userID uuid.UUID, req dto.UpdateSettingsRequest) (*model.UserSettings, error) {
	settings, err := s.settingsRepo.GetByUserID(ctx, userID)
	if err != nil {
		settings = &model.UserSettings{UserID: userID}
	}
	if req.Theme != "" {
		settings.Theme = req.Theme
	}
	if req.DefaultProvider != "" {
		settings.DefaultProvider = req.DefaultProvider
	}
	if req.DefaultModel != "" {
		settings.DefaultModel = req.DefaultModel
	}

	if err := s.settingsRepo.Upsert(ctx, settings); err != nil {
		return nil, err
	}
	return settings, nil
}
