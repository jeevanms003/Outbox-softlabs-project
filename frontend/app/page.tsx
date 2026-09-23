"use client";

import { getGoogleLoginUrl } from "@/lib/api";
import { Zap, ArrowRight, Shield, Clock, BarChart3 } from "lucide-react";

export default function LoginPage() {
  function handleGoogleLogin() {
    window.location.href = getGoogleLoginUrl();
  }

  return (
    <div className="min-h-screen bg-[#070a10] flex flex-col">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-purple-600/6 rounded-full blur-[80px]" />
      </div>

      <header className="relative z-10 w-full border-b border-white/[0.04] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">ReachInbox</span>
          <span className="text-white/20 text-sm">Scheduler</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600/10 border border-violet-500/20 rounded-full text-violet-400 text-sm font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Email Job Scheduler
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">
              Schedule Emails
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                With Zero Drops
              </span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed max-w-md mx-auto">
              Automated email scheduling with persistent queues, per-sender rate limiting, and real-time delivery status.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <Shield className="w-3.5 h-3.5" />, text: "No Duplicate Sends" },
              { icon: <Clock className="w-3.5 h-3.5" />, text: "Restart-Safe" },
              { icon: <BarChart3 className="w-3.5 h-3.5" />, text: "Rate Limited" },
            ].map((feat) => (
              <div
                key={feat.text}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full text-white/50 text-sm"
              >
                <span className="text-violet-400">{feat.icon}</span>
                {feat.text}
              </div>
            ))}
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-xl space-y-6">
            <div>
              <h2 className="text-white text-xl font-semibold mb-1">Get Started</h2>
              <p className="text-white/40 text-sm">Sign in with your Google account to access the dashboard</p>
            </div>

            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white hover:bg-gray-50 rounded-xl font-semibold text-gray-800 transition-all shadow-lg hover:shadow-xl group"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
              <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-white/20 text-xs text-center">
              By continuing, you agree to our terms of service and privacy policy
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
