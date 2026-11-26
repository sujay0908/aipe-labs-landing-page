import type { ReactNode } from "react";

function Callout({ kind, title, children }: { kind: string; title: string; children: ReactNode }) {
  return (
    <aside className={`callout ${kind}`}>
      <div className="callout-title">{title}</div>
      {children}
    </aside>
  );
}

/** Today's build task. Usage in MDX: <BuildTask>…</BuildTask> */
export const BuildTask = ({ children, title = "Build task" }: { children: ReactNode; title?: string }) => (
  <Callout kind="build" title={title}>{children}</Callout>
);

/** The done-check for the day. Usage: <DoneWhen>- [ ] …</DoneWhen> or a plain list. */
export const DoneWhen = ({ children }: { children: ReactNode }) => (
  <Callout kind="done" title="Done when">{children}</Callout>
);

export const Note = ({ children, title = "Note" }: { children: ReactNode; title?: string }) => (
  <Callout kind="note" title={title}>{children}</Callout>
);

export const Warning = ({ children, title = "Watch out" }: { children: ReactNode; title?: string }) => (
  <Callout kind="warn" title={title}>{children}</Callout>
);
