"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setInput("");

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: text },
    ];
    setMessages(nextMessages);

    try {
      const payload = {
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Request failed");
      }
      const data = await res.json();
      const assistantContent: string = data?.message?.content || "";
      setMessages(msgs => [...msgs, { id: crypto.randomUUID(), role: "assistant", content: assistantContent }]);
    } catch (err: unknown) {
      setMessages(msgs => [
        ...msgs,
        { id: crypto.randomUUID(), role: "assistant", content: "Ошибка: не удалось получить ответ." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const placeholder = useMemo(() => (loading ? "Генерирую ответ..." : "Напишите сообщение..."), [loading]);

  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr auto", height: "calc(100dvh - 2rem)", gap: 12, padding: 12 }}>
      <div ref={listRef} style={{ overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        {messages.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Новый чат. Спросите что-нибудь…</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{
                background: m.role === "user" ? "#eef2ff" : "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 10
              }}>
                <strong style={{ color: "#374151" }}>{m.role === "user" ? "Вы" : "Ассистент"}</strong>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void sendMessage(); }} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" }}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: "10px 14px", borderRadius: 8, background: "#111827", color: "white" }}>
          {loading ? "Отправка..." : "Отправить"}
        </button>
      </form>
    </div>
  );
}


