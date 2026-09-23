import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import prisma from "../db/client";

declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    passport?: { user: string };
  }
}

const router = Router();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/callback",
      scope: ["profile", "email"],
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "";
        const avatar = profile.photos?.[0]?.value || "";

        const user = await prisma.user.upsert({
          where: { googleId },
          update: { name, avatar, email },
          create: { googleId, email, name, avatar },
        });

        return done(null, { id: user.id } as Express.User);
      } catch (err) {
        return done(err instanceof Error ? err : new Error(String(err)));
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ? ({ id: user.id } as Express.User) : null);
  } catch (err) {
    done(err);
  }
});

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}?error=auth_failed`,
    session: true,
  }),
  (req: Request, res: Response) => {
    if (req.user) {
      req.session.userId = (req.user as { id: string }).id;
    }
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`);
  }
);

router.get("/me", async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    res.status(401).json({ success: false, error: "not authenticated" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ success: false, error: "user not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: "internal server error" });
  }
});

router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "logged out" });
    });
  });
});

export { passport };
export default router;
