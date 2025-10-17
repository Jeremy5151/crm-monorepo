import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/leads/queue`, {
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json({ message: errorData.message || 'Failed to fetch queue' }, { status: res.status });
    }

    const queue = await res.json();
    return NextResponse.json(queue);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 });
  }
}

