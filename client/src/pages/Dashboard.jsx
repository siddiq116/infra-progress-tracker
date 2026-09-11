import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api, { fileUrl } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

const STATUS_COLORS = {
  not_started: "#94a3b8",
  in_progress: "#3b82f6",
  delayed: "#ef4444",
  completed: "#10b981",
};

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function timeAgo(d) {
  const diffMs = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Failed to load dashboard"));
  }, []);

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-400">Loading dashboard...</p>;

  const chartData = data.projects.map((p) => ({
    name: p.code,
    Planned: p.progress.plannedProgress,
    Actual: p.progress.actualProgress,
  }));

  const pieData = Object.entries(data.statusCounts).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
    status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Program Dashboard</h1>
        <p className="text-sm text-slate-500">Planned schedule vs. field-reported actual progress, across all projects.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Projects" value={data.totals.projects} />
        <StatCard label="Total Tasks" value={data.totals.tasks} />
        <StatCard label="Delayed Tasks" value={data.totals.delayedTasks} tone="danger" hint="Behind planned schedule" />
        <StatCard label="Completed Tasks" value={data.totals.completedTasks} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Planned vs. Actual Progress by Project</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis unit="%" tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Planned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Actual" fill="#2a5be0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Task Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">⚠️ Schedule Alerts</h2>
            <span className="text-xs text-slate-400">{data.delayedTasks.length} flagged</span>
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {data.delayedTasks.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No delayed tasks. Nice work!</p>}
            {data.delayedTasks.map((task) => (
              <Link
                to={`/tasks/${task._id}`}
                key={task._id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{task.name}</p>
                  <p className="text-xs text-slate-400">
                    {task.project?.name} · Due {formatDate(task.plannedEnd)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">{task.progress.variance}%</p>
                  <p className="text-[11px] text-slate-400">vs. plan</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-700">📸 Recent Field Updates</h2>
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {data.recentUpdates.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No progress captured yet.</p>
            )}
            {data.recentUpdates.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                {u.photoUrl ? (
                  <img src={fileUrl(u.photoUrl)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">📋</div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-medium">{u.submittedBy?.name}</span> updated{" "}
                    <span className="font-medium">{u.task?.name}</span> to {u.actualProgress}%
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.project?.name} · {timeAgo(u.capturedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">Project Health</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.projects.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {p.name} <span className="text-slate-400">({p.code})</span>
                </p>
                <p className="text-xs text-slate-400">{p.taskCount} tasks</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">{p.progress.actualProgress}% complete</span>
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
