import { NextResponse } from 'next/server';

const VYBE_BACKEND_URL = process.env.VYBE_BACKEND_URL || 'http://localhost:8001';
const API_TOKEN = process.env.VYBE_API_TOKEN || 'vybe-dev-token';

export async function GET(request, { params }) {
  const { path } = params;
  const url = new URL(request.url);
  
  try {
    // Forward the request to the Vybe backend
    const backendUrl = `${VYBE_BACKEND_URL}/ytmusic/${path.join('/')}${url.search}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'X-Client-Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('YTMusic API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to YTMusic backend' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const { path } = params;
  const body = await request.json();
  
  try {
    const backendUrl = `${VYBE_BACKEND_URL}/ytmusic/${path.join('/')}`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'X-Client-Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('YTMusic API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to YTMusic backend' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { path } = params;
  const url = new URL(request.url);
  
  try {
    const backendUrl = `${VYBE_BACKEND_URL}/ytmusic/${path.join('/')}${url.search}`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'X-Client-Token': API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('YTMusic API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to YTMusic backend' },
      { status: 500 }
    );
  }
}

