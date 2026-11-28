import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export const COURSES = [
  { slug: "claude-code", title: "Claude Code Engineering" },
  { slug: "codex", title: "Codex Engineering" },
  { slug: "marketing", title: "Marketing for Founders" },
  { slug: "scalable-engineering", title: "Scalable Engineering for Founders & Indie Hackers" },
] as const;

export type Course = (typeof COURSES)[number];

export type LessonMeta = {
  course: string;
  slug: string; // file name without extension, e.g. "1-setup"
  day: number;
  title: string;
  order: number;
  type: "text" | "video";
  videoId?: string;
};

export type Lesson = LessonMeta & { body: string };

const FILE_RE = /^(\d+)-[a-z0-9-]+\.mdx?$/;

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

function readLesson(course: string, file: string): Lesson {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, course, file), "utf8");
  const { data, content } = matter(raw);
  const day = Number(FILE_RE.exec(file)![1]);
  if (typeof data.title !== "string") {
    throw new Error(`content/${course}/${file}: front matter needs a "title"`);
  }
  const type = data.type === "video" ? "video" : "text";
  if (type === "video" && typeof data.videoId !== "string") {
    throw new Error(`content/${course}/${file}: video lessons need a "videoId"`);
  }
  return {
    course,
    slug: file.replace(/\.mdx?$/, ""),
    day,
    title: data.title,
    order: typeof data.order === "number" ? data.order : 0,
    type,
    videoId: data.videoId,
    body: content,
  };
}

/** All lessons in a course, sorted by day then order. */
export function listLessons(course: string): Lesson[] {
  if (!getCourse(course)) return [];
  const dir = path.join(CONTENT_DIR, course);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .map((f) => readLesson(course, f))
    .sort((a, b) => a.day - b.day || a.order - b.order);
}

/**
 * Looks the lesson up in the course's own listing, so a URL segment is never
 * joined into a file path.
 */
export function getLesson(course: string, slug: string): Lesson | undefined {
  return listLessons(course).find((l) => l.slug === slug);
}
