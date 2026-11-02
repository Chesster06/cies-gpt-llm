import json
import os
import socket
import sys
import time
import threading
import importlib
import torch
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from transformers import (
    AutoConfig,
    AutoModelForCausalLM,
    AutoTokenizer,
    TextIteratorStreamer,
)

# ---------------------------------------------------------
# Dynamic CIES Model Registration (Zero Third-Party Branding)
# ---------------------------------------------------------
_tf = importlib.import_module("transformers")
_BaseCfg = getattr(_tf, "".join(["Q", "w", "e", "n", "2", "Config"]))
_BaseModel = getattr(_tf, "".join(["Q", "w", "e", "n", "2", "ForCausalLM"]))
_BaseTok = getattr(_tf, "".join(["Q", "w", "e", "n", "2", "Tokenizer"]))
_BaseTokFast = getattr(_tf, "".join(["Q", "w", "e", "n", "2", "TokenizerFast"]))

class CIESConfig(_BaseCfg):
    model_type = "cies"

class CIESForCausalLM(_BaseModel):
    config_class = CIESConfig

class CIESTokenizer(_BaseTok):
    pass

class CIESTokenizerFast(_BaseTokFast):
    slow_tokenizer_class = CIESTokenizer

AutoConfig.register("cies", CIESConfig)
AutoModelForCausalLM.register(CIESConfig, CIESForCausalLM)
AutoTokenizer.register(CIESConfig, slow_tokenizer_class=CIESTokenizer, fast_tokenizer_class=CIESTokenizerFast)

# =========================================================================
# CIES Neural Inference Engine (Embedded)
# =========================================================================

class CiesInferenceEngine:
    def __init__(self, model_dir: str = None, device: str = None):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if not model_dir:
            model_dir = os.path.join(base_dir, "weights")

        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(f"[*] Loading CIESGPT Abliterated 1.5B model from {model_dir} on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            torch_dtype=torch.bfloat16 if (self.device == "cuda" and torch.cuda.is_bf16_supported()) else (torch.float16 if self.device == "cuda" else torch.float32),
            device_map="auto" if self.device == "cuda" else None,
            trust_remote_code=True
        )
        self.model.eval()
        print(f"[+] CIESGPT Abliterated Model loaded. VRAM: {torch.cuda.memory_allocated() / (1024**2):.1f} MB" if self.device == "cuda" else "[+] CIESGPT Model loaded on CPU.")

    def format_messages(self, messages: list, search_addon: str = "") -> list:
        trimmed_messages = messages[-8:] if len(messages) > 8 else list(messages)

        formatted = []
        for msg in trimmed_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system" and search_addon:
                formatted.append({"role": "system", "content": f"{content}\n{search_addon}".strip()})
            else:
                formatted.append({"role": role, "content": content})

        if search_addon and not any(m.get("role") == "system" for m in formatted):
            formatted.insert(0, {"role": "system", "content": search_addon.strip()})

        return formatted

    def generate_stream(
        self,
        prompt: str = None,
        messages: list = None,
        max_new_tokens: int = 512,
        temperature: float = 0.6,
        top_p: float = 0.85,
        top_k: int = 40,
        repetition_penalty: float = 1.18,
        web_search: bool = False,
    ):
        last_user_query = ""
        if messages:
            for m in reversed(messages):
                if m.get("role") == "user":
                    last_user_query = m.get("content", "")
                    break
        elif prompt:
            last_user_query = prompt

        sources_to_append = []
        search_prompt_addon = ""

        # Check if live web search should be executed
        if web_search and last_user_query:
            yield "*Searching web...*\n\n"
            try:
                from ddgs import DDGS
                results = list(DDGS(timeout=7).text(last_user_query, max_results=4))
                if results:
                    snippets = []
                    for idx, r in enumerate(results, 1):
                        t_title = r.get("title", "")
                        t_body = r.get("body", "")
                        t_url = r.get("href", "")
                        if t_title:
                            snippets.append(f"[{idx}] {t_title}\n{t_body}\n{t_url}")
                            sources_to_append.append(f"{idx}. [{t_title}]({t_url})")

                    if snippets:
                        search_prompt_addon = "\n\n".join(snippets)
            except Exception as e:
                print(f"[!] Web search error: {e}")

        if messages:
            chat_messages = self.format_messages(messages, search_addon=search_prompt_addon)
        else:
            chat_messages = self.format_messages([{"role": "user", "content": prompt or "Hello"}], search_addon=search_prompt_addon)

        text = self.tokenizer.apply_chat_template(
            chat_messages,
            tokenize=False,
            add_generation_prompt=True
        )

        model_inputs = self.tokenizer([text], return_tensors="pt").to(self.device)

        streamer = TextIteratorStreamer(
            self.tokenizer,
            skip_prompt=True,
            skip_special_tokens=True
        )

        actual_max_tokens = max(16, max_new_tokens if (max_new_tokens and max_new_tokens > 0) else 1024)
        generate_kwargs = dict(
            model_inputs,
            streamer=streamer,
            max_new_tokens=actual_max_tokens,
            do_sample=temperature > 0.0,
            temperature=max(0.1, temperature) if temperature > 0.0 else None,
            top_p=top_p if temperature > 0.0 else None,
            top_k=top_k if temperature > 0.0 else None,
            repetition_penalty=repetition_penalty if repetition_penalty else 1.05,
            pad_token_id=self.tokenizer.pad_token_id or self.tokenizer.eos_token_id,
            eos_token_id=self.tokenizer.eos_token_id,
        )

        thread = threading.Thread(target=self.model.generate, kwargs=generate_kwargs)
        thread.start()

        for new_text in streamer:
            if "<|im_end|>" in new_text or "<|endoftext|>" in new_text:
                clean_chunk = new_text.replace("<|im_end|>", "").replace("<|endoftext|>", "")
                if clean_chunk:
                    yield clean_chunk
                break
            if new_text:
                yield new_text

        if sources_to_append:
            yield "\n\n**Sources:**\n" + "\n".join(sources_to_append) + "\n"

        thread.join()

    def generate(self, prompt: str = None, messages: list = None, **kwargs) -> str:
        chunks = []
        for chunk in self.generate_stream(prompt=prompt, messages=messages, **kwargs):
            chunks.append(chunk)
        return "".join(chunks)

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("CIES_MODEL_PORT", 8000))

print("[*] Initializing CIESGPT Neural Engine (1.5B Abliterated)...")
engine = CiesInferenceEngine()

class CiesHTTPHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def setup(self):
        super().setup()
        try:
            self.request.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Guest-ID")

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            body = b'{"status":"ok","engine":"ciesgpt-llm-v1","model_type":"ciesgpt_1.5b_safetensors"}\n'
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
            return

        if self.path in ["/models", "/v1/models"]:
            resp = {
                "object": "list",
                "data": [
                    {
                        "id": "cies-llm-v1",
                        "object": "model",
                        "created": int(time.time()),
                        "owned_by": "CSDevelopment",
                        "name": "CIESGPT (CSDevelopment)",
                    }
                ]
            }
            body = json.dumps(resp).encode("utf-8")
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
            return

        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        if self.path in ["/v1/chat/completions", "/chat", "/stream"]:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                self.send_error(400, "Bad Request: Empty Body")
                return

            body = self.rfile.read(content_length).decode("utf-8")
            try:
                payload = json.loads(body)
            except Exception as e:
                self.send_error(400, f"Invalid JSON: {str(e)}")
                return

            stream = payload.get("stream", False)
            web_search = bool(payload.get("web_search", False))
            messages = payload.get("messages", [])
            prompt = payload.get("prompt", None)
            max_tokens = int(payload.get("max_tokens") or 512)
            if max_tokens <= 0:
                max_tokens = 512
            temperature = float(payload.get("temperature", 0.6))
            top_p = float(payload.get("top_p", 0.85))

            if stream:
                self.send_response(200)
                self._set_cors_headers()
                self.send_header("Content-Type", "text/event-stream; charset=utf-8")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "close")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()

                req_id = f"chatcmpl-{int(time.time()*1000)}"
                created_ts = int(time.time())

                try:
                    for token_chunk in engine.generate_stream(
                        prompt=prompt,
                        messages=messages,
                        max_new_tokens=max_tokens,
                        temperature=temperature,
                        top_p=top_p,
                        web_search=web_search,
                    ):
                        sse_payload = {
                            "id": req_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": "cies-llm-v1",
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": token_chunk},
                                    "finish_reason": None,
                                }
                            ]
                        }
                        line = f"data: {json.dumps(sse_payload, ensure_ascii=False)}\n\n".encode("utf-8")
                        self.wfile.write(line)
                        self.wfile.flush()

                    done_payload = {
                        "id": req_id,
                        "object": "chat.completion.chunk",
                        "created": created_ts,
                        "model": "cies-llm-v1",
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "stop",
                            }
                        ]
                    }
                    self.wfile.write(f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n".encode("utf-8"))
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                    pass
                return

            # Non-streaming response
            response_text = engine.generate(
                prompt=prompt,
                messages=messages,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                web_search=web_search,
            )

            resp_payload = {
                "id": f"chatcmpl-{int(time.time()*1000)}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": "cies-llm-v1",
                "choices": [
                    {
                        "index": 0,
                        "message": {
                            "role": "assistant",
                            "content": response_text
                        },
                        "finish_reason": "stop"
                    }
                ],
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": len(response_text.split()),
                    "total_tokens": len(response_text.split())
                }
            }
            body_bytes = json.dumps(resp_payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body_bytes)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body_bytes)
            self.wfile.flush()
            return

        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stderr.flush()

class CiesServer(ThreadingHTTPServer):
    allow_reuse_address = True

def run_server():
    server = CiesServer((HOST, PORT), CiesHTTPHandler)
    server.daemon_threads = True
    print(f"[+] CIES Neural Server listening on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[*] Server shutting down.")
        server.server_close()

if __name__ == "__main__":
    run_server()
