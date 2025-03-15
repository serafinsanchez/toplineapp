'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Admin Free Trial Reset Page
 * 
 * This page allows administrators to reset a user's free trial usage
 * by providing their IP address.
 * 
 * Authentication: Requires an authenticated user with admin role
 */
export default function AdminFreeTrial() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clientIp, setClientIp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  /**
   * Handle form submission to reset free trial
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientIp) {
      setError('Client IP is required');
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch(`/api/admin/free-trial/reset?clientIp=${encodeURIComponent(clientIp)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset free trial');
      }
      
      setMessage(data.message || 'Free trial reset successfully');
      setClientIp('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin: Reset Free Trial</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="clientIp" className="block text-sm font-medium text-gray-700 mb-1">
              Client IP Address
            </label>
            <input
              type="text"
              id="clientIp"
              value={clientIp}
              onChange={(e) => setClientIp(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Resetting...' : 'Reset Free Trial'}
          </button>
        </form>
      </div>
      
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <p className="mb-2">
          This tool allows administrators to reset a user's free trial usage. Enter the client IP address
          of the user whose free trial you want to reset.
        </p>
        <p className="text-sm text-gray-600">
          Note: This will delete the user's record from the free_trial_usage table, allowing them to use
          the free trial again. This should only be used in exceptional circumstances.
        </p>
      </div>
    </div>
  );
} 