import { NextRequest } from "next/server";
import OpenAI from "openai";
import { openai } from "@/lib/openai";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChatRequest } from "@/types";
import { getUserFromRequest } from "@/lib/get-user";

export const POST = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return new Response("Non autorisé", { status: 401 });
  }

  const userId = user.id;
  const body: ChatRequest = await req.json();
  const { message, conversationId, excelData } = body;

  // Créer ou récupérer la conversation
  let convId = conversationId;
  if (!convId) {
    const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
    const [newConv] = await db.insert(conversations).values({
      userId,
      title,
    }).returning();
    convId = newConv.id;
  }

  // Sauvegarder le message utilisateur
  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content: message,
    excelData: excelData ?? undefined,
  });

  // Récupérer l'historique de la conversation
  const history = await db.query.messages.findMany({
    where: eq(messages.conversationId, convId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  // Construire les messages pour OpenAI (limité aux 20 derniers messages)
  const MAX_HISTORY = 20;
  const recentHistory = history.slice(-MAX_HISTORY);
  const systemPrompt = buildSystemPrompt(excelData);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Appel OpenAI en streaming
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: openaiMessages,
    stream: true,
  });

  // Collecter la réponse complète pour la sauvegarder
  let fullResponse = "";

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? "";
        if (content) {
          fullResponse += content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, conversationId: convId })}\n\n`));
        }
      }

      // Sauvegarder la réponse complète de l'assistant
      await db.insert(messages).values({
        conversationId: convId!,
        role: "assistant",
        content: fullResponse,
      });

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
