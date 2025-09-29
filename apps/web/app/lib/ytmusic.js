// apps/web/app/lib/ytmusic.js

const VYBE_BACKEND_URL = process.env.NEXT_PUBLIC_VYBE_BACKEND_URL || 'http://localhost:8001';

export async function validateYTMusicConnection() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytmusic/validate`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': 'vybe-dev-token',
      },
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('YTMusic validation error:', error);
    throw error;
  }
}

export async function getYTMusicHistory(limit = 50) {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytmusic/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': 'vybe-dev-token',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get history: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('YTMusic history error:', error);
    throw error;
  }
}

export async function getYTMusicLibrary() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytmusic/library`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': 'vybe-dev-token',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get library: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('YTMusic library error:', error);
    throw error;
  }
}

export async function disconnectYTMusic() {
  try {
    const response = await fetch(`${VYBE_BACKEND_URL}/ytmusic/disconnect`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': 'vybe-dev-token',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('YTMusic disconnect error:', error);
    throw error;
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
    console.error('YTMusic backend health check failed:', error);
    return false;
  }
}

