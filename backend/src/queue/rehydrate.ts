import { EmailStatus } from "@prisma/client";
import prisma from "../db/client";
import { emailQueue } from "./queue";

export async function rehydrateQueue() {
  console.log("checking for pending emails in db...");

  const now = new Date();

  const pending = await prisma.email.findMany({
    where: { status: { in: [EmailStatus.SCHEDULED, EmailStatus.SENDING] } },
    orderBy: { sendAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("no pending emails found");
    return;
  }

  console.log(`found ${pending.length} pending email(s), rehydrating...`);

  let added = 0;
  let skipped = 0;

  for (const email of pending) {
    if (email.status === EmailStatus.SENDING) {
      await prisma.email.update({
        where: { id: email.id },
        data: { status: EmailStatus.SCHEDULED },
      });
    }

    const delay = Math.max(email.sendAt.getTime() - now.getTime(), 5000);

    try {
      await emailQueue.add("send-email", { emailId: email.id }, { jobId: email.id, delay });
      added++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists")) {
        skipped++;
      } else {
        console.error(`could not requeue ${email.id}:`, msg);
      }
    }
  }

  console.log(`rehydration done: ${added} added, ${skipped} already queued`);
}
