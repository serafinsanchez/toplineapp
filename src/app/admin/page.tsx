'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

/**
 * Admin Dashboard Page
 * 
 * This is the main admin dashboard page that provides links to
 * various admin tools and features.
 */
export default function AdminDashboard() {
  const { data: session } = useSession();
  
  const adminTools = [
    {
      title: 'Free Trial Management',
      description: 'Reset free trial usage for users',
      link: '/admin/free-trial',
      icon: '🔄',
    },
    // Add more admin tools here as needed
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Welcome, {session?.user?.name || 'Admin'}. Use the tools below to manage the application.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminTools.map((tool, index) => (
          <Link
            key={index}
            href={tool.link}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-4">{tool.icon}</div>
            <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
            <p className="text-gray-600">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
} 