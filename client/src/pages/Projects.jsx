import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

const EMPTY_FORM = { name: "", code: "", description: "", location: "", plannedStart: "", plannedEnd: "" };

export default function Projects() {
  const { canManage } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function load() {
    setLoading(true);
    api
      .get("/projects")
      .then(({ data }) => setProjects(data.projects))
      .catch((err) => setError(err.response?.data?.message || "Failed to load projects"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/projects", form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Every infrastructure project being tracked in this workspace.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {showForm ? "Cancel" : "+ New project"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project name</label>
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project code</label>
            <input required value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="e.g. NH48-FLY" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input value={form.location} onChange={(e) => update("location", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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

          {formError && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

          <div className="sm:col-span-2">
            <button disabled={submitting} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-400">Loading projects...</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p._id}
            to={`/projects/${p._id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{p.code}</p>
                <h3 className="text-base font-semibold text-slate-900">{p.name}</h3>
              </div>
              <StatusBadge status={p.status} />
            </div>
            {p.location && <p className="mb-3 text-xs text-slate-400">📍 {p.location}</p>}
            <ProgressBar actual={p.progress.actualProgress} planned={p.progress.plannedProgress} status={p.status === "delayed" ? "delayed" : p.status === "completed" ? "completed" : "in_progress"} />
            <p className="mt-3 text-xs text-slate-400">{p.taskCount} tasks</p>
          </Link>
        ))}
      </div>

      {!loading && projects.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
          No projects yet. {canManage ? "Create one to get started." : "Ask your project manager to add one."}
        </p>
      )}
    </div>
  );
}
