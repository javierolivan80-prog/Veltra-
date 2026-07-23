"use client";

import { ArrowUp, ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConversationMeals, useFoodMessages, useSendFoodMessage } from "@/features/food/hooks";
import { compressImages } from "@/lib/image";
import { formatRelativeTime } from "@/lib/format";
import type { FoodMeal, FoodMessage } from "@/types/models";

const MAX_PHOTOS = 4;

const QUICK_EXAMPLES = ["Dos tostadas con tomate y un café con leche", "180 g de pollo con 200 g de arroz", "Una hamburguesa con patatas"];

function MacroChips({ meal }: { meal: FoodMeal }) {
  const chips = [
    { label: `${Math.round(meal.calories)} kcal`, color: "#2ce6a0" },
    { label: `${Math.round(meal.protein)}g P`, color: "#4da3ff" },
    { label: `${Math.round(meal.carbs)}g C`, color: "#ffc94d" },
    { label: `${Math.round(meal.fat)}g G`, color: "#a374ff" },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.label}
          className="text-[11px] font-bold px-2 py-1 rounded-lg tabular-nums"
          style={{ color: c.color, backgroundColor: `${c.color}18` }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

function Bubble({ message, meal }: { message: FoodMessage; meal?: FoodMeal }) {
  const isUser = message.role === "user";
  return (
    <div className={`mb-3 max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"} flex flex-col`}>
      {message.photos.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
          {message.photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="Comida" className="w-24 h-24 object-cover rounded-2xl border border-line-subtle" />
          ))}
        </div>
      ) : null}
      {message.content ? (
        <div
          className={`px-4 py-3 rounded-2xl whitespace-pre-wrap ${
            isUser ? "bg-progress text-bg-deep rounded-br-md" : "bg-surface-raised border border-line-subtle text-ink rounded-bl-md"
          }`}
        >
          <p className="text-[15px] leading-5">{message.content}</p>
          {meal ? <MacroChips meal={meal} /> : null}
        </div>
      ) : null}
      <p className="text-ink-faint text-[10px] mt-1">{formatRelativeTime(message.createdAt)}</p>
    </div>
  );
}

export function FoodChat({ conversationId, date }: { conversationId: string; date: string }) {
  const { data: messages = [] } = useFoodMessages(conversationId);
  const { data: meals = [] } = useConversationMeals(conversationId);
  const sendMessage = useSendFoodMessage();

  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [attaching, setAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mealById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMessage.isPending]);

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setAttaching(true);
    try {
      const compressed = await compressImages(files.slice(0, MAX_PHOTOS - photos.length));
      setPhotos((p) => [...p, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setAttaching(false);
    }
  };

  const send = async () => {
    const trimmed = text.trim();
    if ((!trimmed && photos.length === 0) || sendMessage.isPending) return;
    const toSend = { conversationId, date, text: trimmed, photos };
    setText("");
    setPhotos([]);
    await sendMessage.mutateAsync(toSend);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col justify-end">
        {messages.length === 0 ? (
          <div className="pb-4">
            <p className="text-ink-dim text-sm mb-3">Cuéntame qué has comido — con texto, foto, o las dos cosas:</p>
            <div className="flex flex-col gap-2">
              {QUICK_EXAMPLES.map((p) => (
                <button
                  key={p}
                  onClick={() => setText(p)}
                  className="text-left bg-surface border border-line-subtle rounded-2xl px-4 py-3 text-ink-dim text-sm font-medium hover:text-ink"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col pb-3">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} meal={m.mealId ? mealById.get(m.mealId) : undefined} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {sendMessage.isPending ? (
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-progress border-t-transparent animate-spin" />
          <span className="text-ink-faint text-xs">Analizando tu comida…</span>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div className="flex gap-2 mb-2 shrink-0">
          {photos.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Adjunto" className="w-14 h-14 object-cover rounded-xl border border-line-subtle" />
              <button
                onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 pt-2 shrink-0"
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS || attaching}
          className="w-11 h-11 rounded-full bg-surface border border-line-subtle flex items-center justify-center shrink-0 text-ink-dim disabled:opacity-40"
        >
          {attaching ? <span className="w-4 h-4 rounded-full border-2 border-ink-dim border-t-transparent animate-spin" /> : <ImagePlus size={18} />}
        </button>
        <div className="flex-1 bg-surface border border-line-subtle rounded-full px-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué has comido?"
            className="w-full bg-transparent text-ink text-[15px] font-medium py-3 outline-none placeholder:text-ink-faint"
          />
        </div>
        <button
          type="submit"
          disabled={(!text.trim() && photos.length === 0) || sendMessage.isPending}
          className="w-11 h-11 rounded-full bg-progress flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          <ArrowUp size={18} className="text-bg-deep" />
        </button>
      </form>
    </div>
  );
}
