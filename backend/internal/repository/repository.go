package repository

import (
	"context"

	"github.com/google/uuid"
	"cies/backend/internal/model"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type ConversationRepository interface {
	Create(ctx context.Context, conv *model.Conversation) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error)
	ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Conversation, error)
	UpdateTitle(ctx context.Context, id uuid.UUID, title string) error
	UpdateModel(ctx context.Context, id uuid.UUID, provider, modelName string) error
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, userID uuid.UUID, query string) ([]*model.Conversation, error)
}

type MessageRepository interface {
	Create(ctx context.Context, msg *model.Message) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.Message, error)
	ListByConversationID(ctx context.Context, conversationID uuid.UUID) ([]*model.Message, error)
	UpdateContent(ctx context.Context, id uuid.UUID, content string) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteAfter(ctx context.Context, conversationID uuid.UUID, messageID uuid.UUID) error
}

type SettingsRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserSettings, error)
	Upsert(ctx context.Context, settings *model.UserSettings) error
}
