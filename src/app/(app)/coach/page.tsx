"use client";

import { Bookmark, Edit, MoreHorizontal, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/design-system/components/Card";
import { EmptyState } from "@/design-system/components/EmptyState";
import { useConversations, useCreateConversation, useDeleteConversation, useRenameConversation, useTogglePinConversation } from "@/features/coach/hooks";
import { formatRelativeTime } from "@/lib/format";
import type { Conversation } from "@/types/models";

export default function CoachListPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: conversations = [] } = useConversations(query);
  const createConversation = useCreateConversation();
  const renameConversation = useRenameConversation();
  const togglePin = useTogglePinConversation();
  const deleteConversation = useDeleteConversation();
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const openNew = async () => {
    const conv = await createConversation.mutateAsync("Nueva conversación");
    router.push(`/coach/${conv.id}`);
  };

  const rename = (conv: Conversation) => {
    const title = prompt("Renombrar conversación", conv.title);
    if (title) renameConversation.mutate({ id: conv.id, title });
    setMenuFor(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-ink text-2xl font-display">Entrenador IA</h1>
          <p className="text-ink-dim text-sm mt-0.5">Conoce tu historial completo</p>
        </div>
        <button onClick={openNew} className="w-10 h-10 rounded-full bg-ai flex items-center justify-center">
          <Edit size={16} className="text-white" />
        </button>
      </div>

      <div className="flex items-center bg-surface border border-line-subtle rounded-2xl px-4">
        <Search size={15} className="text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar conversaciones…"
          className="flex-1 bg-transparent text-ink text-base font-medium py-3 ml-2.5 outline-none placeholder:text-ink-faint"
        />
      </div>

      {conversations.length === 0 ? (
        <Card raised>
          <EmptyState
            title="Empieza una conversación"
            description="Pregúntale a tu entrenador sobre tu progreso, tu próxima rutina o cualquier duda — conoce todo tu historial real."
            actionLabel="Nueva conversación"
            onAction={openNew}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {conversations.map((conv) => (
            <Card key={conv.id} raised className="relative">
              <Link href={`/coach/${conv.id}`} className="block pr-8">
                <div className="flex items-center gap-1.5">
                  {conv.pinned ? <Bookmark size={12} className="text-ai fill-ai" /> : null}
                  <p className="text-ink text-base font-semibold truncate">{conv.title}</p>
                </div>
                <p className="text-ink-faint text-xs mt-1">{formatRelativeTime(conv.updatedAt)}</p>
              </Link>
              <button onClick={() => setMenuFor(menuFor === conv.id ? null : conv.id)} className="absolute top-5 right-5 text-ink-faint">
                <MoreHorizontal size={18} />
              </button>
              {menuFor === conv.id ? (
                <div className="absolute top-12 right-5 z-10 bg-surface border border-line-subtle rounded-xl overflow-hidden shadow-xl">
                  <button
                    className="block w-full text-left px-4 py-2.5 text-sm text-ink-dim hover:text-ink whitespace-nowrap"
                    onClick={() => {
                      togglePin.mutate(conv.id);
                      setMenuFor(null);
                    }}
                  >
                    {conv.pinned ? "Desfijar" : "Fijar"}
                  </button>
                  <button className="block w-full text-left px-4 py-2.5 text-sm text-ink-dim hover:text-ink whitespace-nowrap" onClick={() => rename(conv)}>
                    Renombrar
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2.5 text-sm text-danger whitespace-nowrap"
                    onClick={() => {
                      deleteConversation.mutate(conv.id);
                      setMenuFor(null);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
