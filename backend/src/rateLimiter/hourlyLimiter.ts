import { redisClient } from "../queue/redis";

const MAX_PER_HOUR = Number(process.env.MAX_EMAILS_PER_HOUR) || 50;

function getKey(sender: string) {
  const d = new Date();
  const window = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCHours()).padStart(2, "0")}`;
  return `rate:${sender}:${window}`;
}

export function msUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  msUntilReset: number;
}

export async function getSenderLimit(sender: string): Promise<number> {
  const customLimit = await redisClient.get(`sender-limit:${sender}`);
  if (customLimit) return parseInt(customLimit, 10);
  return Number(process.env.MAX_EMAILS_PER_HOUR) || 50;
}

export async function checkAndIncrement(sender: string): Promise<RateLimitResult> {
  const limit = await getSenderLimit(sender);
  const key = getKey(sender);
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, 3600);
  }

  const allowed = count <= limit;

  if (!allowed) {
    await redisClient.decr(key);
    const resetMs = msUntilNextHour();
    console.warn(`rate limit reached for ${sender} (${count - 1}/${limit}), retry in ${Math.ceil(resetMs / 1000)}s`);
    return { allowed: false, currentCount: limit, limit, msUntilReset: resetMs };
  }

  return { allowed: true, currentCount: count, limit, msUntilReset: msUntilNextHour() };
}

export async function getCurrentCount(sender: string) {
  const val = await redisClient.get(getKey(sender));
  return val ? parseInt(val, 10) : 0;
}
