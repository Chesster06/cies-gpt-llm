package handler

import (
	"net/http"

	"cies/backend/internal/dto"
	"cies/backend/internal/provider"
)

type ProviderHandler struct {
	registry *provider.Registry
}

func NewProviderHandler(registry *provider.Registry) *ProviderHandler {
	return &ProviderHandler{registry: registry}
}

func (h *ProviderHandler) ListProviders(w http.ResponseWriter, r *http.Request) {
	providers := h.registry.GetAll()
	var response []dto.ProviderInfo

	for _, p := range providers {
		var models []dto.ModelInfo
		for _, m := range p.AvailableModels() {
			models = append(models, dto.ModelInfo{
				ID:      m,
				Name:    m,
				Default: m == p.DefaultModel(),
			})
		}

		response = append(response, dto.ProviderInfo{
			ID:          p.ID(),
			Name:        p.Name(),
			Description: p.Name() + " conversational intelligence engine",
			Available:   p.IsConfigured(),
			Models:      models,
		})
	}

	sendJSON(w, http.StatusOK, response)
}

func (h *ProviderHandler) ListModels(w http.ResponseWriter, r *http.Request) {
	providers := h.registry.GetAll()
	var allModels []map[string]interface{}

	for _, p := range providers {
		for _, m := range p.AvailableModels() {
			allModels = append(allModels, map[string]interface{}{
				"provider_id":   p.ID(),
				"provider_name": p.Name(),
				"model_id":      m,
				"model_name":    m,
				"is_default":    m == p.DefaultModel(),
				"available":     p.IsConfigured(),
			})
		}
	}

	sendJSON(w, http.StatusOK, allModels)
}

func (h *ProviderHandler) CheckStatus(w http.ResponseWriter, r *http.Request) {
	providers := h.registry.GetAll()
	statusMap := make(map[string]interface{})

	for _, p := range providers {
		statusMap[p.ID()] = map[string]interface{}{
			"name":       p.Name(),
			"configured": p.IsConfigured(),
		}
	}

	sendJSON(w, http.StatusOK, statusMap)
}
