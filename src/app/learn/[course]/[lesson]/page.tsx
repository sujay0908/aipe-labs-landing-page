import { notFound } from "next/navigation";
import { requireMember } from "@/lib/access";
import { getCourse, getLesson } from "@/lib/content";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson: slug } = await params;
  await requireMember(`/learn/${course}/${slug}`);

  const c = getCourse(course);
  const lesson = c && getLesson(course, slug);
  if (!c || !lesson) notFound();

  // Plain rendering for now; MDX rendering is #19, video is #20.
  return (
    <main>
      <p>{c.title} › Day {lesson.day}</p>
      <h1>{lesson.title}</h1>
      <pre style={{ whiteSpace: "pre-wrap" }}>{lesson.body}</pre>
    </main>
  );
}
