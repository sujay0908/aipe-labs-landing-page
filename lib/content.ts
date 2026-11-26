import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { z } from "zod";

const CONTENT_DIR = path.join(process.cwd(), "content");

const courseSchema = z.object({
  title: z.string(),
  short: z.string().optional(),
  description: z.string(),
  outcome: z.string(),
  order: z.number(),
});

const lessonFrontMatter = z.object({
  title: z.string(),
  day: z.number().int().min(1).max(7).optional(),
  order: z.number().default(1),
  type: z.enum(["text", "video"]).default("text"),
  videoId: z.string().optional(),
  duration: z.string().optional(),
  summary: z.string().optional(),
});

export type Course = z.infer<typeof courseSchema> & { slug: string; lessons: LessonMeta[] };
export type LessonMeta = Omit<z.infer<typeof lessonFrontMatter>, "day"> & {
  /** "<course>/<lesson>", the key used in lesson_progress */
  id: string;
  course: string;
  slug: string;
  day: number;
};
export type Lesson = LessonMeta & { body: string };

/** File name convention: content/<course>/<day>-<slug>.mdx, e.g. 1-setup-and-claude-md.mdx */
function parseFileName(file: string): { day: number | null; slug: string } {
  const slug = file.replace(/\.mdx?$/, "");
  const m = slug.match(/^(\d+)-/);
  return { day: m ? Number(m[1]) : null, slug };
}

async function loadLessonFile(course: string, file: string): Promise<Lesson> {
  const raw = await readFile(path.join(CONTENT_DIR, course, file), "utf8");
  const { data, content } = matter(raw);
  const parsed = lessonFrontMatter.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Bad front matter in content/${course}/${file}: ${parsed.error.message}`);
  }
  const { day: fileDay, slug } = parseFileName(file);
  const day = parsed.data.day ?? fileDay;
  if (!day) throw new Error(`content/${course}/${file}: no day (use "<day>-<slug>.mdx" or front matter "day")`);
  return { ...parsed.data, day, id: `${course}/${slug}`, course, slug, body: content };
}

export const getCourses = cache(async (): Promise<Course[]> => {
  const dirs = (await readdir(CONTENT_DIR, { withFileTypes: true })).filter((d) => d.isDirectory());
  const courses = await Promise.all(
    dirs.map(async (d) => {
      const meta = courseSchema.parse(
        JSON.parse(await readFile(path.join(CONTENT_DIR, d.name, "course.json"), "utf8")),
      );
      const files = (await readdir(path.join(CONTENT_DIR, d.name))).filter((f) => /\.mdx?$/.test(f));
      const lessons = (await Promise.all(files.map((f) => loadLessonFile(d.name, f))))
        .map(({ body: _body, ...m }) => m)
        .sort((a, b) => a.day - b.day || a.order - b.order || a.slug.localeCompare(b.slug));
      return { ...meta, slug: d.name, lessons };
    }),
  );
  return courses.sort((a, b) => a.order - b.order);
});

export async function getCourse(slug: string): Promise<Course | null> {
  return (await getCourses()).find((c) => c.slug === slug) ?? null;
}

export async function getLesson(course: string, slug: string): Promise<Lesson | null> {
  const c = await getCourse(course);
  const meta = c?.lessons.find((l) => l.slug === slug);
  if (!meta) return null;
  const file = (await readdir(path.join(CONTENT_DIR, course))).find((f) => f.replace(/\.mdx?$/, "") === slug);
  return file ? loadLessonFile(course, file) : null;
}

/** Lessons grouped as Day 1..7 (days with no lessons are included, empty). */
export function lessonsByDay(course: Course): { day: number; lessons: LessonMeta[] }[] {
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    lessons: course.lessons.filter((l) => l.day === i + 1),
  }));
}
