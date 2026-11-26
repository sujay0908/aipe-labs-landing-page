import Link from "next/link";
import { memberProgress } from "@/lib/applications";
import { getCourses } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const [members, courses] = await Promise.all([memberProgress(), getCourses()]);
  return (
    <main className="page">
      <Link href="/admin/applications" className="small">← Applications</Link>
      <h1 style={{ marginTop: 8 }}>Member progress</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Lessons completed per course. {members.length} paid members.</p>
      {members.length === 0 ? (
        <p className="muted">No paid members yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Member</th>{courses.map((c) => <th key={c.slug}>{c.short ?? c.title}</th>)}</tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const done = new Set(m.lessons);
                return (
                  <tr key={m.email}>
                    <td><strong>{m.name}</strong><div className="small dim">{m.email}</div></td>
                    {courses.map((c) => {
                      const n = c.lessons.filter((l) => done.has(l.id)).length;
                      const furthest = [...c.lessons].reverse().find((l) => done.has(l.id));
                      return (
                        <td key={c.slug}>
                          {n} / {c.lessons.length}
                          {furthest && <div className="small dim">up to Day {furthest.day}</div>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
