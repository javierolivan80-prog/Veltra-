import { getDb } from "@/src/lib/db/client";
import { generateId } from "@/src/lib/id";
import { enqueueMutation } from "@/src/lib/sync/queue";
import type { CoachMessage, Conversation, MemoryFact, MessageRole } from "@/src/types/models";

function mapConversation(r: any): Conversation {
  return { id: r.id, title: r.title, pinned: !!r.pinned, createdAt: r.created_at, updatedAt: r.updated_at };
}

function mapMessage(r: any): CoachMessage {
  return { id: r.id, conversationId: r.conversation_id, role: r.role, content: r.content, createdAt: r.created_at };
}

export async function listConversations(query?: string): Promise<Conversation[]> {
  const db = await getDb();
  const rows = query
    ? await db.getAllAsync<any>(`SELECT * FROM conversations WHERE title LIKE ? ORDER BY pinned DESC, updated_at DESC`, [`%${query}%`])
    : await db.getAllAsync<any>(`SELECT * FROM conversations ORDER BY pinned DESC, updated_at DESC`);
  return rows.map(mapConversation);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM conversations WHERE id = ?`, [id]);
  return row ? mapConversation(row) : null;
}

export async function createConversation(title: string): Promise<Conversation> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO conversations (id, title, pinned, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`, [id, title, now, now]);
  await enqueueMutation("conversations", id, "upsert");
  return { id, title, pinned: false, createdAt: now, updatedAt: now };
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`, [title, new Date().toISOString(), id]);
  await enqueueMutation("conversations", id, "upsert");
}

export async function togglePinConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE conversations SET pinned = NOT pinned, updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
  await enqueueMutation("conversations", id, "upsert");
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM coach_messages WHERE conversation_id = ?`, [id]);
  await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
  await enqueueMutation("conversations", id, "delete");
}

export async function listMessages(conversationId: string): Promise<CoachMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM coach_messages WHERE conversation_id = ? ORDER BY created_at ASC`, [conversationId]);
  return rows.map(mapMessage);
}

export async function addMessage(conversationId: string, role: MessageRole, content: string): Promise<CoachMessage> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO coach_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`, [
    id,
    conversationId,
    role,
    content,
    now,
  ]);
  await db.runAsync(`UPDATE conversations SET updated_at = ? WHERE id = ?`, [now, conversationId]);
  await enqueueMutation("coach_messages", id, "upsert");
  return { id, conversationId, role, content, createdAt: now };
}

export async function listMemoryFacts(): Promise<MemoryFact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM memory_facts WHERE active = 1 ORDER BY created_at DESC`);
  return rows.map((r) => ({ id: r.id, content: r.content, category: r.category, active: !!r.active, createdAt: r.created_at }));
}

export async function addMemoryFact(content: string, category: MemoryFact["category"]): Promise<MemoryFact> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO memory_facts (id, content, category, active, created_at) VALUES (?, ?, ?, 1, ?)`, [id, content, category, now]);
  await enqueueMutation("memory_facts", id, "upsert");
  return { id, content, category, active: true, createdAt: now };
}
