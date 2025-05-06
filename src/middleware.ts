import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/credits',
];

// Paths that should redirect to upload page if authenticated
const authPaths = [
  '/auth/signin',
  '/auth/signup',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes that handle uploads
  if (pathname.startsWith('/api/upload-large')) {
    return NextResponse.next();
  }
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Check if the path is an auth path
  const isAuthPath = authPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // If the path is protected and the user is not authenticated, redirect to signin
  if (isProtectedPath && !token) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // If the path is an auth path and the user is authenticated, redirect to upload page
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/upload', request.url));
  }
  
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/credits/:path*',
    '/auth/:path*',
  ],
}; 