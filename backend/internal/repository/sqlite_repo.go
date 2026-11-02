package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"

	"cies/backend/internal/model"
)

type SqliteDB struct {
	DB *sql.DB
}

func NewSqliteDB(dbPath string) (*SqliteDB, error) {
	dir := filepath.Dir(dbPath)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create sqlite dir: %w", err)
		}
	}

	dsn := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite: %w", err)
	}

	db.SetMaxOpenConns(1) // SQLite works safest with 1 writer connection in WAL mode

	if err := initSqliteSchema(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to init sqlite schema: %w", err)
	}

	return &SqliteDB{DB: db}, nil
}

func initSqliteSchema(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		username TEXT NOT NULL DEFAULT '',
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

	CREATE TABLE IF NOT EXISTS conversations (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL DEFAULT 'New Chat',
		provider TEXT NOT NULL DEFAULT 'cies',
		model TEXT NOT NULL DEFAULT 'cies-llm-v1',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
	CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

	CREATE TABLE IF NOT EXISTS messages (
		id TEXT PRIMARY KEY,
		conversation_id TEXT NOT NULL,
		role TEXT NOT NULL,
		content TEXT NOT NULL,
		token_usage TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
	CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

	CREATE TABLE IF NOT EXISTS user_settings (
		id TEXT PRIMARY KEY,
		user_id TEXT UNIQUE NOT NULL,
		theme TEXT NOT NULL DEFAULT 'system',
		default_provider TEXT NOT NULL DEFAULT 'cies',
		default_model TEXT NOT NULL DEFAULT 'cies-llm-v1',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
	`
	_, err := db.Exec(schema)
	if err != nil {
		return err
	}
	_, _ = db.Exec(`ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''`)
	return nil
}

// ==========================================
// User Repository
// ==========================================

type SqliteUserRepository struct {
	db *sql.DB
}

func NewSqliteUserRepository(db *sql.DB) *SqliteUserRepository {
	return &SqliteUserRepository{db: db}
}

func (r *SqliteUserRepository) Create(ctx context.Context, u *model.User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now
	if u.Username == "" {
		u.Username = "@" + u.Name
	}

	query := `INSERT INTO users (id, name, username, email, password_hash, created_at, updated_at) 
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, u.ID.String(), u.Name, u.Username, u.Email, u.PasswordHash, u.CreatedAt, u.UpdatedAt)
	return err
}

func (r *SqliteUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `SELECT id, name, COALESCE(username, ''), email, password_hash, created_at, updated_at FROM users WHERE id = ?`
	var u model.User
	var idStr string
	err := r.db.QueryRowContext(ctx, query, id.String()).Scan(&idStr, &u.Name, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	u.ID, _ = uuid.Parse(idStr)
	return &u, nil
}

func (r *SqliteUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `SELECT id, name, COALESCE(username, ''), email, password_hash, created_at, updated_at FROM users WHERE email = ?`
	var u model.User
	var idStr string
	err := r.db.QueryRowContext(ctx, query, email).Scan(&idStr, &u.Name, &u.Username, &u.Email, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	u.ID, _ = uuid.Parse(idStr)
	return &u, nil
}

func (r *SqliteUserRepository) Update(ctx context.Context, u *model.User) error {
	u.UpdatedAt = time.Now()
	query := `UPDATE users SET name = ?, username = ?, password_hash = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, u.Name, u.Username, u.PasswordHash, u.UpdatedAt, u.ID.String())
	return err
}

func (r *SqliteUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	idStr := id.String()
	// Cascade delete messages in user's conversations
	_, _ = r.db.ExecContext(ctx, `DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)`, idStr)
	// Delete conversations
	_, _ = r.db.ExecContext(ctx, `DELETE FROM conversations WHERE user_id = ?`, idStr)
	// Delete user settings
	_, _ = r.db.ExecContext(ctx, `DELETE FROM user_settings WHERE user_id = ?`, idStr)
	// Delete user
	query := `DELETE FROM users WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, idStr)
	return err
}

// ==========================================
// Conversation Repository
// ==========================================

type SqliteConversationRepository struct {
	db *sql.DB
}

func NewSqliteConversationRepository(db *sql.DB) *SqliteConversationRepository {
	return &SqliteConversationRepository{db: db}
}

func (r *SqliteConversationRepository) Create(ctx context.Context, c *model.Conversation) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	query := `INSERT INTO conversations (id, user_id, title, provider, model, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, c.ID.String(), c.UserID.String(), c.Title, c.Provider, c.Model, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *SqliteConversationRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error) {
	query := `SELECT id, user_id, title, provider, model, created_at, updated_at FROM conversations WHERE id = ?`
	var c model.Conversation
	var idStr, userStr string
	err := r.db.QueryRowContext(ctx, query, id.String()).Scan(&idStr, &userStr, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("conversation not found")
		}
		return nil, err
	}
	c.ID, _ = uuid.Parse(idStr)
	c.UserID, _ = uuid.Parse(userStr)
	return &c, nil
}

func (r *SqliteConversationRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Conversation, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `SELECT id, user_id, title, provider, model, created_at, updated_at 
	          FROM conversations 
	          WHERE user_id = ? 
	          ORDER BY updated_at DESC 
	          LIMIT ? OFFSET ?`
	rows, err := r.db.QueryContext(ctx, query, userID.String(), limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*model.Conversation, 0)
	for rows.Next() {
		var c model.Conversation
		var idStr, userStr string
		if err := rows.Scan(&idStr, &userStr, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.ID, _ = uuid.Parse(idStr)
		c.UserID, _ = uuid.Parse(userStr)
		list = append(list, &c)
	}
	return list, nil
}

func (r *SqliteConversationRepository) UpdateTitle(ctx context.Context, id uuid.UUID, title string) error {
	query := `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, title, time.Now(), id.String())
	return err
}

func (r *SqliteConversationRepository) UpdateModel(ctx context.Context, id uuid.UUID, provider, modelName string) error {
	query := `UPDATE conversations SET provider = ?, model = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, provider, modelName, time.Now(), id.String())
	return err
}

func (r *SqliteConversationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Cascade delete messages first in SQLite
	_, _ = r.db.ExecContext(ctx, `DELETE FROM messages WHERE conversation_id = ?`, id.String())
	query := `DELETE FROM conversations WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id.String())
	return err
}

func (r *SqliteConversationRepository) Search(ctx context.Context, userID uuid.UUID, q string) ([]*model.Conversation, error) {
	pattern := fmt.Sprintf("%%%s%%", q)
	query := `SELECT DISTINCT c.id, c.user_id, c.title, c.provider, c.model, c.created_at, c.updated_at
	          FROM conversations c
	          LEFT JOIN messages m ON m.conversation_id = c.id
	          WHERE c.user_id = ? AND (c.title LIKE ? OR m.content LIKE ?)
	          ORDER BY c.updated_at DESC
	          LIMIT 20`
	rows, err := r.db.QueryContext(ctx, query, userID.String(), pattern, pattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*model.Conversation, 0)
	for rows.Next() {
		var c model.Conversation
		var idStr, userStr string
		if err := rows.Scan(&idStr, &userStr, &c.Title, &c.Provider, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.ID, _ = uuid.Parse(idStr)
		c.UserID, _ = uuid.Parse(userStr)
		list = append(list, &c)
	}
	return list, nil
}

// ==========================================
// Message Repository
// ==========================================

type SqliteMessageRepository struct {
	db *sql.DB
}

func NewSqliteMessageRepository(db *sql.DB) *SqliteMessageRepository {
	return &SqliteMessageRepository{db: db}
}

func (r *SqliteMessageRepository) Create(ctx context.Context, m *model.Message) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	now := time.Now()
	m.CreatedAt = now
	m.UpdatedAt = now

	var tokenUsageStr sql.NullString
	if len(m.TokenUsage) > 0 {
		tokenUsageStr = sql.NullString{String: string(m.TokenUsage), Valid: true}
	}

	query := `INSERT INTO messages (id, conversation_id, role, content, token_usage, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := r.db.ExecContext(ctx, query, m.ID.String(), m.ConversationID.String(), string(m.Role), m.Content, tokenUsageStr, m.CreatedAt, m.UpdatedAt)
	if err == nil {
		_, _ = r.db.ExecContext(ctx, `UPDATE conversations SET updated_at = ? WHERE id = ?`, now, m.ConversationID.String())
	}
	return err
}

func (r *SqliteMessageRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Message, error) {
	query := `SELECT id, conversation_id, role, content, token_usage, created_at, updated_at FROM messages WHERE id = ?`
	var m model.Message
	var idStr, convStr, roleStr string
	var tokenUsageStr sql.NullString
	err := r.db.QueryRowContext(ctx, query, id.String()).Scan(&idStr, &convStr, &roleStr, &m.Content, &tokenUsageStr, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("message not found")
		}
		return nil, err
	}
	m.ID, _ = uuid.Parse(idStr)
	m.ConversationID, _ = uuid.Parse(convStr)
	m.Role = model.MessageRole(roleStr)
	if tokenUsageStr.Valid {
		m.TokenUsage = json.RawMessage(tokenUsageStr.String)
	}
	return &m, nil
}

func (r *SqliteMessageRepository) ListByConversationID(ctx context.Context, convID uuid.UUID) ([]*model.Message, error) {
	query := `SELECT id, conversation_id, role, content, token_usage, created_at, updated_at 
	          FROM messages 
	          WHERE conversation_id = ? 
	          ORDER BY created_at ASC`
	rows, err := r.db.QueryContext(ctx, query, convID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]*model.Message, 0)
	for rows.Next() {
		var m model.Message
		var idStr, convStr, roleStr string
		var tokenUsageStr sql.NullString
		if err := rows.Scan(&idStr, &convStr, &roleStr, &m.Content, &tokenUsageStr, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		m.ID, _ = uuid.Parse(idStr)
		m.ConversationID, _ = uuid.Parse(convStr)
		m.Role = model.MessageRole(roleStr)
		if tokenUsageStr.Valid {
			m.TokenUsage = json.RawMessage(tokenUsageStr.String)
		}
		list = append(list, &m)
	}
	return list, nil
}

func (r *SqliteMessageRepository) UpdateContent(ctx context.Context, id uuid.UUID, content string) error {
	query := `UPDATE messages SET content = ?, updated_at = ? WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, content, time.Now(), id.String())
	return err
}

func (r *SqliteMessageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM messages WHERE id = ?`
	_, err := r.db.ExecContext(ctx, query, id.String())
	return err
}

func (r *SqliteMessageRepository) DeleteAfter(ctx context.Context, convID uuid.UUID, msgID uuid.UUID) error {
	msg, err := r.GetByID(ctx, msgID)
	if err != nil {
		return err
	}
	query := `DELETE FROM messages WHERE conversation_id = ? AND created_at > ?`
	_, err = r.db.ExecContext(ctx, query, convID.String(), msg.CreatedAt)
	return err
}

// ==========================================
// User Settings Repository
// ==========================================

type SqliteSettingsRepository struct {
	db *sql.DB
}

func NewSqliteSettingsRepository(db *sql.DB) *SqliteSettingsRepository {
	return &SqliteSettingsRepository{db: db}
}

func (r *SqliteSettingsRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserSettings, error) {
	query := `SELECT id, user_id, theme, default_provider, default_model, created_at, updated_at 
	          FROM user_settings 
	          WHERE user_id = ?`
	var s model.UserSettings
	var idStr, userStr string
	err := r.db.QueryRowContext(ctx, query, userID.String()).Scan(&idStr, &userStr, &s.Theme, &s.DefaultProvider, &s.DefaultModel, &s.CreatedAt, &s.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.UserSettings{
				UserID:          userID,
				Theme:           "system",
				DefaultProvider: "cies",
				DefaultModel:    "cies-llm-v1",
			}, nil
		}
		return nil, err
	}
	s.ID, _ = uuid.Parse(idStr)
	s.UserID, _ = uuid.Parse(userStr)
	return &s, nil
}

func (r *SqliteSettingsRepository) Upsert(ctx context.Context, s *model.UserSettings) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now()
	s.UpdatedAt = now
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}

	query := `INSERT INTO user_settings (id, user_id, theme, default_provider, default_model, created_at, updated_at)
	          VALUES (?, ?, ?, ?, ?, ?, ?)
	          ON CONFLICT(user_id) DO UPDATE SET
	              theme = excluded.theme,
	              default_provider = excluded.default_provider,
	              default_model = excluded.default_model,
	              updated_at = excluded.updated_at`
	_, err := r.db.ExecContext(ctx, query, s.ID.String(), s.UserID.String(), s.Theme, s.DefaultProvider, s.DefaultModel, s.CreatedAt, s.UpdatedAt)
	return err
}
