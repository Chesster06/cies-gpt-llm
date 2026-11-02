package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"cies/backend/internal/service"
)

type contextKey string

const (
	UserIDKey  contextKey = "userID"
	EmailKey   contextKey = "email"
	IsGuestKey contextKey = "isGuest"
)

func AuthMiddleware(authService *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			tokenStr := ""

			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			} else {
				if cookie, err := r.Cookie("token"); err == nil {
					tokenStr = cookie.Value
				}
			}

			// If token is provided and valid, authenticate as registered user
			if tokenStr != "" {
				claims, err := authService.ValidateToken(tokenStr)
				if err == nil {
					ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
					ctx = context.WithValue(ctx, EmailKey, claims.Email)
					ctx = context.WithValue(ctx, IsGuestKey, false)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			// Seamless guest support (ChatGPT-like unauthenticated access)
			guestIDStr := strings.TrimSpace(r.Header.Get("X-Guest-ID"))
			var guestID uuid.UUID
			if id, err := uuid.Parse(guestIDStr); err == nil && id != uuid.Nil {
				guestID = id
			} else if guestIDStr != "" {
				guestID = uuid.NewSHA1(uuid.NameSpaceOID, []byte(guestIDStr))
			} else {
				guestID = uuid.New()
			}

			ctx := context.WithValue(r.Context(), UserIDKey, guestID)
			ctx = context.WithValue(ctx, EmailKey, "guest@cies.ai")
			ctx = context.WithValue(ctx, IsGuestKey, true)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	val := ctx.Value(UserIDKey)
	if val == nil {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

func IsGuest(ctx context.Context) bool {
	val := ctx.Value(IsGuestKey)
	if val == nil {
		return false
	}
	isGuest, ok := val.(bool)
	return ok && isGuest
}
