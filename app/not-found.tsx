import Link from "next/link";

export default function NotFound() {
  return (
    <main className="narrow stack">
      <h1>Page not found</h1>
      <p className="muted"><Link href="/">Back to AIPE Labs</Link></p>
    </main>
  );
}
