package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"cies/backend/internal/dto"
	"cies/backend/internal/middleware"
	"cies/backend/internal/model"
	"cies/backend/internal/service"
)

type ConversationHandler struct {
	convService *service.ConversationService
}

func NewConversationHandler(convService *service.ConversationService) *ConversationHandler {
	return &ConversationHandler{convService: convService}
}

func (h *ConversationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	conversations, err := h.convService.List(r.Context(), userID, limit, offset)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "LIST_ERROR", err.Error())
		return
	}
	if conversations == nil {
		conversations = []*model.Conversation{}
	}

	sendJSON(w, http.StatusOK, conversations)
}

func (h *ConversationHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req dto.CreateConversationRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	conv, err := h.convService.Create(r.Context(), userID, req)
	if err != nil {
		sendError(w, http.StatusBadRequest, "CREATE_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusCreated, conv)
}

func (h *ConversationHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	convID, err := uuid.Parse(idStr)
	if err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID format")
		return
	}

	conv, messages, err := h.convService.GetByID(r.Context(), userID, convID)
	if err != nil {
		sendError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}
	if messages == nil {
		messages = []*model.Message{}
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"conversation": conv,
		"messages":     messages,
	})
}

func (h *ConversationHandler) Rename(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	convID, err := uuid.Parse(idStr)
	if err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID format")
		return
	}

	var req dto.RenameConversationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Title is required")
		return
	}

	if err := h.convService.Rename(r.Context(), userID, convID, req.Title); err != nil {
		sendError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Conversation renamed successfully"})
}

func (h *ConversationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	convID, err := uuid.Parse(idStr)
	if err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID format")
		return
	}

	if err := h.convService.Delete(r.Context(), userID, convID); err != nil {
		sendError(w, http.StatusInternalServerError, "DELETE_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Conversation deleted successfully"})
}

func (h *ConversationHandler) Search(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	query := r.URL.Query().Get("q")
	if query == "" {
		sendJSON(w, http.StatusOK, []interface{}{})
		return
	}

	results, err := h.convService.Search(r.Context(), userID, query)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "SEARCH_ERROR", err.Error())
		return
	}
	if results == nil {
		results = []*model.Conversation{}
	}

	sendJSON(w, http.StatusOK, results)
}

func (h *ConversationHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	settings, err := h.convService.GetSettings(r.Context(), userID)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "SETTINGS_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, settings)
}

func (h *ConversationHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req dto.UpdateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON")
		return
	}

	settings, err := h.convService.UpdateSettings(r.Context(), userID, req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "SETTINGS_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, settings)
}
