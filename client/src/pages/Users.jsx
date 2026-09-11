import { useEffect, useState } from "react";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = ["admin", "project_manager", "site_engineer"];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  function load() {
    api
      .get("/users")
      .then(({ data }) => setUsers(data.users))
      .catch((err) => setError(err.response?.data?.message || "Failed to load users"));
  }

  useEffect(load, []);

  async function updateRole(id, role) {
    try {
      await api.patch(`/users/${id}/role`, { role });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">Manage roles for everyone in this workspace.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={u._id === currentUser.id}
                    onChange={(e) => updateRole(u._id, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
