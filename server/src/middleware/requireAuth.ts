import type { NextFunction, Request, Response } from "express";
import { createClient, type User } from "@supabase/supabase-js";
import { env } from "../lib/env.js";

const supabaseAuthClient = env.supabaseUrl && env.supabaseAnonKey
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: { message: "Authentication required", status: 401 } });
    return;
  }

  if (!supabaseAuthClient) {
    res.status(503).json({ error: { message: "Authentication is not configured", status: 503 } });
    return;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: { message: "Invalid authentication token", status: 401 } });
    return;
  }

  req.user = data.user;
  next();
}