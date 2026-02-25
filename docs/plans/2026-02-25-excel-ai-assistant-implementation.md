# Assistant IA Excel — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer un add-in Excel avec chatbot IA pour assister les experts-comptables, intégrant Microsoft SSO, historique de conversations et streaming OpenAI.

**Architecture:** App Next.js unique hébergée sur Vercel. Le task pane Excel charge `/taskpane` dans un iframe. L'API `/api/chat` reçoit les données Excel + message, appelle OpenAI en streaming. Auth Microsoft SSO via NextAuth.js. Persistance des conversations dans Vercel Postgres.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind CSS, OpenAI SDK, @microsoft/office-js, NextAuth.js (Azure AD), Vercel Postgres, Drizzle ORM.

---

### Task 1: Initialiser le projet Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/styles/globals.css`, `.env.local`, `.gitignore`

**Step 1: Créer le projet Next.js**

Run:
```bash
cd /Users/evandavison/IdeaProjects/ia-excel
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Répondre "Yes" aux prompts par défaut. Si le dossier `docs/` est détecté, confirmer.

**Step 2: Vérifier que le projet démarre**

Run: `npm run dev`
Expected: Le serveur démarre sur `http://localhost:3000` sans erreurs.

**Step 3: Configurer `.env.local`**

Créer `.env.local` à la racine :
```env
OPENAI_API_KEY=sk-xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=xxx
```

**Step 4: Vérifier `.gitignore`**

S'assurer que `.env*` est bien dans `.gitignore` (Next.js l'inclut par défaut).

**Step 5: Initialiser git et commit**

```bash
git init
git add .
git commit -m "chore: initialisation du projet Next.js"
```

---

### Task 2: Installer les dépendances

**Files:**
- Modify: `package.json`

**Step 1: Installer les dépendances de production**

Run:
```bash
npm install openai next-auth @auth/core drizzle-orm @vercel/postgres
```

**Step 2: Installer les dépendances de développement**

Run:
```bash
npm install -D drizzle-kit @types/office-js
```

Note : `office.js` sera chargé via CDN dans le layout du taskpane (recommandation Microsoft), pas en npm. `@types/office-js` fournit uniquement le typage TypeScript.

**Step 3: Vérifier que le build passe**

Run: `npm run build`
Expected: Build réussi sans erreurs.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: ajout des dépendances (openai, next-auth, drizzle, office-js)"
```

---

### Task 3: Définir les types TypeScript

**Files:**
- Create: `src/types/index.ts`

**Step 1: Créer les types partagés**

```typescript
// src/types/index.ts

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  excelData: ExcelData | null;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExcelData {
  activeSheet: SheetData;
  selection: SelectionData | null;
  workbookSheets: string[];
}

export interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface SelectionData {
  range: string;
  startRow: number;
  startCol: number;
}

export interface ChatRequest {
  message: string;
  conversationId: string | null;
  excelData: ExcelData | null;
}

export interface ConversationWithLastMessage extends Conversation {
  lastMessage: string | null;
}
```

**Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur TypeScript.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): définition des types partagés"
```

---

### Task 4: Configurer la base de données (Drizzle + Vercel Postgres)

**Files:**
- Create: `src/lib/db.ts`, `src/lib/schema.ts`, `drizzle.config.ts`

**Step 1: Créer le schéma Drizzle**

```typescript
// src/lib/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  microsoftId: text("microsoft_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  excelData: jsonb("excel_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 2: Créer le client DB**

```typescript
// src/lib/db.ts
import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "@/lib/schema";

export const db = drizzle(sql, { schema });
```

**Step 3: Créer la config Drizzle**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 5: Commit**

```bash
git add src/lib/db.ts src/lib/schema.ts drizzle.config.ts
git commit -m "feat(db): schéma de base de données (users, conversations, messages)"
```

---

### Task 5: Configurer l'authentification Microsoft SSO

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts`

**Step 1: Créer la config NextAuth**

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: "common",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email || !user.name) return false;

      const existing = await db.query.users.findFirst({
        where: eq(users.microsoftId, account.providerAccountId),
      });

      if (!existing) {
        await db.insert(users).values({
          email: user.email,
          name: user.name,
          microsoftId: account.providerAccountId,
        });
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.microsoftId, token.sub),
        });
        if (dbUser) {
          (session.user as Record<string, unknown>).id = dbUser.id;
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
```

**Step 2: Créer la route NextAuth**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/
git commit -m "feat(auth): authentification Microsoft SSO via NextAuth.js"
```

---

### Task 6: Créer le system prompt expert-comptable

**Files:**
- Create: `src/lib/system-prompt.ts`

**Step 1: Écrire le system prompt**

```typescript
// src/lib/system-prompt.ts
import { ExcelData } from "@/types";

const BASE_PROMPT = `Tu es un assistant expert-comptable français intégré à Microsoft Excel.

Tes compétences :
- Maîtrise du Plan Comptable Général (PCG) français
- Règles fiscales françaises (TVA, IS, IR, BIC, BNC, etc.)
- Normes comptables françaises et IFRS
- Vérification de cohérence comptable (équilibre débit/crédit, totaux, rapprochements)
- Analyse de données financières dans des feuilles Excel

Ton comportement :
- Tu réponds toujours en français
- Quand tu reçois des données Excel, tu les analyses avant de répondre
- Tu signales les anomalies détectées (déséquilibres, montants inhabituels, doublons, erreurs de comptes)
- Tu restes prudent dans tes affirmations : utilise "il semble que", "je recommande de vérifier avec votre expert-comptable" pour les sujets sensibles
- Tu ne te substitues pas à un expert-comptable diplômé
- Tu structures tes réponses clairement avec des listes et des tableaux quand c'est pertinent`;

export const buildSystemPrompt = (excelData: ExcelData | null): string => {
  if (!excelData) return BASE_PROMPT;

  let prompt = BASE_PROMPT + "\n\n--- DONNÉES EXCEL ---\n";
  prompt += `Classeur ouvert avec les feuilles : ${excelData.workbookSheets.join(", ")}\n\n`;
  prompt += `Feuille active : "${excelData.activeSheet.name}"\n`;

  if (excelData.activeSheet.headers.length > 0) {
    prompt += `Colonnes : ${excelData.activeSheet.headers.join(" | ")}\n`;
  }

  prompt += `\nDonnées (${excelData.activeSheet.rows.length} lignes) :\n`;

  for (const row of excelData.activeSheet.rows) {
    prompt += row.join(" | ") + "\n";
  }

  if (excelData.selection) {
    prompt += `\nL'utilisateur a sélectionné la plage : ${excelData.selection.range}\n`;
  }

  prompt += "\n--- FIN DES DONNÉES EXCEL ---";

  return prompt;
};
```

**Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 3: Commit**

```bash
git add src/lib/system-prompt.ts
git commit -m "feat(ia): system prompt expert-comptable avec injection de données Excel"
```

---

### Task 7: Créer l'endpoint API chat avec streaming OpenAI

**Files:**
- Create: `src/lib/openai.ts`, `src/app/api/chat/route.ts`

**Step 1: Créer le client OpenAI**

```typescript
// src/lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

**Step 2: Créer la route API chat**

```typescript
// src/app/api/chat/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { ChatRequest } from "@/types";

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || !("id" in session.user)) {
    return new Response("Non autorisé", { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;
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

  // Construire les messages pour OpenAI
  const systemPrompt = buildSystemPrompt(excelData);
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Appel OpenAI en streaming
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
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
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/lib/openai.ts src/app/api/chat/route.ts
git commit -m "feat(api): endpoint chat avec streaming OpenAI et sauvegarde en DB"
```

---

### Task 8: Créer l'API conversations (CRUD)

**Files:**
- Create: `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/route.ts`

**Step 1: Route GET/POST conversations**

```typescript
// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || !("id" in session.user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

  const userConversations = await db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: [desc(conversations.updatedAt)],
  });

  return NextResponse.json(userConversations);
};
```

**Step 2: Route GET/DELETE conversation par ID**

```typescript
// src/app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !("id" in session.user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

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

export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !("id" in session.user)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = (session.user as Record<string, unknown>).id as string;

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
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/app/api/conversations/
git commit -m "feat(api): CRUD conversations (liste, détail, suppression)"
```

---

### Task 9: Créer le helper Excel (office.js)

**Files:**
- Create: `src/lib/excel.ts`

**Step 1: Écrire les fonctions de lecture Excel**

```typescript
// src/lib/excel.ts
/// <reference types="office-js" />
import { ExcelData, SheetData, SelectionData } from "@/types";

export const readExcelData = async (): Promise<ExcelData | null> => {
  if (typeof Office === "undefined" || !Office.context) return null;

  return new Promise((resolve) => {
    Excel.run(async (context) => {
      const workbook = context.workbook;
      const activeSheet = workbook.worksheets.getActiveWorksheet();
      const sheets = workbook.worksheets;

      sheets.load("items/name");
      activeSheet.load("name");

      const usedRange = activeSheet.getUsedRange();
      usedRange.load("values, address");

      let selectionData: SelectionData | null = null;
      const selectedRange = context.workbook.getSelectedRange();
      selectedRange.load("address, rowIndex, columnIndex");

      await context.sync();

      const sheetNames = sheets.items.map((s) => s.name);
      const values = usedRange.values as string[][];
      const headers = values.length > 0 ? values[0].map(String) : [];
      const rows = values.slice(1).map((row) => row.map(String));

      if (selectedRange.address) {
        selectionData = {
          range: selectedRange.address,
          startRow: selectedRange.rowIndex,
          startCol: selectedRange.columnIndex,
        };
      }

      const sheetData: SheetData = {
        name: activeSheet.name,
        headers,
        rows,
      };

      resolve({
        activeSheet: sheetData,
        selection: selectionData,
        workbookSheets: sheetNames,
      });
    }).catch(() => {
      resolve(null);
    });
  });
};
```

**Step 2: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur (les types office-js sont fournis par `@types/office-js`).

**Step 3: Commit**

```bash
git add src/lib/excel.ts
git commit -m "feat(excel): helper de lecture des données Excel via office.js"
```

---

### Task 10: Créer les hooks React

**Files:**
- Create: `src/hooks/use-chat.ts`, `src/hooks/use-excel-data.ts`

**Step 1: Créer le hook use-excel-data**

```typescript
// src/hooks/use-excel-data.ts
"use client";

import { useState, useCallback } from "react";
import { ExcelData } from "@/types";
import { readExcelData } from "@/lib/excel";

export const useExcelData = () => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const data = await readExcelData();
    setExcelData(data);
    setIsLoading(false);
    return data;
  }, []);

  return { excelData, isLoading, refreshData };
};
```

**Step 2: Créer le hook use-chat**

```typescript
// src/hooks/use-chat.ts
"use client";

import { useState, useCallback } from "react";
import { Message, ExcelData } from "@/types";

interface UseChatOptions {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

export const useChat = ({ conversationId, onConversationCreated }: UseChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(async (content: string, excelData: ExcelData | null) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? "",
      role: "user",
      content,
      excelData,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversationId ?? "",
      role: "assistant",
      content: "",
      excelData: null,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId,
          excelData,
        }),
      });

      if (!response.ok) throw new Error("Erreur API");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Pas de stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          const parsed = JSON.parse(data);

          if (parsed.conversationId && !conversationId) {
            onConversationCreated?.(parsed.conversationId);
          }

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
            }
            return updated;
          });
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: "Désolé, une erreur est survenue. Veuillez réessayer.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, onConversationCreated]);

  const loadMessages = useCallback((loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  }, []);

  return { messages, isStreaming, sendMessage, loadMessages };
};
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat(hooks): use-chat (streaming) et use-excel-data"
```

---

### Task 11: Créer les composants UI du chat

**Files:**
- Create: `src/components/ui/chat-message.tsx`, `src/components/ui/chat-input.tsx`, `src/components/ui/loading-dots.tsx`

**Step 1: Composant loading-dots**

```tsx
// src/components/ui/loading-dots.tsx
"use client";

export const LoadingDots = () => {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
    </div>
  );
};
```

**Step 2: Composant chat-message**

```tsx
// src/components/ui/chat-message.tsx
"use client";

import { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
};
```

**Step 3: Composant chat-input**

```tsx
// src/components/ui/chat-input.tsx
"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white p-3">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="Posez votre question..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        Envoyer
      </button>
    </div>
  );
};
```

**Step 4: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): composants chat (message, input, loading)"
```

---

### Task 12: Créer les sections (chat container + liste conversations)

**Files:**
- Create: `src/components/sections/chat-container.tsx`, `src/components/sections/conversation-list.tsx`

**Step 1: Composant conversation-list**

```tsx
// src/components/sections/conversation-list.tsx
"use client";

import { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export const ConversationList = ({
  conversations,
  activeId,
  onSelect,
  onNew,
}: ConversationListProps) => {
  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`w-full border-b border-gray-100 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100 ${
              activeId === conv.id ? "bg-blue-50 font-medium" : ""
            }`}
          >
            <p className="truncate">{conv.title}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {new Date(conv.updatedAt).toLocaleDateString("fr-FR")}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
```

**Step 2: Composant chat-container**

```tsx
// src/components/sections/chat-container.tsx
"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ui/chat-message";
import { ChatInput } from "@/components/ui/chat-input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { Message } from "@/types";

interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  onSend: (message: string) => void;
}

export const ChatContainer = ({ messages, isStreaming, onSend }: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-gray-400">
              <p className="text-lg font-medium">Assistant Comptable IA</p>
              <p className="mt-1 text-sm">Posez une question ou demandez une analyse de vos données Excel.</p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isStreaming && messages[messages.length - 1]?.content === "" && <LoadingDots />}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
};
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/components/sections/
git commit -m "feat(ui): chat container et liste des conversations"
```

---

### Task 13: Créer la page taskpane (point d'entrée Excel)

**Files:**
- Create: `src/app/taskpane/layout.tsx`, `src/app/taskpane/page.tsx`

**Step 1: Créer le layout taskpane**

Le layout charge `office.js` via CDN (recommandation Microsoft) et adapte le HTML pour le panneau Excel.

```tsx
// src/app/taskpane/layout.tsx
import Script from "next/script";
import "@/styles/globals.css";

export const metadata = {
  title: "Assistant Comptable IA",
};

const TaskpaneLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="fr">
      <head>
        <Script
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="h-screen overflow-hidden bg-white">
        {children}
      </body>
    </html>
  );
};

export default TaskpaneLayout;
```

**Step 2: Créer la page taskpane**

```tsx
// src/app/taskpane/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import { signIn } from "next-auth/react";
import { ChatContainer } from "@/components/sections/chat-container";
import { ConversationList } from "@/components/sections/conversation-list";
import { useChat } from "@/hooks/use-chat";
import { useExcelData } from "@/hooks/use-excel-data";
import { Conversation, Message } from "@/types";

const TaskpaneContent = () => {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  const { refreshData } = useExcelData();

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id);
    fetchConversations();
  }, []);

  const { messages, isStreaming, sendMessage, loadMessages } = useChat({
    conversationId: activeConversationId,
    onConversationCreated: handleConversationCreated,
  });

  const fetchConversations = async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status]);

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setShowSidebar(false);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      loadMessages(data.messages as Message[]);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    loadMessages([]);
    setShowSidebar(false);
  };

  const handleSend = async (content: string) => {
    const excelData = await refreshData();
    sendMessage(content, excelData);
  };

  // Écran de chargement
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-400">Chargement...</p>
      </div>
    );
  }

  // Écran de connexion
  if (status === "unauthenticated") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-lg font-semibold text-gray-900">Assistant Comptable IA</h1>
        <p className="text-center text-sm text-gray-500">
          Connectez-vous avec votre compte Microsoft pour accéder à l'assistant.
        </p>
        <button
          onClick={() => signIn("azure-ad")}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Se connecter avec Microsoft
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Bouton toggle sidebar sur mobile/taskpane */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="fixed left-2 top-2 z-20 rounded-lg bg-white p-1.5 text-gray-600 shadow-md hover:bg-gray-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar conversations */}
      {showSidebar && (
        <div className="absolute inset-0 z-10 w-64">
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
          />
        </div>
      )}

      {/* Chat principal */}
      <div className="flex-1">
        <ChatContainer
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};

const TaskpanePage = () => {
  return (
    <SessionProvider>
      <TaskpaneContent />
    </SessionProvider>
  );
};

export default TaskpanePage;
```

**Step 3: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: Aucune erreur.

**Step 4: Commit**

```bash
git add src/app/taskpane/
git commit -m "feat(taskpane): page principale du panneau Excel avec auth et chat"
```

---

### Task 14: Créer le manifeste Office Add-in

**Files:**
- Create: `public/manifest.xml`

**Step 1: Créer le fichier manifeste**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp
  xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:type="TaskPaneApp">

  <Id>a1b2c3d4-e5f6-7890-abcd-ef1234567890</Id>
  <Version>1.0.0</Version>
  <ProviderName>DVS Web</ProviderName>
  <DefaultLocale>fr-FR</DefaultLocale>
  <DisplayName DefaultValue="Assistant Comptable IA" />
  <Description DefaultValue="Assistant IA pour experts-comptables, intégré à Excel." />

  <Hosts>
    <Host Name="Workbook" />
  </Hosts>

  <DefaultSettings>
    <SourceLocation DefaultValue="https://ia-excel.vercel.app/taskpane" />
  </DefaultSettings>

  <Permissions>ReadWriteDocument</Permissions>

  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Workbook">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="CommandGroup">
                <Label resid="GroupLabel" />
                <Control xsi:type="Button" id="TaskpaneButton">
                  <Label resid="ButtonLabel" />
                  <Supertip>
                    <Title resid="ButtonLabel" />
                    <Description resid="ButtonTooltip" />
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon16" />
                    <bt:Image size="32" resid="Icon32" />
                    <bt:Image size="80" resid="Icon80" />
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>AssistantPane</TaskpaneId>
                    <SourceLocation resid="TaskpaneUrl" />
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>

    <Resources>
      <bt:Images>
        <bt:Image id="Icon16" DefaultValue="https://ia-excel.vercel.app/assets/icon-16.png" />
        <bt:Image id="Icon32" DefaultValue="https://ia-excel.vercel.app/assets/icon-32.png" />
        <bt:Image id="Icon80" DefaultValue="https://ia-excel.vercel.app/assets/icon-80.png" />
      </bt:Images>
      <bt:Urls>
        <bt:Url id="TaskpaneUrl" DefaultValue="https://ia-excel.vercel.app/taskpane" />
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GroupLabel" DefaultValue="Assistant IA" />
        <bt:String id="ButtonLabel" DefaultValue="Assistant Comptable" />
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="ButtonTooltip" DefaultValue="Ouvrir l'assistant comptable IA pour analyser vos données." />
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
```

Note : Remplacer `https://ia-excel.vercel.app` par l'URL de production réelle après déploiement. Pour le dev local, utiliser `https://localhost:3000`.

**Step 2: Créer les icônes placeholder**

Créer des images PNG simples (16x16, 32x32, 80x80) dans `public/assets/`. Elles pourront être remplacées par un vrai logo plus tard.

**Step 3: Commit**

```bash
git add public/manifest.xml public/assets/
git commit -m "feat(office): manifeste add-in Excel et icônes"
```

---

### Task 15: Configurer next.config.ts pour les headers CORS

**Files:**
- Modify: `next.config.ts`

**Step 1: Ajouter les headers nécessaires pour Office Add-in**

Office.js nécessite certains headers pour fonctionner dans l'iframe Excel.

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/taskpane/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.office.com https://*.office365.com https://*.microsoft.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build réussi.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "fix(config): headers CSP pour iframe Office Add-in"
```

---

### Task 16: Créer la landing page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Page d'accueil simple**

Une landing page basique qui présente le produit. Sera améliorée plus tard.

```tsx
// src/app/page.tsx
const HomePage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Assistant Comptable IA</h1>
      <p className="mt-4 max-w-md text-lg text-gray-600">
        Un assistant intelligent intégré à Excel pour les experts-comptables.
      </p>
      <p className="mt-8 text-sm text-gray-400">
        Chargez le complément dans Excel pour commencer.
      </p>
    </main>
  );
};

export default HomePage;
```

**Step 2: Vérifier le build**

Run: `npm run build`
Expected: Build réussi.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): page d'accueil basique"
```

---

### Task 17: Build final + lint

**Step 1: Lancer le linting**

Run: `npm run lint`
Expected: Aucune erreur (ou seulement des warnings non bloquants).

**Step 2: Lancer le build de production**

Run: `npm run build`
Expected: Build réussi sans erreurs.

**Step 3: Commit final si des corrections ont été nécessaires**

```bash
git add .
git commit -m "fix: corrections lint et build"
```

---

## Prérequis externes (à configurer manuellement)

Ces étapes nécessitent des actions manuelles dans des interfaces web :

1. **Azure AD App Registration** — Créer une app dans le portail Azure pour obtenir `MICROSOFT_CLIENT_ID` et `MICROSOFT_CLIENT_SECRET`. Redirect URI : `https://ia-excel.vercel.app/api/auth/callback/azure-ad`
2. **Vercel Postgres** — Créer une base de données dans le dashboard Vercel et récupérer la `DATABASE_URL`
3. **OpenAI API Key** — Récupérer la clé depuis `platform.openai.com`
4. **Drizzle migration** — Exécuter `npx drizzle-kit push` pour créer les tables en DB
5. **Déploiement Vercel** — Connecter le repo GitHub et configurer les variables d'environnement