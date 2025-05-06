/**
 * Admin API Route for Resetting Free Trial Usage
 * 
 * This API endpoint allows administrators to reset a user's free trial usage
 * by deleting their record from the free_trial_usage table.
 * 
 * Authentication: Requires an authenticated user with admin role
 * Method: DELETE
 * Query Parameters:
 *   - clientIp: The IP address of the user whose free trial should be reset
 * 
 * @returns 200 OK if successful, appropriate error code otherwise
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { deleteFreeTrial } from '@/lib/free-trial';

export async function DELETE(request: NextRequest) {
  try {
    // Get the client IP from the query parameters
    const clientIp = request.nextUrl.searchParams.get('clientIp');
    
    if (!clientIp) {
      return NextResponse.json(
        { error: 'Client IP is required' },
        { status: 400 }
      );
    }
    
    // Check if the user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userIsAdmin = await isAdmin(session.user.id);
    
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Delete the free trial usage record
    const success = await deleteFreeTrial(clientIp);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to reset free trial' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Free trial reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting free trial:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 