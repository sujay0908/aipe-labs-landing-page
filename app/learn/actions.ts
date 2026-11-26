"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { getCourse } from "@/lib/content";
import { toggleLesson } from "@/lib/progress";

export async function toggleComplete(form: FormData): Promise<void> {
  const member = await requireMember();
  const lessonId = String(form.get("lessonId") ?? "");
  const [course] = lessonId.split("/");
  const exists = (await getCourse(course))?.lessons.some((l) => l.id === lessonId);
  if (!exists) return;
  await toggleLesson(member.id, lessonId);
  revalidatePath("/learn", "layout");
}
