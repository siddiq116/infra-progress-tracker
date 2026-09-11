export default function StatCard({ label, value, hint, tone = "default" }) {
  const toneStyles = {
    default: "text-slate-900",
    danger: "text-red-600",
    success: "text-emerald-600",
    brand: "text-brand-600",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneStyles[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
