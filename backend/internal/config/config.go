package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv          string
	AppPort         string
	AppURL          string
	SqlitePath      string
	JWTSecret       string
	CiesModelURL    string
	DefaultProvider string
	DefaultModel    string
}

func Load() *Config {
	_ = godotenv.Load("../.env", ".env")

	return &Config{
		AppEnv:          getEnv("APP_ENV", "development"),
		AppPort:         getEnv("APP_PORT", "8080"),
		AppURL:          getEnv("APP_URL", "http://localhost:8082"),
		SqlitePath:      getEnv("SQLITE_PATH", "data/cies.db"),
		JWTSecret:       getEnv("JWT_SECRET", "super_secret_jwt_key_cies_dev_change_in_production_123456789"),
		CiesModelURL:    getEnv("CIES_MODEL_URL", "http://localhost:8081"),
		DefaultProvider: "cies",
		DefaultModel:    "cies-llm-v1",
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
