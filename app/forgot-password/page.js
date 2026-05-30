"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Key, Lock, Loader2, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

const CODE_PATTERN = /^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/i;

function formatCodeInput(raw) {
  const clean = raw.replace(/[^A-Z2-9]/gi, '').toUpperCase().slice(0, 25);
  const parts = [];
  for (let i = 0; i < clean.length; i += 5) {
    parts.push(clean.slice(i, i + 5));
  }
  return parts.join('-');
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  // step: 'verify' | 'reset' | 'done'
  const [step, setStep] = useState('verify');
  const [username, setUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeInput = (e) => {
    setRecoveryCode(formatCodeInput(e.target.value));
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!CODE_PATTERN.test(recoveryCode)) {
      setError('Recovery code must be in the format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), recoveryCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetToken(data.resetToken);
        setStep('reset');
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/recovery/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep('done');
      } else {
        setError(data.message || 'Failed to reset password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 overflow-hidden font-sans">
      {/* Left Side */}
      <div className="w-full md:w-5/12 lg:w-1/2 flex items-center justify-center lg:p-12 relative z-10">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-40 pointer-events-none" />

        <div className="w-full max-w-md relative">

          {/* Step: Verify */}
          {step === 'verify' && (
            <>
              <div className="mb-10">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 mb-6 transition-colors">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  Forgot Password
                </h1>
                <p className="text-gray-500 text-base leading-relaxed">
                  Enter your username and the one-time recovery code provided by your administrator.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 leading-relaxed">
                <strong>Important:</strong> Recovery codes are single-use. Once used, the code will be invalidated and you will need a new one from your administrator.
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3 shadow-sm">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">User ID</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your user ID"
                      required
                      className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Recovery Code</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={handleCodeInput}
                      placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                      required
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm font-mono tracking-widest"
                    />
                  </div>
                  <p className="text-xs text-gray-400 ml-1">Enter the code exactly as given. Hyphens are added automatically.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E3B68] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a4d80] active:scale-[0.99] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin h-5 w-5" /><span>Verifying...</span></>
                  ) : (
                    <><ShieldCheck className="w-5 h-5 opacity-80" /><span>Verify Recovery Code</span></>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-gray-400 text-sm">
                &copy; 2024 Metroview Baptist Academy. All rights reserved.
              </div>
            </>
          )}

          {/* Step: Set new password */}
          {step === 'reset' && (
            <>
              <div className="mb-10">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  Set New Password
                </h1>
                <p className="text-gray-500 text-base leading-relaxed">
                  Your recovery code was verified. Choose a new strong password.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3 shadow-sm">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">New Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E3B68] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a4d80] active:scale-[0.99] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin h-5 w-5" /><span>Resetting...</span></>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-gray-400 text-sm">
                &copy; 2024 Metroview Baptist Academy. All rights reserved.
              </div>
            </>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                Password Reset!
              </h1>
              <p className="text-gray-500 text-base leading-relaxed mb-8">
                Your password has been successfully reset. Your recovery code has been invalidated. You can now log in with your new password.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full bg-[#0E3B68] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#1a4d80] transition-all duration-200 shadow-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Login
              </Link>
              <div className="mt-8 text-center text-gray-400 text-sm">
                &copy; 2024 Metroview Baptist Academy. All rights reserved.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Branding */}
      <div className="hidden md:flex w-7/12 lg:w-1/2 bg-gradient-to-b from-[#1c4d85] via-[#0E3B68] to-[#061d36] flex-col items-center justify-center text-white p-12 relative shadow-2xl rounded-tl-[50px] rounded-bl-[50px]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute top-20 right-20 w-80 h-80 bg-blue-400 rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-10 left-10 w-60 h-60 bg-blue-300 rounded-full blur-[100px] opacity-10" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-lg">
          <div className="w-48 h-48 mb-10 relative group">
            <div className="absolute inset-[-10px] bg-gradient-to-tr from-yellow-400 via-yellow-200 to-cyan-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="w-full h-full rounded-full bg-white shadow-2xl flex items-center justify-center relative overflow-hidden ring-4 ring-yellow-500/50">
              <img src="/logo.png" alt="MVBA Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight drop-shadow-md">MVBA</h2>
          <div className="w-24 h-1 bg-yellow-400 rounded-full mb-6 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
          <p className="text-xl lg:text-2xl text-blue-100 font-light tracking-wide">
            Enrollment and Student <br /> Information System
          </p>
        </div>
      </div>
    </div>
  );
}
