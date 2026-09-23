export type EmailStatus = "SCHEDULED" | "SENDING" | "SENT" | "FAILED";

export interface Email {
  id: string;
  recipient: string;
  subject: string;
  sender: string;
  sendAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  errorMsg?: string | null;
  previewUrl?: string | null;
  batchId?: string | null;
  createdAt: string;
}

export interface ScheduledEmail
  extends Pick<Email, "id" | "recipient" | "subject" | "sender" | "sendAt" | "status" | "batchId" | "createdAt"> {}

export interface SentEmail
  extends Pick<Email, "id" | "recipient" | "subject" | "sender" | "sendAt" | "sentAt" | "status" | "errorMsg" | "previewUrl" | "batchId" | "createdAt"> {}

export interface ScheduleEmailRequest {
  recipients: string[];
  subject: string;
  body: string;
  sender: string;
  sendAt: string;
  delayBetweenMs?: number;
  hourlyLimit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
  pagination?: Pagination;
}

export interface ScheduleResponse {
  batchId: string;
  scheduled: number;
  message: string;
}

export interface EmailStats {
  scheduled: number;
  sending: number;
  sent: number;
  failed: number;
  total: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}
