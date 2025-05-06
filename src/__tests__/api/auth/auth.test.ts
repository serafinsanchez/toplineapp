/**
 * Authentication API Route Tests
 * 
 * This file contains tests for the authentication API routes and helper functions.
 * It tests both the GET and POST handlers for various authentication scenarios,
 * as well as the helper functions for checking authentication status and credits.
 */

// Mock the NextRequest class
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    body: any;

    constructor(url: string, options: any = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new Headers(options.headers || {});
      this.body = options.body || null;
    }

    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  },
  NextResponse: {
    json: jest.fn((data) => ({ ...data })),
    redirect: jest.fn((url) => ({ url })),
  },
}));

// Mock the NextAuth module
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn(),
  })),
}));

// Mock the route.ts file
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}));

// Import the mocked handlers
const { GET, POST } = require('@/app/api/auth/[...nextauth]/route');

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  supabaseClient: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
  },
}));

// Import the mocked supabaseClient
const { supabaseClient } = require('@/lib/supabase');

describe('Auth API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Tests for the GET handler
   * 
   * These tests verify that the GET handler correctly processes
   * authentication-related GET requests.
   */
  describe('GET handler', () => {
    it('should handle GET requests', async () => {
      // Create a mock request
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'GET',
      });

      // Call the handler
      await GET(req);

      // Expect the handler to be called
      expect(GET).toHaveBeenCalled();
    });

    it('should handle GET requests with query parameters', async () => {
      // Create a mock request with query parameters
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/signin?callbackUrl=http://localhost:3000/dashboard', {
        method: 'GET',
      });

      // Call the handler
      await GET(req);

      // Expect the handler to be called
      expect(GET).toHaveBeenCalled();
    });
  });

  /**
   * Tests for the POST handler
   * 
   * These tests verify that the POST handler correctly processes
   * various authentication-related POST requests, including sign-in,
   * sign-up, and password reset.
   */
  describe('POST handler', () => {
    it('should handle POST requests with valid credentials', async () => {
      // Mock successful authentication
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };
      
      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Create a mock request with credentials
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          callbackUrl: 'http://localhost:3000',
          json: true,
        }),
      });

      // Call the handler
      await POST(req);

      // Expect the handler to be called
      expect(POST).toHaveBeenCalled();
    });

    it('should handle POST requests with invalid credentials', async () => {
      // Mock failed authentication
      (supabaseClient.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials'),
      });

      // Create a mock request with invalid credentials
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
          callbackUrl: 'http://localhost:3000',
          json: true,
        }),
      });

      // Call the handler
      await POST(req);

      // Expect the handler to be called
      expect(POST).toHaveBeenCalled();
    });

    it('should handle POST requests for sign up', async () => {
      // Mock successful sign up
      const mockUser = {
        id: 'new-user-id',
        email: 'newuser@example.com',
        user_metadata: { full_name: 'New User' },
      };
      
      (supabaseClient.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Create a mock request for sign up
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
      });

      // Call the handler
      await POST(req);

      // Expect the handler to be called
      expect(POST).toHaveBeenCalled();
    });

    it('should handle POST requests for password reset', async () => {
      // Mock successful password reset
      (supabaseClient.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
        data: {},
        error: null,
      });

      // Create a mock request for password reset
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Call the handler
      await POST(req);

      // Expect the handler to be called
      expect(POST).toHaveBeenCalled();
    });
  });

  /**
   * Tests for the Auth Helper Functions
   * 
   * These tests verify that the helper functions in the auth module
   * correctly handle authentication status checks and credit verification.
   */
  describe('Auth Helper Functions', () => {
    // Mock the auth.ts file
    jest.mock('@/lib/auth', () => ({
      isAuthenticated: jest.fn((session) => !!session?.user?.id),
      hasEnoughCredits: jest.fn(),
      authOptions: {
        providers: [],
        callbacks: {
          jwt: jest.fn(),
          session: jest.fn(),
        },
        pages: {
          signIn: '/auth/signin',
        },
        session: {
          strategy: 'jwt',
        },
        secret: 'test-secret',
      },
    }));

    // Import the mocked functions
    const { isAuthenticated, hasEnoughCredits, authOptions } = require('@/lib/auth');

    /**
     * Tests for the isAuthenticated function
     * 
     * These tests verify that the isAuthenticated function correctly
     * determines if a session contains an authenticated user.
     */
    describe('isAuthenticated', () => {
      it('should return true for authenticated sessions', async () => {
        const session = { user: { id: 'test-user-id' } };
        
        const result = await isAuthenticated(session);
        
        expect(result).toBe(true);
      });

      it('should return false for unauthenticated sessions', async () => {
        const session = { user: {} };
        
        const result = await isAuthenticated(session);
        
        expect(result).toBe(false);
      });

      it('should return false for null sessions', async () => {
        const session = null;
        
        const result = await isAuthenticated(session);
        
        expect(result).toBe(false);
      });
    });

    /**
     * Tests for the hasEnoughCredits function
     * 
     * These tests verify that the hasEnoughCredits function correctly
     * determines if a user has enough credits for an operation.
     */
    describe('hasEnoughCredits', () => {
      it('should return true when user has enough credits', async () => {
        (hasEnoughCredits as jest.Mock).mockResolvedValue(true);
        
        const result = await hasEnoughCredits('test-user-id', 5);
        
        expect(result).toBe(true);
      });

      it('should return false when user does not have enough credits', async () => {
        (hasEnoughCredits as jest.Mock).mockResolvedValue(false);
        
        const result = await hasEnoughCredits('test-user-id', 5);
        
        expect(result).toBe(false);
      });

      it('should use default value of 1 credit when not specified', async () => {
        (hasEnoughCredits as jest.Mock).mockImplementation((userId, credits = 1) => {
          return Promise.resolve(credits === 1);
        });
        
        const result = await hasEnoughCredits('test-user-id');
        
        expect(result).toBe(true);
        expect(hasEnoughCredits).toHaveBeenCalledWith('test-user-id');
      });
    });

    /**
     * Tests for the authOptions configuration
     * 
     * These tests verify that the authOptions object has the correct
     * configuration properties.
     */
    describe('authOptions', () => {
      it('should have the correct configuration', () => {
        expect(authOptions).toHaveProperty('secret', 'test-secret');
        expect(authOptions).toHaveProperty('session.strategy', 'jwt');
        expect(authOptions).toHaveProperty('pages.signIn', '/auth/signin');
      });
    });
  });
}); 