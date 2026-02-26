import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getUserFromRequest } from "@/lib/get-user";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = user.id;

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const convMessages = await db.query.messages.findMany({
    where: eq(messages.conversationId, id),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  return NextResponse.json({ conversation, messages: convMessages });
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { title } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.userId, user.id)),
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  await db.update(conversations).set({ title: title.trim() }).where(eq(conversations.id, id));

  return NextResponse.json({ success: true });
};

export const DELETE = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = user.id;

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, id), eq(conversations.userId, userId)),
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));

  return NextResponse.json({ success: true });
};
