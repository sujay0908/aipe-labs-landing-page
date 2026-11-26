export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className={`bar${total && completed === total ? " full" : ""}`} role="progressbar"
        aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-label="Course progress">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="small dim">{completed} of {total} lessons</span>
    </div>
  );
}
