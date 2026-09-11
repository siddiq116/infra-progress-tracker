import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

const EMPTY_TASK = { name: "", wbsCode: "", description: "", plannedStart: "", plannedEnd: "", weight: 1, assignedTo: "" };

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { canManage } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    api
      .get(`/projects/${projectId}`)
      .then(({ data }) => setProject(data.project))
      .catch((err) => setError(err.response?.data?.message || "Failed to load project"));
    api
      .get(`/tasks?project=${projectId}`)
      .then(({ data }) => setTasks(data.tasks))
      .catch(() => {});
    api.get("/users").then(({ data }) => setUsers(data.users)).catch(() => {});
  }

  useEffect(load, [projectId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/tasks", { ...form, project: projectId, assignedTo: form.assignedTo || undefined });
      setForm(EMPTY_TASK);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  if (!project) return <p className="text-sm text-slate-400">Loading project...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/projects" className="text-sm text-brand-600 hover:underline">
          ← All projects
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{project.code}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{project.name}</h1>
            {project.location && <p className="text-sm text-slate-500">📍 {project.location}</p>}
          </div>
          <StatusBadge status={project.status} />
        </div>
        {project.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{project.description}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            {formatDate(project.plannedStart)} → {formatDate(project.plannedEnd)}
          </span>
          <span>
            Manager: <strong className="text-slate-700">{project.manager?.name || "Unassigned"}</strong>
          </span>
        </div>
        <ProgressBar actual={project.progress.actualProgress} planned={project.progress.plannedProgress} status={project.status === "delayed" ? "delayed" : project.status === "completed" ? "completed" : "in_progress"} />
        {project.progress.delayedTaskCount > 0 && (
          <p className="mt-2 text-xs text-red-600">⚠️ {project.progress.delayedTaskCount} task(s) behind schedule</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Work Breakdown / Tasks</h2>
        {canManage && (
          <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {showForm ? "Cancel" : "+ Add task"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WBS code</label>
            <input value={form.wbsCode} onChange={(e) => update("wbsCode", e.target.value)} placeholder="e.g. 1.2" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Task name</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Planned start</label>
              <input type="date" required value={form.plannedStart} onChange={(e) => update("plannedStart", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Planned end</label>
              <input type="date" required value={form.plannedEnd} onChange={(e) => update("plannedEnd", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Weight (relative size)</label>
            <input type="number" min={0} step="0.1" value={form.weight} onChange={(e) => update("weight", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign to</label>
            <select value={form.assignedTo} onChange={(e) => update("assignedTo", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role.replace("_", " ")})
                </option>
              ))}
            </select>
          </div>

          {formError && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="sm:col-span-2">
            <button disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "Adding..." : "Add task"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">WBS</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task._id} className="cursor-pointer hover:bg-slate-50" onClick={() => (window.location.href = `/tasks/${task._id}`)}>
                <td className="px-4 py-3 text-slate-400">{task.wbsCode || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  <Link to={`/tasks/${task._id}`} className="hover:text-brand-600" onClick={(e) => e.stopPropagation()}>
                    {task.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDate(task.plannedStart)} → {formatDate(task.plannedEnd)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{task.assignedTo?.name || "Unassigned"}</td>
                <td className="px-4 py-3">
                  <div className="w-36">
                    <ProgressBar actual={task.progress.actualProgress} planned={task.progress.plannedProgress} status={task.progress.status} showLabels={false} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.progress.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No tasks yet.</p>}
      </div>
    </div>
  );
}
