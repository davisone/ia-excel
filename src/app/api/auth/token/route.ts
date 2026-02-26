import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Endpoint appelé depuis la popup OAuth (où les cookies fonctionnent)
// Retourne un JWT custom utilisable dans l'iframe Excel Online
export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const token = await signToken({
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
  });

  return NextResponse.json({ token });
};
