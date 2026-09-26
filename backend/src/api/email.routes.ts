import { Router, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import prisma from "../db/client";
import { emailQueue } from "../queue/queue";
import { requireAuth } from "../middleware/auth.middleware";
import { redisClient } from "../queue/redis";

const router = Router();

const scheduleSchema = z.object({
  recipients: z.array(z.string().email()).min(1).max(1000),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  sender: z.string().email(),
  sendAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  delayBetweenMs: z.number().int().min(0).optional().default(1000),
  hourlyLimit: z.number().int().min(1).max(500).optional().default(50),
});

router.post("/schedule", requireAuth, async (req: Request, res: Response) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;
  const sendAt = new Date(data.sendAt);

  if (sendAt <= new Date()) {
    res.status(400).json({ success: false, error: "sendAt must be in the future" });
    return;
  }

  const batchId = uuidv4();
  
  // Save the custom hourly limit for this sender in Redis
  try {
    await redisClient.set(`sender-limit:${data.sender}`, data.hourlyLimit);
  } catch (err) {
    console.error("failed to save sender limit:", err);
  }

  try {
    const chunkSize = 100;
    const created: string[] = [];

    for (let i = 0; i < data.recipients.length; i += chunkSize) {
      const chunk = data.recipients.slice(i, i + chunkSize);

      const rows = await prisma.$transaction(
        chunk.map((recipient, idx) =>
          prisma.email.create({
            data: {
              recipient,
              subject: data.subject,
              body: data.body,
              sender: data.sender,
              sendAt: new Date(sendAt.getTime() + (i + idx) * (data.delayBetweenMs ?? 1000)),
              batchId,
              status: "SCHEDULED",
            },
            select: { id: true, sendAt: true },
          })
        )
      );

      created.push(...rows.map((r) => r.id));

      for (const row of rows) {
        const delay = Math.max(row.sendAt.getTime() - Date.now(), 100);
        await emailQueue.add("send-email", { emailId: row.id }, { jobId: row.id, delay });
      }
    }

    res.status(201).json({
      success: true,
      data: { batchId, scheduled: created.length, message: `${created.length} email(s) scheduled` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("schedule error:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

router.get("/scheduled", requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { status: { in: ["SCHEDULED", "SENDING"] } },
        orderBy: { sendAt: "asc" },
        skip,
        take: limit,
        select: { id: true, recipient: true, subject: true, sender: true, sendAt: true, status: true, batchId: true, createdAt: true },
      }),
      prisma.email.count({ where: { status: { in: ["SCHEDULED", "SENDING"] } } }),
    ]);

    res.json({ success: true, data: emails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: "failed to fetch scheduled emails" });
  }
});

router.get("/sent", requireAuth, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: { status: { in: ["SENT", "FAILED"] } },
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
        select: { id: true, recipient: true, subject: true, sender: true, sendAt: true, sentAt: true, status: true, errorMsg: true, previewUrl: true, batchId: true, createdAt: true },
      }),
      prisma.email.count({ where: { status: { in: ["SENT", "FAILED"] } } }),
    ]);

    res.json({ success: true, data: emails, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: "failed to fetch sent emails" });
  }
});

router.get("/stats", requireAuth, async (_req: Request, res: Response) => {
  try {
    const [scheduled, sent, failed, sending] = await Promise.all([
      prisma.email.count({ where: { status: "SCHEDULED" } }),
      prisma.email.count({ where: { status: "SENT" } }),
      prisma.email.count({ where: { status: "FAILED" } }),
      prisma.email.count({ where: { status: "SENDING" } }),
    ]);
    res.json({ success: true, data: { scheduled, sent, failed, sending, total: scheduled + sent + failed + sending } });
  } catch (err) {
    res.status(500).json({ success: false, error: "failed to get stats" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const email = await prisma.email.findUnique({ where: { id } });
    if (!email) {
      res.status(404).json({ success: false, error: "not found" });
      return;
    }
    if (email.status !== "SCHEDULED") {
      res.status(400).json({ success: false, error: "can only cancel scheduled emails" });
      return;
    }

    const job = await emailQueue.getJob(id);
    if (job) await job.remove();

    await prisma.email.delete({ where: { id } });
    res.json({ success: true, message: "email cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, error: "failed to cancel" });
  }
});

export default router;
