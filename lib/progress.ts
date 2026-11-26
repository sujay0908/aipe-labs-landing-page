import "server-only";
import type { Course } from "./content";
import { db } from "./db";

export async function completedLessons(userId: string): Promise<Set<string>> {
  const rows = await db()`select lesson_slug from lesson_progress where user_id = ${userId}`;
  return new Set(rows.map((r) => r.lesson_slug as string));
}

/** Marks a lesson done, or un-marks it if already done. Returns the new state. */
export async function toggleLesson(userId: string, lessonId: string): Promise<boolean> {
  const removed = await db()`
    delete from lesson_progress where user_id = ${userId} and lesson_slug = ${lessonId} returning 1`;
  if (removed.length > 0) return false;
  await db()`
    insert into lesson_progress (user_id, lesson_slug) values (${userId}, ${lessonId})
    on conflict do nothing`;
  return true;
}

export async function rememberLesson(userId: string, lessonId: string): Promise<void> {
  await db()`update users set last_lesson = ${lessonId} where id = ${userId} and last_lesson is distinct from ${lessonId}`;
}

export function courseProgress(course: Course, done: Set<string>) {
  const total = course.lessons.length;
  const completed = course.lessons.filter((l) => done.has(l.id)).length;
  return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
}
