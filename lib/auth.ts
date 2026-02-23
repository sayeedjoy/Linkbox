import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function currentUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getAuthOptional() {
  return getServerSession(authOptions);
}
