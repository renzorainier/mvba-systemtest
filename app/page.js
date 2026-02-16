"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Sending request to your backend route
      // Assuming the route file is at app/api/login/route.js -> /api/login
      // If your file is strictly at app/login/route.js, change this to '/login'
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Parse the JSON response
      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect on success
        router.push('/portal/dashboard');
      } else {
        // Show error message from backend
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 overflow-hidden font-sans">
      {/* Left Side - Login Form */}
      <div className="w-full md:w-5/12 lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative z-10">
        
        {/* Subtle Background Decoration for Left Side */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-40 pointer-events-none"></div>

        <div className="w-full max-w-md relative">
          <div className="mb-10">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-lg">
              Please enter your credentials to access the portal.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="mt-0.5">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">User ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your user ID"
                  className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm group-hover:border-gray-300"
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm group-hover:border-gray-300"
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                Forgot password?
              </a>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0E3B68] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a4d80] active:scale-[0.99] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <LogIn className="w-5 h-5 opacity-80" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-gray-400 text-sm">
            &copy; 2024 Metroview Baptist Academy. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Branding with Convex Curve Effect */}
      <div 
        className="hidden md:flex w-7/12 lg:w-1/2 bg-gradient-to-b from-[#1c4d85] via-[#0E3B68] to-[#061d36] flex-col items-center justify-center text-white p-12 relative shadow-2xl rounded-tl-[50px] rounded-bl-[50px]"
      >
        {/* Subtle texture/pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        {/* Decorative glows */}
        <div className="absolute top-20 right-20 w-80 h-80 bg-blue-400 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-blue-300 rounded-full blur-[100px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-lg">
          {/* Logo Section */}
          <div className="w-48 h-48 mb-10 relative group">
            {/* Custom Glow Effect: Gradient from Gold to Cyan/Blue to match the logo */}
            <div className="absolute inset-[-10px] bg-gradient-to-tr from-yellow-400 via-yellow-200 to-cyan-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
            
            {/* Logo Container */}
            <div className="w-full h-full rounded-full bg-white shadow-2xl flex items-center justify-center relative overflow-hidden ring-4 ring-yellow-500/50">
                <img 
                  src="/logo.png" 
                  alt="Metroview Baptist Academy Logo" 
                  className="w-full h-full object-cover"
                />
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight drop-shadow-md">
            Metroview Baptist <br/> Academy
          </h2>
          <div className="w-24 h-1 bg-yellow-400 rounded-full mb-6 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
          <p className="text-xl lg:text-2xl text-blue-100 font-light tracking-wide">
            Enrollment and Student <br/> Information System
          </p>
        </div>
      </div>
    </div>
  );
}