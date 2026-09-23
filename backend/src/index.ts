import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import RedisStore from "connect-redis";

import { connectRedis, redisClient } from "./queue/redis";
import { initMailer } from "./mailer/ethereal";
import { startWorker } from "./queue/worker";
import { rehydrateQueue } from "./queue/rehydrate";
import authRouter, { passport } from "./api/auth.routes";
import emailRouter from "./api/email.routes";

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

async function bootstrap() {
  await connectRedis();
  await initMailer();

  const app = express();

  app.use(cors({ origin: FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  const store = new RedisStore({ client: redisClient as any, prefix: "sess:" });

  app.use(
    session({
      store,
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/emails", emailRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: "not found" });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ success: false, error: "something went wrong" });
  });

  startWorker();
  await rehydrateQueue();

  app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
  });

  process.on("SIGTERM", () => process.exit(0));
  process.on("SIGINT", () => process.exit(0));
}

bootstrap().catch((err) => {
  console.error("failed to start:", err);
  process.exit(1);
});
