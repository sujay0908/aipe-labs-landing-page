import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { enrollments } from "@/db/schema";

export const CURRENT_COHORT = "cohort-1";

/**
 * Gate for every /learn page. Call it from each page (not only the layout):
 * layouts are skipped on client-side navigation, so a layout-only check
 * can be bypassed.
 */
export async function requireMember(callbackPath: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const paid = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, "paid")))
    .limit(1);

  // Not a paying member: send to Apply. Becomes /apply once #2 ships.
  if (paid.length === 0) redirect("/#apply");

  return session!.user!;
}
