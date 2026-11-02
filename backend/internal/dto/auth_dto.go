package dto

import "github.com/google/uuid"

type RegisterRequest struct {
	Name     string `json:"name"`
	Username string `json:"username,omitempty"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  UserSummary `json:"user"`
}

type UserSummary struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Username string    `json:"username,omitempty"`
	Email    string    `json:"email"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name,omitempty"`
	Username string `json:"username,omitempty"`
}
