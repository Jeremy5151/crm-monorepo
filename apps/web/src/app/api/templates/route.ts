import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/templates`, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
