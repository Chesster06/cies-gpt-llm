package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"cies/backend/internal/model"
)

type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) Create(ctx context.Context, u *model.User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now

	query := `INSERT INTO users (id, name, email, password_hash, created_at, updated_at) 
	          VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := r.pool.Exec(ctx, query, u.ID, u.Name, u.Email, u.PasswordHash, u.CreatedAt, u.UpdatedAt)
	return err
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE id = $1`
	var u model.User
	err := r.pool.QueryRow(ctx, query, id).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, name, email, password_hash, created_at, updated_at FROM users WHERE email = $1`
	var u model.User
	err := r.pool.QueryRow(ctx, query, email).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &u, nil
}

func (r *PostgresUserRepository) Update(ctx context.Context, u *model.User) error {
	u.UpdatedAt = time.Now()
	query := `UPDATE users SET name = $1, password_hash = $2, updated_at = $3 WHERE id = $4`
	_, err := r.pool.Exec(ctx, query, u.Name, u.PasswordHash, u.UpdatedAt, u.ID)
	return err
}

func (r *PostgresUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

type PostgresConversationRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresConversationRepository(pool *pgxpool.Pool) *PostgresConversationRepository {
	return &PostgresConversationRepository{pool: pool}
}

func (r *PostgresConversationRepository) Create(ctx context.Context, c *model.Conversation) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	query := `INSERT INTO conversations (id, user_id, title, provider, model, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.pool.Exec(ctx, query, c.ID, c.UserID, c.Title, c.Provider, c.Model, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *PostgresConversationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error) {
	query := `SELECT id, user_id, title, provider, model, created_at, updated_at FROM conversations WHERE id = $1`
	var c model.Conversation
	err := r.pool.QueryRow(ctx, query, id).Scan(&c.ID, &c.UserID, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("conversation not found")
		}
		return nil, err
	}
	return &c, nil
}

func (r *PostgresConversationRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Conversation, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `SELECT id, user_id, title, provider, model, created_at, updated_at 
	          FROM conversations 
	          WHERE user_id = $1 
	          ORDER BY updated_at DESC 
	          LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.Conversation
	for rows.Next() {
		var c model.Conversation
		if err := rows.Scan(&c.ID, &c.UserID, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, nil
}

func (r *PostgresConversationRepository) UpdateTitle(ctx context.Context, id uuid.UUID, title string) error {
	query := `UPDATE conversations SET title = $1, updated_at = $2 WHERE id = $3`
	_, err := r.pool.Exec(ctx, query, title, time.Now(), id)
	return err
}

func (r *PostgresConversationRepository) UpdateModel(ctx context.Context, id uuid.UUID, provider, modelName string) error {
	query := `UPDATE conversations SET provider = $1, model = $2, updated_at = $3 WHERE id = $4`
	_, err := r.pool.Exec(ctx, query, provider, modelName, time.Now(), id)
	return err
}

func (r *PostgresConversationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM conversations WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *PostgresConversationRepository) Search(ctx context.Context, userID uuid.UUID, q string) ([]*model.Conversation, error) {
	pattern := fmt.Sprintf("%%%s%%", q)
	query := `SELECT DISTINCT c.id, c.user_id, c.title, c.provider, c.model, c.created_at, c.updated_at
	          FROM conversations c
	          LEFT JOIN messages m ON m.conversation_id = c.id
	          WHERE c.user_id = $1 AND (c.title ILIKE $2 OR m.content ILIKE $2)
	          ORDER BY c.updated_at DESC
	          LIMIT 20`
	rows, err := r.pool.Query(ctx, query, userID, pattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.Conversation
	for rows.Next() {
		var c model.Conversation
		if err := rows.Scan(&c.ID, &c.UserID, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &c)
	}
	return list, nil
}

type PostgresMessageRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresMessageRepository(pool *pgxpool.Pool) *PostgresMessageRepository {
	return &PostgresMessageRepository{pool: pool}
}

func (r *PostgresMessageRepository) Create(ctx context.Context, m *model.Message) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now

	query := `INSERT INTO messages (id, conversation_id, role, content, token_usage, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.pool.Exec(ctx, query, m.ID, m.ConversationID, m.Role, m.Content, m.TokenUsage, m.CreatedAt, m.UpdatedAt)
	if err == nil {
		_, _ = r.pool.Exec(ctx, `UPDATE conversations SET updated_at = $1 WHERE id = $2`, now, m.ConversationID)
	}
	return err
}

func (r *PostgresMessageRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Message, error) {
	query := `SELECT id, conversation_id, role, content, token_usage, created_at, updated_at FROM messages WHERE id = $1`
	var m model.Message
	err := r.pool.QueryRow(ctx, query, id).Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.TokenUsage, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("message not found")
		}
		return nil, err
	}
	return &m, nil
}

func (r *PostgresMessageRepository) ListByConversationID(ctx context.Context, convID uuid.UUID) ([]*model.Message, error) {
	query := `SELECT id, conversation_id, role, content, token_usage, created_at, updated_at 
	          FROM messages 
	          WHERE conversation_id = $1 
	          ORDER BY created_at ASC`
	rows, err := r.pool.Query(ctx, query, convID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.TokenUsage, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, &m)
	}
	return list, nil
}

func (r *PostgresMessageRepository) UpdateContent(ctx context.Context, id uuid.UUID, content string) error {
	query := `UPDATE messages SET content = $1, updated_at = $2 WHERE id = $3`
	_, err := r.pool.Exec(ctx, query, content, time.Now(), id)
	return err
}

func (r *PostgresMessageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM messages WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *PostgresMessageRepository) DeleteAfter(ctx context.Context, convID uuid.UUID, msgID uuid.UUID) error {
	msg, err := r.GetByID(ctx, msgID)
	if err != nil {
		return err
	}
	query := `DELETE FROM messages WHERE conversation_id = $1 AND created_at > $2`
	_, err = r.pool.Exec(ctx, query, convID, msg.CreatedAt)
	return err
}

type PostgresSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresSettingsRepository(pool *pgxpool.Pool) *PostgresSettingsRepository {
	return &PostgresSettingsRepository{pool: pool}
}

func (r *PostgresSettingsRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserSettings, error) {
	query := `SELECT id, user_id, theme, default_provider, default_model, created_at, updated_at 
	          FROM user_settings WHERE user_id = $1`
	var s model.UserSettings
	err := r.pool.QueryRow(ctx, query, userID).Scan(&s.ID, &s.UserID, &s.Theme, &s.DefaultProvider, &s.DefaultModel, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &model.UserSettings{
				UserID:          userID,
				Theme:           "system",
				DefaultProvider: "cies",
				DefaultModel:    "cies-llm-v1",
			}, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *PostgresSettingsRepository) Upsert(ctx context.Context, s *model.UserSettings) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now()
	s.UpdatedAt = now

	query := `INSERT INTO user_settings (id, user_id, theme, default_provider, default_model, created_at, updated_at)
	          VALUES ($1, $2, $3, $4, $5, $6, $7)
	          ON CONFLICT (user_id) DO UPDATE 
	          SET theme = EXCLUDED.theme, 
	              default_provider = EXCLUDED.default_provider, 
	              default_model = EXCLUDED.default_model, 
	              updated_at = EXCLUDED.updated_at`
	_, err := r.pool.Exec(ctx, query, s.ID, s.UserID, s.Theme, s.DefaultProvider, s.DefaultModel, now, now)
	return err
}
