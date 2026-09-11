const STATUS_STYLES = {
  not_started: "bg-slate-100 text-slate-600 ring-slate-200",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
  delayed: "bg-red-50 text-red-700 ring-red-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  planned: "bg-slate-100 text-slate-600 ring-slate-200",
  on_hold: "bg-amber-50 text-amber-700 ring-amber-200",
};

const STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  delayed: "Delayed",
  completed: "Completed",
  planned: "Planned",
  on_hold: "On hold",
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.not_started;
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status === "delayed" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
      {label}
    </span>
  );
}
