"use client";

import { useState, useRef } from "react";
import { X, Mail, Clock, Users, Send, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { scheduleEmails } from "@/lib/api";
import { ScheduleEmailRequest } from "@/types/email";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface FormState {
  sender: string;
  subject: string;
  body: string;
  recipients: string;
  sendAt: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

function parseEmails(raw: string) {
  return raw
    .split(/[\n,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export default function ComposeModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const defaultForm = { sender: "", subject: "", body: "", recipients: "", sendAt: "", delayBetweenMs: 1000, hourlyLimit: 50 };

  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emails = parseEmails(form.recipients);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setForm((prev) => ({ ...prev, recipients: prev.recipients ? prev.recipients + "\n" + content : content }));
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (emails.length === 0) {
      setError("please enter at least one valid email address");
      return;
    }

    const sendAt = new Date(form.sendAt);
    if (sendAt <= new Date()) {
      setError("send time must be in the future");
      return;
    }

    setLoading(true);
    try {
      const payload: ScheduleEmailRequest = {
        recipients: emails,
        subject: form.subject,
        body: form.body,
        sender: form.sender,
        sendAt: sendAt.toISOString(),
        delayBetweenMs: Number(form.delayBetweenMs),
        hourlyLimit: Number(form.hourlyLimit),
      };

      const res = await scheduleEmails(payload);
      if (res.success && res.data) {
        onSuccess(res.data.scheduled);
        setToast(`${res.data.scheduled} email(s) scheduled`);
        setTimeout(() => {
          setToast(null);
          onClose();
          setForm(defaultForm);
        }, 1500);
      } else {
        setError(res.error || "something went wrong");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const minDatetime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-modal-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#1a1f2e] to-[#0f1117]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Compose New Email</h2>
              <p className="text-white/40 text-xs">Schedule a batch email campaign</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {toast && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {toast}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scroll">
          <div className="space-y-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">From (Sender Email)</label>
            <input
              name="sender"
              type="email"
              required
              value={form.sender}
              onChange={handleChange}
              placeholder="campaign@yourdomain.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Recipients</label>
              <div className="flex items-center gap-2">
                {emails.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-600/20 rounded-full text-violet-400 text-xs font-medium">
                    <Users className="w-3 h-3" />
                    {emails.length} detected
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 text-xs transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Upload CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              </div>
            </div>
            <textarea
              name="recipients"
              required
              value={form.recipients}
              onChange={handleChange}
              placeholder="alice@example.com, bob@example.com&#10;or paste CSV — one per line or comma-separated"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all resize-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Subject</label>
            <input
              name="subject"
              type="text"
              required
              value={form.subject}
              onChange={handleChange}
              placeholder="Your email subject line"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Body</label>
            <textarea
              name="body"
              required
              value={form.body}
              onChange={handleChange}
              placeholder="Write your email content here..."
              rows={5}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Start Time
            </label>
            <input
              name="sendAt"
              type="datetime-local"
              required
              min={minDatetime}
              value={form.sendAt}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all [color-scheme:dark]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Delay Between Emails (ms)</label>
              <input
                name="delayBetweenMs"
                type="number"
                min={0}
                max={60000}
                value={form.delayBetweenMs}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs font-medium uppercase tracking-wider">Hourly Limit</label>
              <input
                name="hourlyLimit"
                type="number"
                min={1}
                max={500}
                value={form.hourlyLimit}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#0a0d14]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || emails.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Schedule {emails.length > 0 ? `${emails.length} Email${emails.length !== 1 ? "s" : ""}` : "Emails"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
