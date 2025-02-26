import { NextRequest, NextResponse } from 'next/server';

const RAGIE_API_KEY = process.env.RAGIE_AI_API_KEY;
const RAGIE_API_URL = 'https://api.ragie.ai/retrievals';

export async function POST(request: NextRequest) {
  try {
    if (!RAGIE_API_KEY) {
      throw new Error('RAGIE_AI_API_KEY is not configured');
    }

    const { query } = await request.json();
    
    if (typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(RAGIE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RAGIE_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        // filter: {
        //   scope: filter?.scope || "tutorial" // default to tutorial if not specified
        // }
      })
    });

    if (!response.ok) {
      throw new Error(`Ragie API error: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in Ragie API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Ragie API endpoint - POST only' },
    { status: 405 }
  );
} 