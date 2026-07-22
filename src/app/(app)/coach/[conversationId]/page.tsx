"use client";

import { ArrowUp, ChevronLeft, Cpu } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useConversations, useMessages, useSendMessage } from "@/features/coach/hooks";
import { formatRelativeTime } from "@/lib/format";
import type { CoachMessage } from "@/types/models";

const QUICK_PROMPTS = ["¿Qué peso debería usar hoy?", "Analiza mi entrenamiento reciente", "¿Qué músculo llevo más atrasado?", "¿Estoy haciendo demasiado volumen?"];

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`mb-3 max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"} flex flex-col`}>
      <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap ${isUser ? "bg-progress text-bg-deep rounded-br-md" : "bg-surface-raised border border-line-subtle text-ink rounded-bl-md"}`}>
        <p className="text-[15px] leading-5">{message.content}</p>
      </div>
      <p className="text-ink-faint text-[10px] mt-1">{formatRelativeTime(message.createdAt)}</p>
    </div>
  );
}

export default function CoachChatPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { data: conversations = [] } = useConversations();
  const { data: messages = [] } = useMessages(conversationId ?? null);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !conversationId) return;
    setText("");
    await sendMessage.mutateAsync({ conversationId, text: trimmed });
  };

  if (!conversationId) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link href="/coach" className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center text-ink-dim">
          <ChevronLeft size={18} />
        </Link>
        <div className="w-8 h-8 rounded-full bg-ai/20 flex items-center justify-center shrink-0">
          <Cpu size={14} className="text-ai" />
        </div>
        <p className="text-ink text-base font-bold truncate">{conversation?.title ?? "Entrenador IA"}</p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col justify-end">
        {messages.length === 0 ? (
          <div className="pb-4">
            <p className="text-ink-dim text-sm mb-3">Prueba a preguntar:</p>
            <div className="flex flex-col gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="text-left bg-surface border border-line-subtle rounded-2xl px-4 py-3 text-ink-dim text-sm font-medium hover:text-ink">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col pb-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {sendMessage.isPending ? (
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-ai border-t-transparent animate-spin" />
          <span className="text-ink-faint text-xs">Tu entrenador está escribiendo…</span>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2.5 pt-2 shrink-0"
      >
        <div className="flex-1 bg-surface border border-line-subtle rounded-full px-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pregunta algo a tu entrenador…"
            className="w-full bg-transparent text-ink text-[15px] font-medium py-3 outline-none placeholder:text-ink-faint"
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || sendMessage.isPending}
          className="w-11 h-11 rounded-full bg-ai flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <ArrowUp size={18} className="text-white" />
        </button>
      </form>
    </div>
  );
}
