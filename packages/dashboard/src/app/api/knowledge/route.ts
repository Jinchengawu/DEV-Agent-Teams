import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const source = searchParams.get('source') || '';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let url: string;
    if (q) {
      url = `${GATEWAY_URL}/knowledge/search?q=${encodeURIComponent(q)}&limit=${limit}`;
      if (type) url += `&type=${encodeURIComponent(type)}`;
    } else {
      url = `${GATEWAY_URL}/knowledge?limit=${limit}&offset=${offset}`;
      if (type) url += `&type=${encodeURIComponent(type)}`;
      if (source) url += `&source=${encodeURIComponent(source)}`;
    }

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to reach gateway: ${message}` }, { status: 503 });
  }
}
