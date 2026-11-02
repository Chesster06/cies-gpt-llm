package repository

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"cies/backend/internal/model"
)

type MemoryStore struct {
	mu            sync.RWMutex
	users         map[uuid.UUID]*model.User
	usersByEmail  map[string]*model.User
	conversations map[uuid.UUID]*model.Conversation
	messages      map[uuid.UUID]*model.Message
	settings      map[uuid.UUID]*model.UserSettings
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		users:         make(map[uuid.UUID]*model.User),
		usersByEmail:  make(map[string]*model.User),
		conversations: make(map[uuid.UUID]*model.Conversation),
		messages:      make(map[uuid.UUID]*model.Message),
		settings:      make(map[uuid.UUID]*model.UserSettings),
	}
}

type MemoryUserRepository struct {
	store *MemoryStore
}

func NewMemoryUserRepository(store *MemoryStore) *MemoryUserRepository {
	return &MemoryUserRepository{store: store}
}

func (r *MemoryUserRepository) Create(ctx context.Context, u *model.User) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	if _, exists := r.store.usersByEmail[u.Email]; exists {
		return errors.New("user with this email already exists")
	}

	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now

	userCopy := *u
	r.store.users[u.ID] = &userCopy
	r.store.usersByEmail[u.Email] = &userCopy
	return nil
}

func (r *MemoryUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	u, exists := r.store.users[id]
	if !exists {
		return nil, errors.New("user not found")
	}
	copy := *u
	return &copy, nil
}

func (r *MemoryUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	u, exists := r.store.usersByEmail[email]
	if !exists {
		return nil, errors.New("user not found")
	}
	copy := *u
	return &copy, nil
}

func (r *MemoryUserRepository) Update(ctx context.Context, u *model.User) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	existing, exists := r.store.users[u.ID]
	if !exists {
		return errors.New("user not found")
	}
	u.UpdatedAt = time.Now()
	existing.Name = u.Name
	existing.PasswordHash = u.PasswordHash
	existing.UpdatedAt = u.UpdatedAt
	return nil
}

func (r *MemoryUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	user, exists := r.store.users[id]
	if exists {
		delete(r.store.usersByEmail, user.Email)
		delete(r.store.users, id)
	}

	delete(r.store.settings, id)

	userConvs := make(map[uuid.UUID]bool)
	for cID, c := range r.store.conversations {
		if c.UserID == id {
			userConvs[cID] = true
			delete(r.store.conversations, cID)
		}
	}

	for mID, m := range r.store.messages {
		if userConvs[m.ConversationID] {
			delete(r.store.messages, mID)
		}
	}

	return nil
}

type MemoryConversationRepository struct {
	store *MemoryStore
}

func NewMemoryConversationRepository(store *MemoryStore) *MemoryConversationRepository {
	return &MemoryConversationRepository{store: store}
}

func (r *MemoryConversationRepository) Create(ctx context.Context, c *model.Conversation) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	copy := *c
	r.store.conversations[c.ID] = &copy
	return nil
}

func (r *MemoryConversationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	c, exists := r.store.conversations[id]
	if !exists {
		return nil, errors.New("conversation not found")
	}
	copy := *c
	return &copy, nil
}

func (r *MemoryConversationRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Conversation, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []*model.Conversation
	for _, c := range r.store.conversations {
		if c.UserID == userID {
			copy := *c
			list = append(list, &copy)
		}
	}

	// Sort descending by updated_at
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			if list[i].UpdatedAt.Before(list[j].UpdatedAt) {
				list[i], list[j] = list[j], list[i]
			}
		}
	}

	if offset >= len(list) {
		return []*model.Conversation{}, nil
	}
	end := offset + limit
	if limit <= 0 || end > len(list) {
		end = len(list)
	}
	return list[offset:end], nil
}

func (r *MemoryConversationRepository) UpdateTitle(ctx context.Context, id uuid.UUID, title string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	c, exists := r.store.conversations[id]
	if !exists {
		return errors.New("conversation not found")
	}
	c.Title = title
	c.UpdatedAt = time.Now()
	return nil
}

func (r *MemoryConversationRepository) UpdateModel(ctx context.Context, id uuid.UUID, provider, modelName string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	c, exists := r.store.conversations[id]
	if !exists {
		return errors.New("conversation not found")
	}
	c.Provider = provider
	c.Model = modelName
	c.UpdatedAt = time.Now()
	return nil
}

func (r *MemoryConversationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	delete(r.store.conversations, id)
	for mID, msg := range r.store.messages {
		if msg.ConversationID == id {
			delete(r.store.messages, mID)
		}
	}
	return nil
}

func (r *MemoryConversationRepository) Search(ctx context.Context, userID uuid.UUID, q string) ([]*model.Conversation, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	queryLower := strings.ToLower(q)
	matchedMap := make(map[uuid.UUID]*model.Conversation)

	for _, c := range r.store.conversations {
		if c.UserID == userID && strings.Contains(strings.ToLower(c.Title), queryLower) {
			copy := *c
			matchedMap[c.ID] = &copy
		}
	}

	for _, m := range r.store.messages {
		if strings.Contains(strings.ToLower(m.Content), queryLower) {
			if c, exists := r.store.conversations[m.ConversationID]; exists && c.UserID == userID {
				copy := *c
				matchedMap[c.ID] = &copy
			}
		}
	}

	var list []*model.Conversation
	for _, c := range matchedMap {
		list = append(list, c)
	}
	return list, nil
}

type MemoryMessageRepository struct {
	store *MemoryStore
}

func NewMemoryMessageRepository(store *MemoryStore) *MemoryMessageRepository {
	return &MemoryMessageRepository{store: store}
}

func (r *MemoryMessageRepository) Create(ctx context.Context, m *model.Message) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now

	copy := *m
	r.store.messages[m.ID] = &copy

	if c, exists := r.store.conversations[m.ConversationID]; exists {
		c.UpdatedAt = now
	}
	return nil
}

func (r *MemoryMessageRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Message, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	m, exists := r.store.messages[id]
	if !exists {
		return nil, errors.New("message not found")
	}
	copy := *m
	return &copy, nil
}

func (r *MemoryMessageRepository) ListByConversationID(ctx context.Context, convID uuid.UUID) ([]*model.Message, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	var list []*model.Message
	for _, m := range r.store.messages {
		if m.ConversationID == convID {
			copy := *m
			list = append(list, &copy)
		}
	}

	// Sort ascending by created_at
	for i := 0; i < len(list); i++ {
		for j := i + 1; j < len(list); j++ {
			if list[i].CreatedAt.After(list[j].CreatedAt) {
				list[i], list[j] = list[j], list[i]
			}
		}
	}
	return list, nil
}

func (r *MemoryMessageRepository) UpdateContent(ctx context.Context, id uuid.UUID, content string) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	m, exists := r.store.messages[id]
	if !exists {
		return errors.New("message not found")
	}
	m.Content = content
	m.UpdatedAt = time.Now()
	return nil
}

func (r *MemoryMessageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	delete(r.store.messages, id)
	return nil
}

func (r *MemoryMessageRepository) DeleteAfter(ctx context.Context, convID uuid.UUID, msgID uuid.UUID) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	target, exists := r.store.messages[msgID]
	if !exists {
		return errors.New("message not found")
	}

	for id, m := range r.store.messages {
		if m.ConversationID == convID && m.CreatedAt.After(target.CreatedAt) {
			delete(r.store.messages, id)
		}
	}
	return nil
}

type MemorySettingsRepository struct {
	store *MemoryStore
}

func NewMemorySettingsRepository(store *MemoryStore) *MemorySettingsRepository {
	return &MemorySettingsRepository{store: store}
}

func (r *MemorySettingsRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserSettings, error) {
	r.store.mu.RLock()
	defer r.store.mu.RUnlock()

	s, exists := r.store.settings[userID]
	if !exists {
		return &model.UserSettings{
			UserID:          userID,
			Theme:           "system",
			DefaultProvider: "cies",
			DefaultModel:    "cies-llm-v1",
		}, nil
	}
	copy := *s
	return &copy, nil
}

func (r *MemorySettingsRepository) Upsert(ctx context.Context, s *model.UserSettings) error {
	r.store.mu.Lock()
	defer r.store.mu.Unlock()

	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	s.UpdatedAt = time.Now()

	copy := *s
	r.store.settings[s.UserID] = &copy
	return nil
}
