import {
  ApiResponse,
  ScheduleEmailRequest,
  ScheduleResponse,
  ScheduledEmail,
  SentEmail,
  User,
  EmailStats,
} from "@/types/email";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await res.json();

  if (!res.ok && !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export async function getMe(): Promise<User | null> {
  try {
    const res = await apiFetch<User>("/api/auth/me");
    return res.data ?? null;
  } catch {
    return null;
  }
}

export function getGoogleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

export async function logout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}

export async function scheduleEmails(
  payload: ScheduleEmailRequest
): Promise<ApiResponse<ScheduleResponse>> {
  return apiFetch<ScheduleResponse>("/api/emails/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface GetEmailsOptions {
  page?: number;
  limit?: number;
}

export async function getScheduledEmails(
  opts: GetEmailsOptions = {}
): Promise<ApiResponse<ScheduledEmail[]>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ScheduledEmail[]>(`/api/emails/scheduled${query}`);
}

export async function getSentEmails(
  opts: GetEmailsOptions = {}
): Promise<ApiResponse<SentEmail[]>> {
  const params = new URLSearchParams();
  if (opts.page) params.set("page", String(opts.page));
  if (opts.limit) params.set("limit", String(opts.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<SentEmail[]>(`/api/emails/sent${query}`);
}

export async function getEmailStats(): Promise<ApiResponse<EmailStats>> {
  return apiFetch<EmailStats>("/api/emails/stats");
}

export async function cancelEmail(id: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/api/emails/${id}`, { method: "DELETE" });
}
