"use client";

import { ScheduledEmail, SentEmail, EmailStatus } from "@/types/email";
import { ExternalLink, Clock, CheckCircle2, XCircle, Loader2, Mail, Inbox } from "lucide-react";

const statusConfig: Record<
  EmailStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    icon: <Clock className="w-3 h-3" />,
  },
  SENDING: {
    label: "Sending",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
  },
  SENT: {
    label: "Sent",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400 border-red-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
};

function StatusBadge({ status }: { status: EmailStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-4 bg-white/5 rounded-lg animate-pulse" style={{ width: `${60 + (j * 20) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={10}>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Inbox className="w-8 h-8 text-white/20" />
          </div>
          <div className="text-center">
            <p className="text-white/40 font-medium">{message}</p>
            <p className="text-white/20 text-sm mt-1">Your emails will appear here</p>
          </div>
        </div>
      </td>
    </tr>
  );
}

interface ScheduledTableProps {
  emails: ScheduledEmail[];
  loading: boolean;
}

export function ScheduledEmailTable({ emails, loading }: ScheduledTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Recipient
                </div>
              </th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Subject</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Sender</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Scheduled For</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <TableSkeleton cols={5} />
            ) : emails.length === 0 ? (
              <EmptyState message="No scheduled emails" />
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4 text-white/80 font-mono text-xs">
                    {email.recipient}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/80 font-medium line-clamp-1 max-w-[200px] block">
                      {email.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/40 font-mono text-xs">
                    {email.sender}
                  </td>
                  <td className="px-6 py-4 text-white/60 text-xs">
                    {formatDate(email.sendAt)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={email.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SentTableProps {
  emails: SentEmail[];
  loading: boolean;
}

export function SentEmailTable({ emails, loading }: SentTableProps) {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Recipient
                </div>
              </th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Subject</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Sender</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Sent At</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-white/40 font-medium text-xs uppercase tracking-wider">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <TableSkeleton cols={6} />
            ) : emails.length === 0 ? (
              <EmptyState message="No sent emails yet" />
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4 text-white/80 font-mono text-xs">
                    {email.recipient}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-white/80 font-medium line-clamp-1 max-w-[200px] block">
                        {email.subject}
                      </span>
                      {email.errorMsg && (
                        <span className="text-red-400/70 text-xs mt-0.5 block line-clamp-1">
                          {email.errorMsg}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white/40 font-mono text-xs">
                    {email.sender}
                  </td>
                  <td className="px-6 py-4 text-white/60 text-xs">
                    {formatDate(email.sentAt)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={email.status} />
                  </td>
                  <td className="px-6 py-4">
                    {email.previewUrl ? (
                      <a
                        href={email.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 rounded-lg text-violet-400 text-xs font-medium transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
