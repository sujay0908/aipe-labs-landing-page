import { COHORT, formatDate, startLabel } from "./cohort";

/** Fills {{PLACEHOLDERS}} in landing/index.html from lib/cohort.ts, so dates live in one place (#1). */
export function renderLanding(html: string): string {
  const deadline = COHORT.applicationDeadline ? ` · Apply by ${formatDate(COHORT.applicationDeadline)}` : "";
  return html.replaceAll("{{START}}", startLabel()).replaceAll("{{DEADLINE_NOTE}}", deadline);
}
