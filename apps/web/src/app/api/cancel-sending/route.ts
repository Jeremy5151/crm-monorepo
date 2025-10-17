import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/v1/leads/cancel-sending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
      },
      body: JSON.stringify({ leadId }),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error cancelling sending:', error);
    return NextResponse.json(
      { error: 'Failed to cancel sending' },
      { status: 500 }
    );
  }
}
