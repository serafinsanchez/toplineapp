import { NextRequest, NextResponse } from 'next/server';
import { hasUsedFreeTrial } from '@/lib/free-trial';

export async function GET(request: NextRequest) {
  try {
    // Get the client IP from the request
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check if the client has used their free trial
    const used = await hasUsedFreeTrial(clientIp);
    
    // Return the result
    return NextResponse.json({ used });
  } catch (error) {
    console.error('Error checking free trial status:', error);
    return NextResponse.json({ error: 'Failed to check free trial status' }, { status: 500 });
  }
} 