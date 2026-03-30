import bcrypt from "bcryptjs";
import mysql, { type Pool } from "mysql2/promise";

declare global {
  var __kanboardMysqlPool: Pool | undefined;
  var __kanboardMysqlInitPromise: Promise<void> | undefined;
}

type RequiredEnvName =
  | "MYSQL_HOST"
  | "MYSQL_DATABASE"
  | "MYSQL_USER"
  | "MYSQL_PASSWORD";

function getEnv(name: RequiredEnvName) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

function createPool() {
  return mysql.createPool({
    host: getEnv("MYSQL_HOST"),
    port: Number(process.env.MYSQL_PORT ?? 3306),
    database: getEnv("MYSQL_DATABASE"),
    user: getEnv("MYSQL_USER"),
    password: getEnv("MYSQL_PASSWORD"),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    dateStrings: true,
    charset: "utf8mb4",
  });
}

export function getPool() {
  if (!global.__kanboardMysqlPool) {
    global.__kanboardMysqlPool = createPool();
  }

  return global.__kanboardMysqlPool;
}

async function ensureSeedUser(pool: Pool) {
  const loginEmail = process.env.APP_LOGIN_EMAIL;
  const loginPassword = process.env.APP_LOGIN_PASSWORD;

  if (!loginEmail || !loginPassword) {
    return;
  }

  const loginName = process.env.APP_LOGIN_NAME ?? "Mariano Parisi";
  const [rows] = await pool.query(
    "SELECT id FROM app_users WHERE email = ? LIMIT 1",
    [loginEmail],
  );
  const userRows = rows as Array<{ id: number }>;

  if (userRows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(loginPassword, 12);
  await pool.query(
    `INSERT INTO app_users (email, full_name, password_hash, role)
     VALUES (?, ?, ?, 'owner')`,
    [loginEmail, loginName, passwordHash],
  );
}

export async function ensureDatabaseReady() {
  if (!global.__kanboardMysqlInitPromise) {
    global.__kanboardMysqlInitPromise = (async () => {
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS workspace_profiles (
          id TINYINT PRIMARY KEY,
          name VARCHAR(191) NOT NULL,
          description TEXT NOT NULL,
          agent_channel VARCHAR(191) NOT NULL,
          last_synced_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(191) NOT NULL UNIQUE,
          full_name VARCHAR(191) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(64) NOT NULL DEFAULT 'owner',
          last_login_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS app_sessions (
          id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT NOT NULL,
          session_token_hash CHAR(64) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          last_seen_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_app_sessions_user
            FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
          INDEX idx_app_sessions_expires (expires_at)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(191) PRIMARY KEY,
          title VARCHAR(191) NOT NULL,
          repository VARCHAR(191) NOT NULL,
          owner VARCHAR(191) NOT NULL,
          status ENUM('backlog','in_progress','on_hold','review','done') NOT NULL,
          tags_json JSON NOT NULL,
          summary TEXT NOT NULL,
          last_update DATETIME NOT NULL,
          priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
          details_json JSON NOT NULL,
          files_changed_json JSON NOT NULL,
          tasks_json JSON NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_items (
          id VARCHAR(191) PRIMARY KEY,
          project_id VARCHAR(191) NULL,
          project_title VARCHAR(191) NOT NULL,
          created_at DATETIME NOT NULL,
          source ENUM('codex','cli','api') NOT NULL,
          author VARCHAR(191) NOT NULL,
          summary TEXT NOT NULL,
          created_db_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_activity_project
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
          INDEX idx_activity_created_at (created_at)
        )
      `);

      await ensureSeedUser(pool);
    })();
  }

  await global.__kanboardMysqlInitPromise;
}
