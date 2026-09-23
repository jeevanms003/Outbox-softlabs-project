"use client";

import { User } from "@/types/email";
import { logout, getGoogleLoginUrl } from "@/lib/api";
import { LogOut, Mail, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0a0d14]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-bold text-lg tracking-tight">ReachInbox</span>
            <span className="text-white/30 text-sm">·</span>
            <span className="text-white/40 text-sm font-medium">Scheduler</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="rounded-full ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center">
                    <span className="text-violet-300 text-sm font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-white text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-white/60 hover:text-white text-sm font-medium transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <a
              href={getGoogleLoginUrl()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
            >
              <Mail className="w-4 h-4" />
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
