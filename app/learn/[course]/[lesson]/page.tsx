import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgressBar } from "@/components/ProgressBar";
import { Video } from "@/components/Video";
import { requireMember } from "@/lib/auth";
import { getCourse, getLesson, lessonsByDay } from "@/lib/content";
import { renderMdx } from "@/lib/mdx";
import { completedLessons, courseProgress, rememberLesson } from "@/lib/progress";
import { toggleComplete } from "../../actions";

type Params = { params: Promise<{ course: string; lesson: string }> };

export async function generateMetadata({ params }: Params) {
  const { course, lesson } = await params;
  return { title: (await getLesson(course, lesson))?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Params) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const member = await requireMember();
  const [course, lesson] = await Promise.all([getCourse(courseSlug), getLesson(courseSlug, lessonSlug)]);
  if (!course || !lesson) notFound();

  const [done, body] = await Promise.all([completedLessons(member.id), renderMdx(lesson.body)]);
  await rememberLesson(member.id, lesson.id);

  const index = course.lessons.findIndex((l) => l.id === lesson.id);
  const prev = course.lessons[index - 1];
  const next = course.lessons[index + 1];
  const isDone = done.has(lesson.id);
  const p = courseProgress(course, done);

  return (
    <main className="page">
      <input key={lesson.id} type="checkbox" id="outline-open" className="visually-hidden" aria-hidden tabIndex={-1} />
      <label htmlFor="outline-open" className="scrim" aria-hidden />

      <Breadcrumbs
        items={[
          { label: "Courses", href: "/learn" },
          { label: course.short ?? course.title, href: `/learn/${course.slug}` },
          { label: `Day ${lesson.day}`, href: `/learn/${course.slug}#day-${lesson.day}` },
          { label: lesson.title },
        ]}
      />
      <label htmlFor="outline-open" className="btn ghost sm outline-toggle" role="button">☰ Course outline</label>

      <div className="lesson-layout">
        <aside className="outline-wrap" aria-label="Course outline">
          <nav className="outline">
            <h3><Link href={`/learn/${course.slug}`} style={{ color: "inherit", padding: 0 }}>{course.title}</Link></h3>
            <div style={{ margin: "8px 0 4px" }}><ProgressBar completed={p.completed} total={p.total} /></div>
            {lessonsByDay(course).map(({ day, lessons }) => (
              <div key={day}>
                <div className="day">Day {day}</div>
                <ul>
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={`/learn/${l.id}`} aria-current={l.id === lesson.id ? "page" : undefined}>
                        <span className="mark" style={{ color: done.has(l.id) ? "var(--green)" : "var(--text-dim)" }}>
                          {done.has(l.id) ? "✓" : "○"}
                        </span>
                        <span>{l.title}</span>
                      </Link>
                    </li>
                  ))}
                  {lessons.length === 0 && <li className="small dim" style={{ padding: "6px 8px" }}>Coming soon</li>}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <article style={{ minWidth: 0 }}>
          <div className="label">Day {lesson.day}{lesson.duration ? ` · ${lesson.duration}` : ""}</div>
          <div className="prose">
            <h1>{lesson.title}</h1>
            {lesson.type === "video" && <Video videoId={lesson.videoId} title={lesson.title} />}
            {body}
          </div>

          <footer className="lesson-footer">
            <form action={toggleComplete}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <button type="submit" className={`btn${isDone ? " done" : ""}`} aria-pressed={isDone}>
                {isDone ? "✓ Completed · click to undo" : "Mark as complete"}
              </button>
            </form>
            <nav className="pager" aria-label="Lesson navigation">
              {prev && (
                <Link href={`/learn/${prev.id}`}>
                  <span>← Previous · Day {prev.day}</span>{prev.title}
                </Link>
              )}
              {next && (
                <Link href={`/learn/${next.id}`} className="next">
                  <span>Next · Day {next.day} →</span>{next.title}
                </Link>
              )}
            </nav>
          </footer>
        </article>
      </div>
    </main>
  );
}
