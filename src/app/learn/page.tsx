import Link from "next/link";
import { requireMember } from "@/lib/access";
import { COURSES, listLessons } from "@/lib/content";

export default async function LearnPage() {
  const user = await requireMember("/learn");

  return (
    <main>
      <h1>Your courses</h1>
      <p>Logged in as {user.email}</p>
      <ul>
        {COURSES.map((c) => {
          const lessons = listLessons(c.slug);
          return (
            <li key={c.slug}>
              {lessons.length > 0 ? (
                <Link href={`/learn/${c.slug}/${lessons[0].slug}`}>{c.title}</Link>
              ) : (
                c.title
              )}{" "}
              ({lessons.length} {lessons.length === 1 ? "lesson" : "lessons"})
            </li>
          );
        })}
      </ul>
    </main>
  );
}
