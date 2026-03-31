import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, ScanFace, Calendar, UserCircle } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInAsGuest, loading } = useAuth();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google');
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAsGuest();
    } catch (err) {
      setError('Failed to sign in as Guest');
    }
  };

  const handleFaceLogin = () => {
    // In a real app, this would use WebAuthn or a Face Recognition API
    alert('Facial Recognition is a Premium Feature. Please login with Google first to upgrade your account.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">HomeCal</h2>
          <p className="text-slate-500 mt-2">Your smart electronic calendar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>

          <button
            onClick={handleGuestLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium"
          >
            <UserCircle className="w-5 h-5 text-slate-500" />
            Test Drive as Guest
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Premium Feature</span>
            </div>
          </div>

          <button
            onClick={handleFaceLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
          >
            <ScanFace className="w-5 h-5" />
            Face Login
          </button>
        </div>
      </div>
    </div>
  );
}
