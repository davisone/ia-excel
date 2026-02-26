import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken, TokenPayload } from "@/lib/jwt";
import { NextRequest } from "next/server";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// Récupère l'utilisateur via cookies NextAuth OU header Authorization
export const getUserFromRequest = async (req: NextRequest): Promise<AuthUser | null> => {
  // Méthode 1 : session NextAuth (cookies — fonctionne en accès direct navigateur)
  const session = await getServerSession(authOptions);
  if (session?.user && "id" in session.user) {
    return {
      id: (session.user as Record<string, unknown>).id as string,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
    };
  }

  // Méthode 2 : token JWT dans le header Authorization (fonctionne dans l'iframe Excel)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload: TokenPayload | null = await verifyToken(token);
    if (payload) {
      return {
        id: payload.userId,
        email: payload.email,
        name: payload.name,
      };
    }
  }

  return null;
};
