package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"cies/backend/internal/dto"
	"cies/backend/internal/middleware"
	"cies/backend/internal/repository"
	"cies/backend/internal/service"
)

type ChatHandler struct {
	chatService *service.ChatService
	msgRepo     repository.MessageRepository
}

func NewChatHandler(chatService *service.ChatService, msgRepo repository.MessageRepository) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
		msgRepo:     msgRepo,
	}
}

func (h *ChatHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req dto.ChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON")
		return
	}

	userMsg, aiMsg, conv, err := h.chatService.SendMessage(r.Context(), userID, req)
	if err != nil {
		sendError(w, http.StatusInternalServerError, "CHAT_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"conversation": conv,
		"user_message": userMsg,
		"ai_message":   aiMsg,
	})
}

func (h *ChatHandler) StreamMessage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req dto.ChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		sendError(w, http.StatusInternalServerError, "STREAMING_UNSUPPORTED", "Streaming not supported by server")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	streamResult, err := h.chatService.StreamMessage(r.Context(), userID, req)
	if err != nil {
		sendSSE(w, flusher, "error", map[string]string{"code": "STREAM_INIT_ERROR", "message": err.Error()})
		return
	}

	// Send message_start event
	sendSSE(w, flusher, "message_start", map[string]interface{}{
		"conversation_id": streamResult.Conversation.ID,
		"title":           streamResult.Conversation.Title,
		"user_message_id": streamResult.UserMessage.ID,
		"message_id":      streamResult.AssistantMsgID,
	})

	var fullText strings.Builder

	for event := range streamResult.EventChan {
		if event.Err != nil {
			sendSSE(w, flusher, "error", map[string]string{"code": "STREAM_ERROR", "message": event.Err.Error()})
			break
		}

		if event.Delta != "" {
			fullText.WriteString(event.Delta)
			sendSSE(w, flusher, "content_delta", map[string]string{"text": event.Delta})
		}

		if event.FinishReason != "" {
			sendSSE(w, flusher, "message_complete", map[string]string{"finish_reason": event.FinishReason})
			break
		}
	}

	_ = streamResult.SaveFinal(fullText.String())
}

func (h *ChatHandler) Regenerate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	var req dto.RegenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Malformed JSON")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		sendError(w, http.StatusInternalServerError, "STREAMING_UNSUPPORTED", "Streaming not supported by server")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	streamResult, err := h.chatService.Regenerate(r.Context(), userID, req)
	if err != nil {
		sendSSE(w, flusher, "error", map[string]string{"code": "REGENERATE_ERROR", "message": err.Error()})
		return
	}

	sendSSE(w, flusher, "message_start", map[string]interface{}{
		"conversation_id": streamResult.Conversation.ID,
		"message_id":      streamResult.AssistantMsgID,
	})

	var fullText strings.Builder

	for event := range streamResult.EventChan {
		if event.Err != nil {
			sendSSE(w, flusher, "error", map[string]string{"code": "STREAM_ERROR", "message": event.Err.Error()})
			break
		}

		if event.Delta != "" {
			fullText.WriteString(event.Delta)
			sendSSE(w, flusher, "content_delta", map[string]string{"text": event.Delta})
		}

		if event.FinishReason != "" {
			sendSSE(w, flusher, "message_complete", map[string]string{"finish_reason": event.FinishReason})
			break
		}
	}

	_ = streamResult.SaveFinal(fullText.String())
}

func (h *ChatHandler) EditMessage(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	msgID, err := uuid.Parse(idStr)
	if err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_ID", "Invalid message ID format")
		return
	}

	var req dto.EditMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Content) == "" {
		sendError(w, http.StatusBadRequest, "INVALID_REQUEST", "Message content required")
		return
	}

	msg, err := h.msgRepo.GetByID(r.Context(), msgID)
	if err != nil {
		sendError(w, http.StatusNotFound, "NOT_FOUND", "Message not found")
		return
	}

	// Update content
	if err := h.msgRepo.UpdateContent(r.Context(), msgID, req.Content); err != nil {
		sendError(w, http.StatusInternalServerError, "UPDATE_ERROR", err.Error())
		return
	}

	// Trim subsequent messages to keep conversation coherent
	_ = h.msgRepo.DeleteAfter(r.Context(), msg.ConversationID, msgID)

	sendJSON(w, http.StatusOK, map[string]string{"message": "Message edited successfully"})
}

func (h *ChatHandler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r.Context())
	if !ok {
		sendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	idStr := chi.URLParam(r, "id")
	msgID, err := uuid.Parse(idStr)
	if err != nil {
		sendError(w, http.StatusBadRequest, "INVALID_ID", "Invalid message ID format")
		return
	}

	if err := h.msgRepo.Delete(r.Context(), msgID); err != nil {
		sendError(w, http.StatusInternalServerError, "DELETE_ERROR", err.Error())
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{"message": "Message deleted successfully"})
}

func sendSSE(w http.ResponseWriter, flusher http.Flusher, event string, data interface{}) {
	jsonBytes, _ := json.Marshal(data)
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, string(jsonBytes))
	flusher.Flush()
}
