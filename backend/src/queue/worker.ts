import { Worker, Job } from "bullmq";
import { EmailStatus } from "@prisma/client";
import prisma from "../db/client";
import { sendMail } from "../mailer/ethereal";
import { checkAndIncrement, msUntilNextHour } from "../rateLimiter/hourlyLimiter";
import { redisConnection } from "./redis";
import { EMAIL_QUEUE_NAME } from "./queue";

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const MIN_DELAY = Number(process.env.MIN_DELAY_MS) || 1000;

export interface EmailJobData {
  emailId: string;
}

async function processJob(job: Job<EmailJobData>) {
  const { emailId } = job.data;

  const email = await prisma.email.findUnique({ where: { id: emailId } });

  if (!email) {
    console.warn("email not found, skipping:", emailId);
    return;
  }

  if (email.status === EmailStatus.SENT) {
    return;
  }

  const rateCheck = await checkAndIncrement(email.sender);

  if (!rateCheck.allowed) {
    const wait = msUntilNextHour() + 500;
    console.log(`rate limit hit for ${email.sender}, rescheduling in ${Math.ceil(wait / 1000)}s`);
    await job.moveToDelayed(Date.now() + wait, job.token);
    return;
  }

  await prisma.email.update({
    where: { id: emailId },
    data: { status: EmailStatus.SENDING },
  });

  try {
    await new Promise((r) => setTimeout(r, MIN_DELAY));

    const result = await sendMail({
      to: email.recipient,
      subject: email.subject,
      body: email.body,
      from: email.sender,
    });

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        previewUrl: result.previewUrl,
        errorMsg: null,
      },
    });

    console.log(`sent ${emailId}, preview: ${result.previewUrl}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`failed to send ${emailId}:`, errMsg);

    await prisma.email.update({
      where: { id: emailId },
      data: { status: EmailStatus.FAILED, errorMsg: errMsg },
    });

    throw err;
  }
}

let worker: Worker<EmailJobData> | null = null;

export function startWorker() {
  if (worker) return worker;

  worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processJob, {
    connection: redisConnection,
    concurrency: CONCURRENCY,
    limiter: {
      max: CONCURRENCY,
      duration: MIN_DELAY * CONCURRENCY,
    },
  });

  worker.on("completed", (job) => console.log(`job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`job ${job?.id} failed:`, err.message));
  worker.on("stalled", (jobId) => console.warn(`job ${jobId} stalled`));
  worker.on("error", (err) => console.error("worker error:", err.message));

  console.log(`worker started with concurrency ${CONCURRENCY}`);
  return worker;
}

export async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
