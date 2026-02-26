import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromRequest } from "@/lib/get-user";

export const GET = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = user.id;

  const userConversations = await db.query.conversations.findMany({
    where: eq(conversations.userId, userId),
    orderBy: [desc(conversations.updatedAt)],
  });

  return NextResponse.json(userConversations);
};
