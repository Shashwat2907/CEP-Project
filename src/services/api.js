const API_BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    const errText = await res.text();
    let message = 'API request failed';
    try {
      const errJson = JSON.parse(errText);
      message = errJson.detail || message;
    } catch {
      message = errText || message;
    }
    throw new Error(message);
  }
  return res.json();
}

// Health
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

// Auth & Users
export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/auth/users`);
  return handleResponse(res);
}

export async function fetchCurrentUser(roleHeader) {
  const headers = roleHeader ? { 'X-User-Role': roleHeader } : {};
  const res = await fetch(`${API_BASE}/auth/me`, { headers });
  return handleResponse(res);
}

export async function switchUserRole(role) {
  const res = await fetch(`${API_BASE}/auth/switch-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  return handleResponse(res);
}

// Issues
export async function fetchIssues() {
  const res = await fetch(`${API_BASE}/issues`);
  return handleResponse(res);
}

export async function createIssueApi(issueData) {
  const res = await fetch(`${API_BASE}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issueData)
  });
  return handleResponse(res);
}

export async function resolveIssueApi(id) {
  const res = await fetch(`${API_BASE}/issues/${id}/resolve`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function escalateIssueApi(id) {
  const res = await fetch(`${API_BASE}/issues/${id}/escalate`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function upvoteIssueApi(id) {
  const res = await fetch(`${API_BASE}/issues/${id}/upvote`, {
    method: 'POST'
  });
  return handleResponse(res);
}

// Geofenced Attendance
export async function fetchAttendancePresets() {
  const res = await fetch(`${API_BASE}/attendance/presets`);
  return handleResponse(res);
}

export async function fetchActiveAttendanceSession() {
  const res = await fetch(`${API_BASE}/attendance/session/active`);
  return handleResponse(res);
}

export async function createAttendanceSession(sessionData) {
  const res = await fetch(`${API_BASE}/attendance/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionData)
  });
  return handleResponse(res);
}

export async function closeAttendanceSession(sessionId) {
  const res = await fetch(`${API_BASE}/attendance/session/${sessionId}/close`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function markAttendanceApi(data) {
  const res = await fetch(`${API_BASE}/attendance/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function fetchAttendanceRecords(sessionId) {
  const url = sessionId 
    ? `${API_BASE}/attendance/records?session_id=${sessionId}`
    : `${API_BASE}/attendance/records`;
  const res = await fetch(url);
  return handleResponse(res);
}
