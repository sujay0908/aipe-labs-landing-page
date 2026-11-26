import Link from "next/link";
import { ProgressBar } from "@/components/ProgressBar";
import { requireMember } from "@/lib/auth";
import { getCourses } from "@/lib/content";
import { completedLessons, courseProgress } from "@/lib/progress";

export const metadata = { title: "Your courses" };

export default async function LearnPage() {
  const member = await requireMember();
  const [courses, done] = await Promise.all([getCourses(), completedLessons(member.id)]);

  const all = courses.flatMap((c) => c.lessons.map((l) => ({ ...l, courseTitle: c.title })));
  const last = member.lastLesson ? all.find((l) => l.id === member.lastLesson) : undefined;
  const firstName = member.name.split(" ")[0];

  return (
    <main className="page">
      <div className="label">AIPE Labs · Cohort 1</div>
      <h1>Welcome back, {firstName}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Four 7-day courses. One lesson and one build task a day.</p>

      {last ? (
        <div className="card continue">
          <div>
            <div className="small dim">Continue where you left off</div>
            <div style={{ fontWeight: 700 }}>{last.title}</div>
            <div className="small muted">{last.courseTitle} · Day {last.day}</div>
          </div>
          <Link className="btn" href={`/learn/${last.id}`}>Continue</Link>
        </div>
      ) : all[0] ? (
        <div className="card continue">
          <div>
            <div className="small dim">Start here</div>
            <div style={{ fontWeight: 700 }}>{all[0].title}</div>
            <div className="small muted">{all[0].courseTitle} · Day 1</div>
          </div>
          <Link className="btn" href={`/learn/${all[0].id}`}>Start</Link>
        </div>
      ) : null}

      <div className="course-grid">
        {courses.map((c) => {
          const p = courseProgress(c, done);
          return (
            <Link key={c.slug} href={`/learn/${c.slug}`} className="course-card">
              <span className="small dim" style={{ fontFamily: "var(--mono)" }}>TRACK 0{c.order} · 7 DAYS</span>
              <h3>{c.title}</h3>
              <p className="outcome">By day 7: {c.outcome}</p>
              <div style={{ marginTop: "auto" }}><ProgressBar completed={p.completed} total={p.total} /></div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
