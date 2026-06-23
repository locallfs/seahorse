"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const QUICK_REPLIES: { label: string; prompt: string }[] = [
  { label: "Track my order", prompt: "I'd like to check the status of my order." },
  {
    label: "Check if in stock",
    prompt: "Can you check whether an item is in stock?",
  },
  {
    label: "Shipping & returns",
    prompt: "What are your shipping and return policies?",
  },
];

const GREETING =
  "Hi! I'm the Woody's Seahorse assistant. I can help with order status, product stock, and store info like shipping, returns, hours, and location. What can I help you find?";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    let token: string | null = null;
    try {
      token = localStorage.getItem("medusa_auth_token");
    } catch {
      token = null;
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, customerToken: token }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply || "Sorry, please try again." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't reach the server. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-blue-accent hover:bg-blue-light text-white flex items-center justify-center shadow-lg shadow-black/40 border border-white/15 transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm h-[34rem] max-h-[calc(100vh-8rem)] rounded-2xl border border-white/10 bg-ocean-950 shadow-2xl shadow-black/50 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 bg-ocean-900">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#FFD700] font-medium">
              Live Help
            </p>
            <h2 className="text-white font-semibold text-sm">Woody</h2>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <Bubble role="assistant" text={GREETING} />
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {loading && <Typing />}
            {messages.length === 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/90 hover:border-white/35 hover:text-white transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-white/10 p-2.5 flex items-center gap-2 bg-ocean-900"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about orders, stock, shipping..."
              aria-label="Message"
              className="flex-1 bg-ocean-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="h-9 w-9 shrink-0 rounded-lg bg-blue-accent hover:bg-blue-light disabled:opacity-40 text-white flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-accent text-white rounded-br-sm"
            : "bg-ocean-800 text-white/95 border border-white/10 rounded-bl-sm"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="bg-ocean-800 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
