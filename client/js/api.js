/**
 * Data-access layer: the only place that talks to the REST API.
 * If the page is served by Express (port 3000) use a relative URL,
 * otherwise (Live Server, file://) point at the API explicitly.
 */
const API_BASE = window.location.port === '3000'
  ? '/api'
  : 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.status = status;
    this.errors = errors; // per-field validation errors from the server
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.errors);
  return data;
}

const PatientApi = {
  list:   (q = '')     => request(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  get:    (id)         => request(`/patients/${id}`),
  create: (patient)    => request('/patients', { method: 'POST', body: JSON.stringify(patient) }),
  update: (id, patient)=> request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(patient) }),
  remove: (id)         => request(`/patients/${id}`, { method: 'DELETE' }),
  health: ()           => request('/health'),
};
