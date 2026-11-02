package model

import (
	"time"

	"github.com/google/uuid"
)

type UserSettings struct {
	ID              uuid.UUID `json:"id"`
	UserID          uuid.UUID `json:"user_id"`
	Theme           string    `json:"theme"`
	DefaultProvider string    `json:"default_provider"`
	DefaultModel    string    `json:"default_model"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
