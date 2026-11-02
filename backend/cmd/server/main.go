package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cies/backend/internal/config"
	"cies/backend/internal/handler"
	"cies/backend/internal/provider"
	"cies/backend/internal/provider/cies"
	"cies/backend/internal/repository"
	"cies/backend/internal/router"
	"cies/backend/internal/service"
)

func main() {
	cfg := config.Load()
	log.Printf("Starting CIES Backend server in %s mode on port %s", cfg.AppEnv, cfg.AppPort)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Persistence Setup
	sqliteDB, err := repository.NewSqliteDB(cfg.SqlitePath)
	if err != nil || sqliteDB == nil {
		log.Fatalf("Fatal: Failed to initialize SQLite database at %s: %v", cfg.SqlitePath, err)
	}
	defer sqliteDB.DB.Close()
	log.Printf("Using SQLite persistent database at %s", cfg.SqlitePath)

	userRepo := repository.NewSqliteUserRepository(sqliteDB.DB)
	convRepo := repository.NewSqliteConversationRepository(sqliteDB.DB)
	msgRepo := repository.NewSqliteMessageRepository(sqliteDB.DB)
	settingsRepo := repository.NewSqliteSettingsRepository(sqliteDB.DB)

	// Register In-House CIES AI Provider Exclusively
	registry := provider.NewRegistry()
	registry.Register(cies.New(cfg.CiesModelURL))

	// Services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	convService := service.NewConversationService(convRepo, msgRepo, settingsRepo)
	chatService := service.NewChatService(convRepo, msgRepo, registry, cfg.DefaultProvider, cfg.DefaultModel)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	convHandler := handler.NewConversationHandler(convService)
	chatHandler := handler.NewChatHandler(chatService, msgRepo)
	providerHandler := handler.NewProviderHandler(registry)

	// Router
	r := router.SetupRouter(router.RouterParams{
		AuthHandler:         authHandler,
		ConvHandler:         convHandler,
		ChatHandler:         chatHandler,
		ProviderHandler:     providerHandler,
		AuthService:         authService,
		ConversationService: convService,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.AppPort,
		Handler:      r,
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("CIES Backend API listening on http://localhost:%s", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		fmt.Printf("Server shutdown forced: %v\n", err)
	}
	log.Println("Server exited cleanly.")
}
