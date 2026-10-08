import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Database } from "@/lib/db";

export interface SessionPayload {
  role: "team" | "admin";
  teamId?: string;
  teamCode?: string;
  teamName?: string;
  email?: string;
  createdAt: number;
}

const SESSION_COOKIE_NAME = "gwd_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "gwd-event-secret-key-99482914872194";

// Rate limiter storage
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 600000): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  if (now - entry.firstAttempt > windowMs) {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= maxAttempts;
}

export function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}

export function signToken(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const base64Data = Buffer.from(data).toString("base64url");
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(base64Data).digest("base64url");
  return `${base64Data}.${hmac}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [base64Data, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(base64Data).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const json = Buffer.from(base64Data, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as SessionPayload;
    // Session expires after 24 hours
    if (Date.now() - payload.createdAt > 86400000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSession(req: NextRequest): SessionPayload | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifyToken(cookie.value);
}

export function attachSessionCookie(res: NextResponse, payload: SessionPayload): NextResponse {
  const token = signToken(payload);
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 86400, // 24 hours
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
