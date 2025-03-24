/**
 * Authentication Configuration and Helper Functions
 * 
 * This module provides the NextAuth.js configuration and authentication-related
 * helper functions for the application. It integrates with Supabase for user
 * authentication and management.
 * 
 * @module auth
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabase, createServiceRoleClient } from './supabase';

/**
 * NextAuth.js configuration options
 * 
 * This configuration:
 * - Sets up email/password authentication via Supabase
 * - Configures JWT-based sessions with a 30-day expiration
 * - Defines custom pages for authentication flows
 * - Implements callbacks for JWT and session handling
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      /**
       * Authorize callback for credential authentication
       * 
       * This function:
       * 1. Validates that email and password are provided
       * 2. Attempts to authenticate with Supabase
       * 3. Returns a user object on success or null on failure
       * 
       * @param credentials - The credentials provided by the user
       * @param req - The request object
       * @returns User object or null
       */
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          console.error('Authentication error:', error);
          return null;
        }

        // Get user's name from metadata
        const fullName = data.user.user_metadata?.full_name || 
                        data.user.user_metadata?.name || 
                        data.user.email;

        // Use admin client for profile operations
        const supabaseAdmin = createServiceRoleClient();

        try {
          // Check if user profile exists
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching user profile:', profileError);
          }

          // If profile doesn't exist, create it with default values
          if (!profileData) {
            const { error: insertError } = await supabaseAdmin
              .from('user_profiles')
              .insert({
                user_id: data.user.id,
                role: 'user',
                balance: 10, // Give new users 10 credits by default
                name: fullName !== data.user.email ? fullName : null,
                email: data.user.email,
              });

            if (insertError) {
              console.error('Error creating user profile:', insertError);
            }
          } 
          // If profile exists but doesn't have a name or balance is null, update it
          else if ((fullName && fullName !== data.user.email && !profileData.name) || 
                  profileData.balance === null) {
            const updateData: any = {};
            
            if (fullName && fullName !== data.user.email && !profileData.name) {
              updateData.name = fullName;
            }
            
            if (profileData.balance === null) {
              updateData.balance = 10; // Set to 10 credits if balance is null
            }
            
            const { error: updateError } = await supabaseAdmin
              .from('user_profiles')
              .update(updateData)
              .eq('user_id', data.user.id);

            if (updateError) {
              console.error('Error updating user profile:', updateError);
            }
          }
        } catch (error) {
          console.error('Error managing user profile:', error);
        }

        // Return the user object
        return {
          id: data.user.id,
          email: data.user.email || '',
          name: fullName,
        };
      }
    }),
  ],
  callbacks: {
    /**
     * JWT callback to customize the JWT token
     * 
     * This function adds the user ID and email to the JWT token
     * when a user signs in.
     * 
     * @param params - Object containing token and user data
     * @returns Modified JWT token
     */
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    /**
     * Session callback to customize the session object
     * 
     * This function adds the user ID from the JWT token to the
     * session object, making it available on the client side.
     * 
     * @param params - Object containing session and token data
     * @returns Modified session object
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        
        // If name is not in the token or is just the email, try to get it from the database
        if (!session.user.name || session.user.name === session.user.email) {
          try {
            // Get from user_profiles
            const supabaseAdmin = createServiceRoleClient();
            const { data, error } = await supabaseAdmin
              .from('user_profiles')
              .select('name')
              .eq('user_id', session.user.id)
              .single();
            
            if (!error && data && data.name) {
              session.user.name = data.name;
            }
          } catch (error) {
            console.error('Error fetching user name:', error);
          }
        }
      }
      return session;
    },
  },
  /**
   * Custom pages for authentication flows
   * 
   * These pages override the default NextAuth.js pages with
   * application-specific implementations.
   */
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },
  /**
   * Session configuration
   * 
   * Uses JWT strategy with a 30-day expiration period.
   */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  /**
   * Secret used to sign cookies and tokens
   * 
   * This should be set in the environment variables.
   */
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Check if a user is authenticated
 * 
 * This function verifies if a session contains a valid user ID.
 * 
 * @param session - The session object to check
 * @returns True if the user is authenticated, false otherwise
 */
export async function isAuthenticated(session: any) {
  return !!session?.user?.id;
}

/**
 * Check if a user has enough credits for an operation
 * 
 * This function queries the user_profiles table to check if the user
 * has at least the required number of credits.
 * 
 * @param userId - The ID of the user to check
 * @param requiredCredits - The number of credits required (default: 1)
 * @returns True if the user has enough credits, false otherwise
 */
export async function hasEnoughCredits(userId: string, requiredCredits: number = 1) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error checking credits:', error);
    return false;
  }

  return (data?.balance || 0) >= requiredCredits;
}

/**
 * Check if a user is an admin
 * 
 * This function queries the user_profiles table to check if the user
 * has the admin role.
 * 
 * @param userId - The ID of the user to check
 * @returns True if the user is an admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data?.role === 'admin';
} 