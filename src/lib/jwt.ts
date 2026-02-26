import { SignJWT, jwtVerify } from "jose";

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant");
  return new TextEncoder().encode(secret);
};

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export const signToken = async (payload: TokenPayload): Promise<string> => {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
};

export const verifyToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
};
