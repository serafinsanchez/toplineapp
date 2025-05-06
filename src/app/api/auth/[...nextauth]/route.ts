/**
 * Authentication API Route
 * 
 * This file implements the Next.js API route for authentication using NextAuth.js.
 * It handles both GET and POST requests for various authentication operations:
 * 
 * - Sign in with credentials (email/password)
 * - Sign out
 * - Session management
 * - Callback handling
 * - CSRF token validation
 * 
 * The route uses the catch-all parameter [...nextauth] to handle all auth-related
 * endpoints under /api/auth/* as defined by NextAuth.js.
 * 
 * Authentication is implemented using Supabase as the backend provider through
 * the CredentialsProvider in the authOptions configuration.
 * 
 * @see {@link https://next-auth.js.org/getting-started/example Next Auth Documentation}
 * @see {@link https://supabase.com/docs/guides/auth Supabase Auth Documentation}
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * NextAuth handler that processes all authentication requests
 * 
 * This handler is configured with the authOptions from @/lib/auth which includes:
 * - Credentials provider for email/password authentication via Supabase
 * - JWT session strategy with 30-day expiration
 * - Custom callback URLs for sign in, sign out, errors, etc.
 * - JWT and session callbacks for proper user data handling
 */
const handler = NextAuth(authOptions);

/**
 * Export the handler for both GET and POST methods
 * 
 * GET requests are used for:
 * - Retrieving CSRF tokens
 * - Getting session data
 * - Handling OAuth callbacks
 * 
 * POST requests are used for:
 * - Sign in with credentials
 * - Sign out
 * - Creating new sessions
 */
export { handler as GET, handler as POST }; 