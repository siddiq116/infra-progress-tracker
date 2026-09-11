import axios from "axios";

// Empty string = same-origin requests, which is correct once the client and
// the /api serverless functions are deployed together on one Vercel project.
// Set VITE_API_URL only when running the client against a separate backend
// (e.g. two local dev servers on different ports).
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({ baseURL: `${API_BASE_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ipt_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ipt_token");
      localStorage.removeItem("ipt_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function fileUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path; // Vercel Blob URLs are already absolute
  return `${API_BASE_URL}${path}`;
}

export default api;
