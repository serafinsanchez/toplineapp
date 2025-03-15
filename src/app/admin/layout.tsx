'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Admin Layout Component
 * 
 * This layout wraps all admin pages and ensures that only users with
 * admin privileges can access them.
 * 
 * It also provides a consistent navigation sidebar for admin pages.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check if the user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const response = await fetch('/api/profile');
          const data = await response.json();
          
          if (response.ok && data.role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            router.push('/');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          router.push('/');
        }
      } else if (status === 'unauthenticated') {
        router.push('/auth/signin');
      }
    };

    checkAdminStatus();
  }, [status, session, router]);

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  // Show loading state while checking session and admin status
  if (status === 'loading' || isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Verifying admin privileges</p>
        </div>
      </div>
    );
  }

  // Show access denied if not an admin
  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Access Denied</h2>
          <p className="text-gray-600 mb-4">You do not have permission to access this area.</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Admin Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/free-trial"
                className="block px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Free Trial Management
              </Link>
            </li>
            {/* Add more admin navigation links here */}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
} 