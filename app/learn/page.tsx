import { getCourses } from "@/lib/content";

export const metadata = { title: "Your courses" };

export default async function LearnPage() {
  const courses = await getCourses();
  return (
    <main className="page">
      <h1>Your courses</h1>
      <ul>
        {courses.map((c) => (
          <li key={c.slug}>{c.title} ({c.lessons.length} lessons)</li>
        ))}
      </ul>
    </main>
  );
}
