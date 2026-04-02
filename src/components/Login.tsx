import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, ScanFace, Calendar, UserCircle, HelpCircle, Mic, Sparkles, Link as LinkIcon, LockOpen } from 'lucide-react';
import HelpModal from './HelpModal';

export default function Login() {
  const { signInWithGoogle, signInAsGuest, loading, isFaceLocked, isBackgroundLocked, unlockWithFaceId, unlockBackground, signOut, profile } = useAuth();
  const [error, setError] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('auth/unauthorized-domain')) {
        setError(`Domain not authorized. Please add exactly this domain to Firebase Auth Authorized Domains: ${window.location.hostname}`);
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
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
    if (isFaceLocked) {
      setIsScanning(true);
      // Simulate face scan delay
      setTimeout(() => {
        setIsScanning(false);
        unlockWithFaceId();
      }, 1500);
    } else {
      alert('Facial Recognition is a Premium Feature. Please login with Google first to upgrade your account.');
    }
  };

  const isLocked = isFaceLocked || isBackgroundLocked;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 text-blue-600">
          <Calendar className="h-8 w-8" />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">HomeCal</span>
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          title="Help & Information"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Your smart <span className="text-blue-600">electronic calendar</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0">
            Manage your appointments, dictate your agenda, and seamlessly organize your life using natural language and voice commands.
          </p>
          
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-2xl border border-slate-200 max-w-2xl mx-auto lg:mx-0">
            <img
              src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=1200&h=675"
              alt="Calendar and Coffee"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              {isLocked ? 'Welcome Back' : 'Get Started'}
            </h2>
            <p className="text-slate-500 mt-2">
              {isLocked ? `Unlock to access your calendar` : 'Sign in to access your calendar'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center break-words">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {isFaceLocked ? (
              <>
                <div className="flex justify-center mb-8">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isScanning ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                    <ScanFace className={`w-12 h-12 ${isScanning ? 'animate-bounce' : ''}`} />
                  </div>
                </div>
                <button
                  onClick={handleFaceLogin}
                  disabled={isScanning}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-sm disabled:opacity-70"
                >
                  <ScanFace className="w-5 h-5" />
                  {isScanning ? 'Scanning Face...' : 'Unlock with Face ID'}
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm"
                >
                  Sign Out Completely
                </button>
              </>
            ) : isBackgroundLocked ? (
              <>
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                    <Calendar className="w-12 h-12" />
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 mb-6">
                  App is running in the background to receive alerts.
                </p>
                <button
                  onClick={unlockBackground}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <LockOpen className="w-5 h-5" />
                  Unlock App
                </button>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm"
                >
                  Sign Out Completely
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Continue with Google
                </button>

                <button
                  onClick={handleGuestLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors font-medium shadow-sm"
                >
                  <UserCircle className="w-5 h-5 text-slate-500" />
                  Test Drive as Guest
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-slate-400 font-medium tracking-wide text-xs uppercase">Premium Feature</span>
                  </div>
                </div>

                <button
                  onClick={handleFaceLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-sm"
                >
                  <ScanFace className="w-5 h-5" />
                  Face Login
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to stay organized</h2>
            <p className="mt-4 text-lg text-slate-600">Powerful features designed to save you time and keep your life on track.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Mic className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Voice-Activated Agenda</h3>
              <p className="text-slate-600 leading-relaxed">
                Interact with your calendar hands-free. Ask about your upcoming appointments, dictate new events, and get a daily briefing of your schedule.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Event Extraction</h3>
              <p className="text-slate-600 leading-relaxed">
                Upload documents, images, or paste text. Our AI automatically extracts dates, times, and details to instantly populate your calendar.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <LinkIcon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Seamless Integrations</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect your existing Google, Apple, or Microsoft calendars. Keep all your schedules synchronized in one beautiful, intelligent dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-100 text-center">
        <p className="text-slate-500">© {new Date().getFullYear()} HomeCal. All rights reserved.</p>
      </footer>

      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}
