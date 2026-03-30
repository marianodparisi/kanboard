import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { ensureDatabaseReady, getPool } from "@/lib/mysql";
import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE_NAME = "kanboard_session";
const SESSION_DURATION_DAYS = 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function mysqlDate(daysFromNow = 0) {
  const value = new Date();
  value.setDate(value.getDate() + daysFromNow);
  return value;
}

function mapUser(row: {
  id: number;
  email: string;
  full_name: string;
  role: string;
}): SessionUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export async function authenticateUser(email: string, password: string) {
  await ensureDatabaseReady();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, email, full_name, role, password_hash
     FROM app_users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );
  const users = rows as Array<{
    id: number;
    email: string;
    full_name: string;
    role: string;
    password_hash: string;
  }>;

  const user = users[0];
  if (!user) {
    return null;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return null;
  }

  await pool.query(
    "UPDATE app_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
    [user.id],
  );

  return mapUser(user);
}

export async function createSession(userId: number) {
  await ensureDatabaseReady();
  const pool = getPool();
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = mysqlDate(SESSION_DURATION_DAYS);

  await pool.query(
    `INSERT INTO app_sessions (user_id, session_token_hash, expires_at, last_seen_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, tokenHash, expiresAt],
  );

  return {
    token: rawToken,
    expiresAt,
  };
}

export async function deleteSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await ensureDatabaseReady();
  const pool = getPool();
  await pool.query("DELETE FROM app_sessions WHERE session_token_hash = ?", [
    hashSessionToken(token),
  ]);
}

export async function getSessionUserByToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  await ensureDatabaseReady();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT
       s.id AS session_id,
       u.id AS user_id,
       u.email,
       u.full_name,
       u.role,
       s.expires_at
     FROM app_sessions s
     INNER JOIN app_users u ON u.id = s.user_id
     WHERE s.session_token_hash = ?
     LIMIT 1`,
    [hashSessionToken(token)],
  );
  const sessionRows = rows as Array<{
    session_id: number;
    user_id: number;
    email: string;
    full_name: string;
    role: string;
    expires_at: string;
  }>;

  const row = sessionRows[0];
  if (!row) {
    return null;
  }

  const expiresTime = new Date(String(row.expires_at).replace(" ", "T") + "Z").getTime();
  if (Number.isFinite(expiresTime) && expiresTime < Date.now()) {
    await deleteSession(token);
    return null;
  }

  await pool.query(
    "UPDATE app_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?",
    [row.session_id],
  );

  return {
    id: row.user_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  } satisfies SessionUser;
}

export async function getServerSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionUserByToken(token);
}

export async function getRequestSessionUser(request: NextRequest) {
  return getSessionUserByToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}
