import { getServerSession, type Session } from "next-auth";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth-config";
import { db, users } from "@/lib/db";

type SessionUserRecord = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

async function getExistingSessionUser(
  session: Session | null
): Promise<SessionUserRecord | null> {
  const id = session?.user?.id;
  if (!id) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, image: users.image })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

export async function getVerifiedAuthSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  const user = await getExistingSessionUser(session);

  if (!session || !user) return null;

  return {
    ...session,
    user: {
      ...session.user,
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  };
}

export async function currentUserId(): Promise<string> {
  const session = await getVerifiedAuthSession();
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getAuthOptional() {
  return getVerifiedAuthSession();
}
