// apps/web/app/lib/ytmusic.js

const VYBE_BACKEND_URL = process.env.NEXT_PUBLIC_VYBE_BACKEND_URL || 'http://localhost:8000';
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_YTMUSIC_CLIENT_TOKEN || 'dev-token';

export async function validateYTMusicConnection() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytm/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': CLIENT_TOKEN,
      },
    });

    const maybeJson = await safeJson(response);
    if (!response.ok) {
      return { success: false, error: extractError(maybeJson) };
    }

    return { success: !!maybeJson?.ok, data: maybeJson };
  } catch (error) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function getYTMusicHistory(limit = 50) {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytm/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': CLIENT_TOKEN,
      },
    });

    const maybeJson = await safeJson(response);
    if (!response.ok) {
      return { success: false, data: [], error: extractError(maybeJson) };
    }

    const data = Array.isArray(maybeJson) ? maybeJson : [];
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: error?.message || 'Network error' };
  }
}

export async function getYTMusicLibrary() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytm/library`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': CLIENT_TOKEN,
      },
    });

    const maybeJson = await safeJson(response);
    if (!response.ok) {
      return { success: false, data: [], error: extractError(maybeJson) };
    }

    const data = Array.isArray(maybeJson) ? maybeJson : [];
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: error?.message || 'Network error' };
  }
}

export async function disconnectYTMusic() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytm/connect`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': CLIENT_TOKEN,
      },
    });

    const maybeJson = await safeJson(response);
    if (!response.ok) {
      return { success: false, error: extractError(maybeJson) };
    }

    return { success: true, data: maybeJson };
  } catch (error) {
    return { success: false, error: error?.message || 'Network error' };
  }
}

export async function checkYTMusicBackendHealth() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/health`, {
      method: 'GET',
      mode: 'cors',
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

function extractError(json) {
  if (!json) return 'Unknown error';
  return json.detail || json.message || json.error || 'Request failed';
}

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

