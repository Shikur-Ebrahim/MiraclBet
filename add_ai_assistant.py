import os
import re

# 1. Update config.go
config_path = r'apps\api\internal\config\config.go'
with open(config_path, 'r', encoding='utf-8') as f:
    config = f.read()

config = config.replace(
    'R2PublicURL      string\n}',
    'R2PublicURL      string\n\n    GroqAPIKey string\n}'
)

config = config.replace(
    'R2PublicURL:       getEnv("R2_PUBLIC_URL", ""),',
    'R2PublicURL:       getEnv("R2_PUBLIC_URL", ""),\n\n        GroqAPIKey: getEnv("GROQ_API_KEY", ""),',
)
with open(config_path, 'w', encoding='utf-8') as f:
    f.write(config)

# 2. Create internal/handlers/chat.go
chat_handler = """package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/miraclbet/api/internal/config"
)

type ChatHandler struct {
	cfg *config.Config
}

func NewChatHandler(cfg *config.Config) *ChatHandler {
	return &ChatHandler{cfg: cfg}
}

type ChatRequest struct {
	Message string `json:"message"`
	History []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"history"`
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	if h.cfg.GroqAPIKey == "" {
		http.Error(w, "Groq API key not configured", http.StatusInternalServerError)
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	messages := []map[string]string{
		{
			"role": "system",
			"content": "You are the MiraclBet AI assistant. You help users with sports betting, odds, and platform navigation. Be concise, friendly, and helpful. Format responses in plain text or simple markdown.",
		},
	}

	for _, m := range req.History {
		messages = append(messages, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	messages = append(messages, map[string]string{
		"role":    "user",
		"content": req.Message,
	})

	groqReqBody, _ := json.Marshal(map[string]interface{}{
		"model":    "openai/gpt-oss-120b",
		"messages": messages,
	})

	groqReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(groqReqBody))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	groqReq.Header.Set("Authorization", "Bearer "+h.cfg.GroqAPIKey)
	groqReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(groqReq)
	if err != nil {
		http.Error(w, "Failed to contact Groq API", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Groq API error: %s\\n", string(body))
		
		// Fallback to a different model if the requested one is unavailable
		groqReqBody, _ = json.Marshal(map[string]interface{}{
			"model":    "llama3-8b-8192", // solid fallback
			"messages": messages,
		})
		groqReq, _ = http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(groqReqBody))
		groqReq.Header.Set("Authorization", "Bearer "+h.cfg.GroqAPIKey)
		groqReq.Header.Set("Content-Type", "application/json")
		
		resp2, err2 := client.Do(groqReq)
		if err2 != nil || resp2.StatusCode != http.StatusOK {
			http.Error(w, "Groq API error", http.StatusInternalServerError)
			return
		}
		defer resp2.Body.Close()
		
		w.Header().Set("Content-Type", "application/json")
		io.Copy(w, resp2.Body)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}
"""
os.makedirs(r'apps\api\internal\handlers', exist_ok=True)
with open(r'apps\api\internal\handlers\chat.go', 'w', encoding='utf-8') as f:
    f.write(chat_handler)

# 3. Update router.go
router_path = r'apps\api\internal\router\router.go'
with open(router_path, 'r', encoding='utf-8') as f:
    router = f.read()

router = router.replace(
    'metaHandler := handlers.NewMetaHandler(db)',
    'metaHandler := handlers.NewMetaHandler(db)\n\tchatHandler := handlers.NewChatHandler(cfg)'
)
router = router.replace(
    'r.Get("/meta/leagues", metaHandler.GetLeagues)',
    'r.Get("/meta/leagues", metaHandler.GetLeagues)\n\t\tr.Post("/chat", chatHandler.HandleChat)'
)
with open(router_path, 'w', encoding='utf-8') as f:
    f.write(router)

# 4. Create AiAssistant frontend component
ai_assistant = """'use client';

import React, { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.miraclbet.com:8443';
      const res = await fetch(`${API}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
        }),
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const assistantMsg = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";
      setMessages([...newMessages, { role: 'assistant', content: assistantMsg }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Oops! I am having trouble connecting right now.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 z-50 ${isOpen ? 'scale-0' : 'scale-100 hover:scale-110'}`}
        style={{ background: 'linear-gradient(135deg, #19E66B, #0DB857)', color: '#072414' }}
      >
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-6 right-6 w-[360px] h-[500px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl z-50 transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
        style={{ background: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0 rounded-t-2xl" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#060F1E' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#19E66B', color: '#072414' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a2 2 0 0 1 2 2c0 1.1-.9 2-2 2s-2-.9-2-2a2 2 0 0 1 2-2zm0 6c2.8 0 5 2.2 5 5v3h2v2H5v-2h2v-3c0-2.8 2.2-5 5-5z"/></svg>
            </div>
            <div>
              <div className="font-bold text-white text-sm">MiraclBet AI</div>
              <div className="text-[10px] text-[#19E66B]">Online</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/40 text-xs mt-10">
              <div className="text-4xl mb-3">👋</div>
              Hi! I'm your MiraclBet assistant. Ask me about odds, how to deposit, or how to place a bet!
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user' 
                  ? 'rounded-br-sm text-[#072414]' 
                  : 'rounded-bl-sm text-white/90'
              }`}
              style={{
                background: m.role === 'user' ? '#19E66B' : '#111F35',
                border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: '#111F35', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#060F1E' }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything..."
              className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none text-white placeholder-white/30"
              style={{ background: '#111F35', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
              style={{ background: '#19E66B', color: '#072414' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
"""
os.makedirs(r'apps\web\components\layout', exist_ok=True)
with open(r'apps\web\components\layout\AiAssistant.tsx', 'w', encoding='utf-8') as f:
    f.write(ai_assistant)

# 5. Add AiAssistant to layout.tsx
layout_path = r'apps\web\app\layout.tsx'
with open(layout_path, 'r', encoding='utf-8') as f:
    layout = f.read()

if 'AiAssistant' not in layout:
    layout = layout.replace(
        "import { DesktopSidebar } from '@/components/layout/DesktopSidebar';",
        "import { DesktopSidebar } from '@/components/layout/DesktopSidebar';\nimport { AiAssistant } from '@/components/layout/AiAssistant';"
    )
    layout = layout.replace(
        "<BottomNav />",
        "<BottomNav />\n        <AiAssistant />"
    )
    with open(layout_path, 'w', encoding='utf-8') as f:
        f.write(layout)
