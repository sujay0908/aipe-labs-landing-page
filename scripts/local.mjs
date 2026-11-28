#!/usr/bin/env node
// Start, stop and check the app locally.
//
// Next.js serves the frontend (pages) and the backend (auth routes, server
// actions) from one process, so "the server" below means both. The database is
// the hosted Supabase project in DATABASE_URL.
//
// Usage: npm run local -- <start|stop|restart|status|logs> [--port 3000] [--no-db-check]

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = path.join(ROOT, ".local");
const PID_FILE = path.join(STATE_DIR, "server.pid");
const LOG_FILE = path.join(STATE_DIR, "server.log");
const ENV_FILE = path.join(ROOT, ".env.local");
const REQUIRED_ENV = ["DATABASE_URL", "AUTH_SECRET"];
const EMAIL_ENV = ["AUTH_RESEND_KEY", "EMAIL_FROM"]; // only login emails need these

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const portFlag = args.indexOf("--port");
const PORT = Number(portFlag >= 0 ? args[portFlag + 1] : process.env.PORT ?? 3000);
const SKIP_DB = args.includes("--no-db-check");
const URL_BASE = `http://localhost:${PORT}`;

const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  process.exit(1);
};

// ---------- helpers ----------

function readPid() {
  try {
    return Number(fs.readFileSync(PID_FILE, "utf8").trim()) || null;
  } catch {
    return null;
  }
}

function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

async function httpUp() {
  try {
    const res = await fetch(URL_BASE, { redirect: "manual", signal: AbortSignal.timeout(2000) });
    return res.status > 0;
  } catch {
    return false;
  }
}

function killTree(pid) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
  } else {
    // Started detached, so the server leads its own process group.
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      process.kill(pid, "SIGTERM");
    }
  }
}

function checkEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    fail(".env.local is missing. Copy .env.example to .env.local and fill it in.");
  }
  process.loadEnvFile(ENV_FILE);
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) fail(`.env.local has no value for: ${missing.join(", ")}`);
  ok(".env.local has DATABASE_URL and AUTH_SECRET");
  const noEmail = EMAIL_ENV.filter((k) => !process.env[k]);
  if (noEmail.length) warn(`no ${noEmail.join(", ")}: the site runs, but login emails can't be sent`);
}

async function checkDatabase() {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const [{ n }] = await sql`select count(*)::int as n from information_schema.tables
                              where table_schema = 'public' and table_name in ('users','enrollments','lesson_progress')`;
    if (n < 3) warn("database reachable, but tables are missing. Run: npm run db:migrate");
    else ok("database reachable, tables present");
  } catch (e) {
    fail(`cannot reach the database: ${e.message}`);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

// ---------- commands ----------

async function start() {
  const pid = readPid();
  if (isAlive(pid)) {
    console.log(`Already running (pid ${pid}) at ${URL_BASE}`);
    return;
  }
  if (await httpUp()) fail(`port ${PORT} is already in use by another program. Use --port <n>.`);

  console.log("Checking setup...");
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) fail("dependencies not installed. Run: npm install");
  checkEnv();
  if (SKIP_DB) warn("skipping database check (--no-db-check)");
  else await checkDatabase();

  console.log(`Starting server on ${URL_BASE} ...`);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const log = fs.openSync(LOG_FILE, "w");
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(PORT)], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));

  for (let i = 0; i < 60; i++) {
    if (!isAlive(child.pid)) {
      console.error(fs.readFileSync(LOG_FILE, "utf8").split("\n").slice(-20).join("\n"));
      fs.rmSync(PID_FILE, { force: true });
      fail("server exited during startup (last log lines above)");
    }
    if (await httpUp()) {
      ok(`running (pid ${child.pid})`);
      console.log(`\n  Landing page  ${URL_BASE}/`);
      console.log(`  Log in        ${URL_BASE}/login`);
      console.log(`  Courses       ${URL_BASE}/learn`);
      console.log(`\n  Logs: npm run local -- logs     Stop: npm run local -- stop`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  fail(`server didn't respond within 60s. See ${path.relative(ROOT, LOG_FILE)}`);
}

async function stop() {
  const pid = readPid();
  if (!isAlive(pid)) {
    fs.rmSync(PID_FILE, { force: true });
    console.log("Not running.");
    return;
  }
  killTree(pid);
  for (let i = 0; i < 20 && isAlive(pid); i++) await new Promise((r) => setTimeout(r, 250));
  fs.rmSync(PID_FILE, { force: true });
  ok(`stopped (pid ${pid})`);
}

async function status() {
  const pid = readPid();
  const alive = isAlive(pid);
  const up = await httpUp();
  if (alive && up) ok(`running (pid ${pid}) at ${URL_BASE}`);
  else if (alive) warn(`process ${pid} exists but ${URL_BASE} isn't answering yet`);
  else if (up) warn(`something else is serving ${URL_BASE} (not started by this script)`);
  else console.log("Not running.");
}

function logs() {
  if (!fs.existsSync(LOG_FILE)) return console.log("No log yet. Start the server first.");
  console.log(fs.readFileSync(LOG_FILE, "utf8").split("\n").slice(-50).join("\n"));
}

const commands = {
  start,
  stop,
  restart: async () => {
    await stop();
    await start();
  },
  status,
  logs,
};

if (!commands[command]) {
  console.log("Usage: npm run local -- <start|stop|restart|status|logs> [--port 3000] [--no-db-check]");
  process.exit(command === "help" ? 0 : 1);
}
await commands[command]();
