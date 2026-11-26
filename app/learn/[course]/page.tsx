import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgressBar } from "@/components/ProgressBar";
import { requireMember } from "@/lib/auth";
import { getCourse, lessonsByDay } from "@/lib/content";
import { completedLessons, courseProgress } from "@/lib/progress";

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const course = await getCourse((await params).course);
  return { title: course?.title ?? "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const member = await requireMember();
  const course = await getCourse(slug);
  if (!course) notFound();
  const done = await completedLessons(member.id);
  const p = courseProgress(course, done);

  return (
    <main className="page" style={{ maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: "Courses", href: "/learn" }, { label: course.title }]} />
      <h1>{course.title}</h1>
      <p className="muted">{course.description}</p>
      <div className="card" style={{ margin: "20px 0 8px" }}>
        <div className="label">By day 7</div>
        <p style={{ marginBottom: 14 }}>{course.outcome}</p>
        <ProgressBar completed={p.completed} total={p.total} />
      </div>

      {lessonsByDay(course).map(({ day, lessons }) => (
        <section key={day} className="day-block" id={`day-${day}`}>
          <h2>Day {day}</h2>
          {lessons.length === 0 ? (
            <p className="small dim">Lessons for this day are on the way.</p>
          ) : (
            <ul className="lesson-list">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/learn/${l.id}`}>
                    <span className={`mark${done.has(l.id) ? " on" : ""}`} aria-label={done.has(l.id) ? "Completed" : "Not completed"}>
                      {done.has(l.id) ? "✓" : "○"}
                    </span>
                    <span>{l.title}</span>
                    <span className="meta">{l.type === "video" ? "Video" : "Read"}{l.duration ? ` · ${l.duration}` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
