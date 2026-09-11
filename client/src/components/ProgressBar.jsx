const BAR_COLOR = {
  not_started: "bg-slate-400",
  in_progress: "bg-blue-500",
  delayed: "bg-red-500",
  completed: "bg-emerald-500",
};

export default function ProgressBar({ actual = 0, planned = 0, status = "not_started", showLabels = true }) {
  const color = BAR_COLOR[status] || BAR_COLOR.not_started;
  return (
    <div className="w-full">
      <div className="relative h-2.5 w-full overflow-visible rounded-full bg-slate-100">
        <div
          className={`h-2.5 rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, actual))}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-slate-900/70"
          style={{ left: `${Math.min(100, Math.max(0, planned))}%` }}
          title={`Planned: ${planned}%`}
        />
      </div>
      {showLabels && (
        <div className="mt-1 flex justify-between text-[11px] text-slate-500">
          <span>Actual {actual}%</span>
          <span>Planned {planned}%</span>
        </div>
      )}
    </div>
  );
}
