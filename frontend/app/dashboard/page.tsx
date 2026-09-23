"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMe, getScheduledEmails, getSentEmails, getEmailStats } from "@/lib/api";
import { User, ScheduledEmail, SentEmail, EmailStats, Pagination } from "@/types/email";
import Header from "@/components/Header";
import StatsCards from "@/components/StatsCards";
import { ScheduledEmailTable, SentEmailTable } from "@/components/EmailTable";
import ComposeModal from "@/components/ComposeModal";
import { PlusCircle, RefreshCw, Calendar, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

type Tab = "scheduled" | "sent";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("scheduled");
  const [composeOpen, setComposeOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [scheduledPagination, setScheduledPagination] = useState<Pagination | null>(null);
  const [scheduledPage, setScheduledPage] = useState(1);

  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentPagination, setSentPagination] = useState<Pagination | null>(null);
  const [sentPage, setSentPage] = useState(1);

  const [stats, setStats] = useState<EmailStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    getMe().then((me: User | null) => {
      if (!me) {
        router.replace("/");
        return;
      }
      setUser(me);
      setAuthLoading(false);
    });
  }, [router]);

  const fetchScheduled = useCallback(async (page: number) => {
    setScheduledLoading(true);
    try {
      const res = await getScheduledEmails({ page, limit: 20 });
      if (res.success && res.data) {
        setScheduledEmails(res.data);
        setScheduledPagination(res.pagination ?? null);
      }
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  const fetchSent = useCallback(async (page: number) => {
    setSentLoading(true);
    try {
      const res = await getSentEmails({ page, limit: 20 });
      if (res.success && res.data) {
        setSentEmails(res.data);
        setSentPagination(res.pagination ?? null);
      }
    } finally {
      setSentLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getEmailStats();
      if (res.success && res.data) setStats(res.data);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchScheduled(scheduledPage);
    fetchSent(sentPage);
    fetchStats();
  }, [authLoading, tick, fetchScheduled, fetchSent, fetchStats, scheduledPage, sentPage]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  function refresh() {
    setTick((t) => t + 1);
  }

  function onScheduled(count: number) {
    console.log("scheduled", count, "email(s)");
    setTimeout(refresh, 500);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070a10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a10]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[500px] h-[300px] bg-violet-600/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-[10%] w-[400px] h-[300px] bg-indigo-600/4 rounded-full blur-[80px]" />
      </div>

      <Header user={user} />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Email Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Manage your scheduled and sent email campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="refresh-btn"
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/[0.08] rounded-xl text-white/60 hover:text-white text-sm font-medium transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${statsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              id="compose-btn"
              onClick={() => setComposeOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              Compose New Email
            </button>
          </div>
        </div>

        <StatsCards stats={stats} loading={statsLoading} />

        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
          {(
            [
              { id: "scheduled", label: "Scheduled", icon: Calendar, count: stats?.scheduled },
              { id: "sent", label: "Sent", icon: CheckCircle2, count: stats?.sent },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-white/40 hover:text-white/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${active ? "bg-white/20 text-white" : "bg-white/10 text-white/50"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div>
          {activeTab === "scheduled" && (
            <div className="space-y-4">
              <ScheduledEmailTable emails={scheduledEmails} loading={scheduledLoading} />
              <PageBar pagination={scheduledPagination} page={scheduledPage} onChange={setScheduledPage} />
            </div>
          )}
          {activeTab === "sent" && (
            <div className="space-y-4">
              <SentEmailTable emails={sentEmails} loading={sentLoading} />
              <PageBar pagination={sentPagination} page={sentPage} onChange={setSentPage} />
            </div>
          )}
        </div>
      </main>

      <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} onSuccess={onScheduled} />
    </div>
  );
}

function PageBar({ pagination, page, onChange }: { pagination: Pagination | null; page: number; onChange: (p: number) => void }) {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-white/40 text-sm">
        Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total} emails
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] rounded-lg text-white/60 text-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="px-3 py-2 text-white/60 text-sm">Page {page} of {pagination.pages}</span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pagination.pages}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/[0.08] rounded-lg text-white/60 text-sm transition-all"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
