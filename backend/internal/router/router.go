package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"cies/backend/internal/handler"
	"cies/backend/internal/middleware"
	"cies/backend/internal/service"
)

type RouterParams struct {
	AuthHandler         *handler.AuthHandler
	ConvHandler         *handler.ConversationHandler
	ChatHandler         *handler.ChatHandler
	ProviderHandler     *handler.ProviderHandler
	AuthService         *service.AuthService
	ConversationService *service.ConversationService
}

func SetupRouter(p RouterParams) http.Handler {
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:8082", "http://127.0.0.1:8082",
			"http://localhost:8080", "http://127.0.0.1:8080",
			"http://localhost:3000", "http://127.0.0.1:3000",
			"http://localhost:5173", "http://127.0.0.1:5173",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Guest-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","name":"CiesGPT API"}`))
	})

	r.Route("/api/v1", func(api chi.Router) {
		// Public Auth Endpoints
		api.Post("/auth/register", p.AuthHandler.Register)
		api.Post("/auth/login", p.AuthHandler.Login)
		api.Post("/auth/logout", p.AuthHandler.Logout)

		// Public Provider Endpoints
		api.Get("/providers", p.ProviderHandler.ListProviders)
		api.Get("/models", p.ProviderHandler.ListModels)
		api.Get("/providers/status", p.ProviderHandler.CheckStatus)

		// Protected Endpoints
		api.Group(func(protected chi.Router) {
			protected.Use(middleware.AuthMiddleware(p.AuthService))

			// Current User
			protected.Get("/auth/me", p.AuthHandler.Me)
			protected.Patch("/auth/me", p.AuthHandler.UpdateProfile)
			protected.Delete("/auth/account", p.AuthHandler.DeleteAccount)

			// Conversations
			protected.Get("/conversations", p.ConvHandler.List)
			protected.Post("/conversations", p.ConvHandler.Create)
			protected.Get("/conversations/search", p.ConvHandler.Search)
			protected.Get("/conversations/{id}", p.ConvHandler.Get)
			protected.Patch("/conversations/{id}", p.ConvHandler.Rename)
			protected.Delete("/conversations/{id}", p.ConvHandler.Delete)

			// Messages & Chat
			protected.Post("/chat", p.ChatHandler.SendMessage)
			protected.Post("/chat/stream", p.ChatHandler.StreamMessage)
			protected.Post("/chat/regenerate", p.ChatHandler.Regenerate)
			protected.Patch("/messages/{id}", p.ChatHandler.EditMessage)
			protected.Delete("/messages/{id}", p.ChatHandler.DeleteMessage)

			// Settings
			protected.Get("/settings", p.ConvHandler.GetSettings)
			protected.Put("/settings", p.ConvHandler.UpdateSettings)
		})
	})

	return r
}
