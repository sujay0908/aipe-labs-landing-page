import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderLanding } from "@/lib/landing";

// The marketing page stays a hand-written HTML file (landing/index.html), rendered at build time.
export const dynamic = "force-static";

export async function GET() {
  const html = await readFile(path.join(process.cwd(), "landing", "index.html"), "utf8");
  return new Response(renderLanding(html), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
