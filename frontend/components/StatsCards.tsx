"use client";

import { EmailStats } from "@/types/email";
import { Calendar, CheckCircle2, XCircle, Loader2, BarChart3 } from "lucide-react";

interface StatsCardsProps {
  stats: EmailStats | null;
  loading: boolean;
}

const cards = [
  {
    key: "scheduled" as keyof EmailStats,
    label: "Scheduled",
    icon: Calendar,
    gradient: "from-blue-600/20 to-blue-800/10",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  {
    key: "sending" as keyof EmailStats,
    label: "Sending",
    icon: Loader2,
    gradient: "from-amber-600/20 to-amber-800/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20",
    spin: true,
  },
  {
    key: "sent" as keyof EmailStats,
    label: "Sent",
    icon: CheckCircle2,
    gradient: "from-emerald-600/20 to-emerald-800/10",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  {
    key: "failed" as keyof EmailStats,
    label: "Failed",
    icon: XCircle,
    gradient: "from-red-600/20 to-red-800/10",
    iconColor: "text-red-400",
    borderColor: "border-red-500/20",
  },
];

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key] ?? 0;
        return (
          <div
            key={String(card.key)}
            className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.gradient} p-5`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/5">
                <Icon
                  className={`w-4 h-4 ${card.iconColor} ${
                    card.spin && (stats?.sending ?? 0) > 0 ? "animate-spin" : ""
                  }`}
                />
              </div>
              <BarChart3 className="w-4 h-4 text-white/10" />
            </div>
            <div>
              {loading ? (
                <div className="h-8 w-16 bg-white/10 rounded-lg animate-pulse mb-1" />
              ) : (
                <p className="text-3xl font-bold text-white tracking-tight">
                  {value.toLocaleString()}
                </p>
              )}
              <p className="text-white/40 text-sm font-medium mt-0.5">{card.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
