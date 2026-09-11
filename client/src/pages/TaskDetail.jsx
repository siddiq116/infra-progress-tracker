import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { fileUrl } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ProgressBar from "../components/ProgressBar.jsx";

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  return new Date(d).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  const [progressValue, setProgressValue] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  function load() {
    api
      .get(`/tasks/${taskId}`)
      .then(({ data }) => {
        setTask(data.task);
        setProgressValue(data.task.actualProgress);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load task"));
    api
      .get(`/progress/task/${taskId}`)
      .then(({ data }) => setHistory(data.updates))
      .catch(() => {});
  }

  useEffect(load, [taskId]);

  function captureLocation() {
    if (!navigator.geolocation) {
      setFormError("Geolocation is not supported by this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      (err) => {
        setFormError(`Could not get location: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("task", taskId);
      body.append("actualProgress", progressValue);
      body.append("remarks", remarks);
      if (location) {
        body.append("lat", location.lat);
        body.append("lng", location.lng);
        body.append("accuracy", location.accuracy);
      }
      if (photo) body.append("photo", photo);

      await api.post("/progress", body, { headers: { "Content-Type": "multipart/form-data" } });

      setRemarks("");
      setPhoto(null);
      setLocation(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit update");
    } finally {
      setSubmitting(false);
    }
  }

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  if (!task) return <p className="text-sm text-slate-400">Loading task...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${task.project}`} className="text-sm text-brand-600 hover:underline">
          ← Back to project
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            {task.wbsCode && <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">WBS {task.wbsCode}</p>}
            <h1 className="text-2xl font-semibold text-slate-900">{task.name}</h1>
            <p className="text-sm text-slate-500">
              {formatDate(task.plannedStart)} → {formatDate(task.plannedEnd)} · Assigned to {task.assignedTo?.name || "Unassigned"}
            </p>
          </div>
          <StatusBadge status={task.progress.status} />
        </div>
        {task.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{task.description}</p>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ProgressBar actual={task.progress.actualProgress} planned={task.progress.plannedProgress} status={task.progress.status} />
        <p className="mt-3 text-sm">
          Variance:{" "}
          <span className={task.progress.variance < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
            {task.progress.variance > 0 ? "+" : ""}
            {task.progress.variance}%
          </span>{" "}
          <span className="text-slate-400">{task.progress.variance < 0 ? "behind schedule" : "on or ahead of schedule"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">📸 Log field progress</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 flex justify-between text-sm font-medium text-slate-700">
                <span>Actual progress</span>
                <span className="text-brand-600">{progressValue}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="What was observed on site?"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Site photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {locating ? "Locating..." : location ? "📍 Location captured" : "📍 Capture GPS location"}
              </button>
              {location && (
                <span className="text-xs text-slate-400">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
              )}
            </div>

            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit update"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700">History</h2>
          </div>
          <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {history.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No updates logged yet.</p>}
            {history.map((u) => (
              <div key={u._id} className="flex gap-3 px-5 py-4">
                {u.photoUrl ? (
                  <img src={fileUrl(u.photoUrl)} alt="Site update" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">📋</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{u.actualProgress}% complete</p>
                    <span className="text-xs text-slate-400">{formatDateTime(u.capturedAt)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {u.submittedBy?.name} · {u.submittedBy?.role?.replace("_", " ")}
                  </p>
                  {u.remarks && <p className="mt-1 text-sm text-slate-600">{u.remarks}</p>}
                  {u.geotag?.lat && (
                    <p className="mt-1 text-xs text-slate-400">
                      📍 {u.geotag.lat.toFixed(5)}, {u.geotag.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
