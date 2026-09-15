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
export async function loginApi({ email, password, role }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  return handleResponse(res);
}

export async function registerApi(userData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return handleResponse(res);
}

export async function logoutApi(token) {
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers
  });
  return handleResponse(res);
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/auth/users`);
  return handleResponse(res);
}

export async function fetchCurrentUser(token, roleHeader) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (roleHeader) headers['X-User-Role'] = roleHeader;
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

// Lost & Found
export async function fetchLostFoundItems() {
  const res = await fetch(`${API_BASE}/lost-found`);
  return handleResponse(res);
}

export async function createLostFoundItemApi(itemData, userHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...userHeaders
  };
  const res = await fetch(`${API_BASE}/lost-found`, {
    method: 'POST',
    headers,
    body: JSON.stringify(itemData)
  });
  return handleResponse(res);
}

export async function claimLostFoundItemApi(id, claimData, userHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...userHeaders
  };
  const res = await fetch(`${API_BASE}/lost-found/${id}/claim`, {
    method: 'POST',
    headers,
    body: JSON.stringify(claimData)
  });
  return handleResponse(res);
}

export async function updateLostFoundStatusApi(id, status) {
  const res = await fetch(`${API_BASE}/lost-found/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return handleResponse(res);
}

export async function deleteLostFoundItemApi(id) {
  const res = await fetch(`${API_BASE}/lost-found/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

