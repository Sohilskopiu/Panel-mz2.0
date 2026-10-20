import express from "express";
import fs from "fs-extra";
import path from "path";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { readJSON, writeJSON } from "../services/db.js";

const router = express.Router();
router.use(requireAuth);

const isAdmin = (user: any) => user?.role === "admin" || user?.role === "owner";

router.get("/status", async (_req, res) => {
  try {
    const dataDir = path.join(process.cwd(), ".data");
    const servers = await readJSON("servers.json");
    const users = await readJSON("users.json");
    const settings = await readJSON("settings.json");
    const dockerEnabled = (process.env.DEFAULT_RUNTIME || settings?.defaultRuntime || "docker") === "docker";
    res.json({
      checkedAt: new Date().toISOString(),
      panel: { status: "ok", dataDirectoryWritable: await fs.pathExists(dataDir) },
      inventory: { servers: Array.isArray(servers) ? servers.length : 0, users: Array.isArray(users) ? users.length : 0 },
      runtime: { configuredDefault: dockerEnabled ? "docker" : "local", dockerSocketConfigured: Boolean(process.env.DOCKER_HOST || process.env.DOCKER_SOCKET || process.platform === "linux") },
      capabilities: {
        console: "integrated",
        files: "integrated",
        sftp: "integrated",
        backups: "integrated",
        resourceMonitoring: "integrated",
        scheduledTasks: "integrated",
        gitDeployment: "not_configured",
        domainsSsl: "not_configured",
        databaseProvisioning: "not_configured",
        vpsProvisioning: "provider_required"
      }
    });
  } catch {
    res.status(500).json({ error: "Could not inspect panel health" });
  }
});



const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-only-jwt-secret-not-for-production");
const allowedScheduleActions = new Set(["start", "stop", "restart"]);
const scheduleFile = "scheduled_tasks.json";
let schedulerBusy = false;

function isValidScheduleDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

// Create/list/delete scheduled server actions. Tasks are stored durably in .data.
router.get("/schedules", async (req, res) => {
  const tasks = await readJSON(scheduleFile) || [];
  const user = (req as any).user;
  const visible = isAdmin(user) ? tasks : tasks.filter((t: any) => t.createdBy === user?.id);
  res.json({ tasks: visible.sort((a: any, b: any) => Date.parse(a.nextRunAt) - Date.parse(b.nextRunAt)) });
});

router.post("/schedules", async (req, res) => {
  const user = (req as any).user;
  const { serverId, action, firstRunAt, intervalMinutes } = req.body || {};
  if (typeof serverId !== "string" || !allowedScheduleActions.has(action)) return res.status(400).json({ error: "serverId and action (start/stop/restart) are required" });
  if (!isValidScheduleDate(firstRunAt) || Date.parse(firstRunAt) < Date.now() + 30_000) return res.status(400).json({ error: "firstRunAt must be at least 30 seconds in the future" });
  const repeat = intervalMinutes === undefined || intervalMinutes === null || intervalMinutes === 0 ? 0 : Number(intervalMinutes);
  if (!Number.isInteger(repeat) || (repeat !== 0 && (repeat < 5 || repeat > 10080))) return res.status(400).json({ error: "intervalMinutes must be 0 (one-time) or 5–10080" });
  const servers = await readJSON("servers.json") || [];
  const server = servers.find((s: any) => s.id === serverId);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (!isAdmin(user) && server.owner !== user?.id) return res.status(403).json({ error: "You can only schedule actions for your own server" });
  const tasks = await readJSON(scheduleFile) || [];
  const task = { id: randomUUID(), serverId, serverName: server.name || serverId, action, firstRunAt: new Date(firstRunAt).toISOString(), nextRunAt: new Date(firstRunAt).toISOString(), intervalMinutes: repeat, createdBy: user.id, createdAt: new Date().toISOString(), enabled: true, lastRunAt: null, lastResult: null };
  tasks.push(task);
  await writeJSON(scheduleFile, tasks);
  await recordAuditEvent({ actorId: user.id, actorName: user.username, action: "extension.action", targetId: serverId, targetName: server.name, details: `Scheduled ${action} task ${task.id}` });
  res.status(201).json({ task });
});

router.delete("/schedules/:taskId", async (req, res) => {
  const user = (req as any).user;
  const tasks = await readJSON(scheduleFile) || [];
  const task = tasks.find((t: any) => t.id === req.params.taskId);
  if (!task) return res.status(404).json({ error: "Scheduled task not found" });
  if (!isAdmin(user) && task.createdBy !== user?.id) return res.status(403).json({ error: "Forbidden" });
  await writeJSON(scheduleFile, tasks.filter((t: any) => t.id !== task.id));
  res.json({ success: true });
});

// Single-process durable scheduler. It reuses the same authenticated server action routes,
// so controller ownership/suspension checks still apply. For multi-replica deployments use a queue.
async function runDueScheduledTasks() {
  if (schedulerBusy) return;
  schedulerBusy = true;
  try {
    const tasks = await readJSON(scheduleFile) || [];
    const now = Date.now();
    let changed = false;
    for (const task of tasks) {
      if (!task.enabled || Date.parse(task.nextRunAt) > now) continue;
      const users = await readJSON("users.json") || [];
      const user = users.find((u: any) => u.id === task.createdBy);
      const servers = await readJSON("servers.json") || [];
      const server = servers.find((s: any) => s.id === task.serverId);
      if (!user || !server || (user.role !== "admin" && user.role !== "owner" && server.owner !== user.id)) {
        task.enabled = false; task.lastResult = "disabled: user/server authorization no longer valid"; changed = true; continue;
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, passwordVersion: user.passwordVersion || 0 }, JWT_SECRET, { expiresIn: "2m" });
      const port = Number(process.env.PORT || (process.env.NODE_ENV === "development" ? 3000 : 6767));
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/servers/${encodeURIComponent(task.serverId)}/${task.action}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(20_000) });
        task.lastRunAt = new Date().toISOString();
        task.lastResult = response.ok ? `success (${response.status})` : `failed (${response.status})`;
      } catch (error: any) { task.lastRunAt = new Date().toISOString(); task.lastResult = `failed: ${String(error?.message || "request error").slice(0, 120)}`; }
      if (task.intervalMinutes > 0) task.nextRunAt = new Date(now + task.intervalMinutes * 60_000).toISOString();
      else task.enabled = false;
      changed = true;
      await recordAuditEvent({ actorId: user.id, actorName: user.username, action: `server.${task.action}`, targetId: task.serverId, targetName: server.name, outcome: String(task.lastResult).startsWith("success") ? "success" : "failure", details: `Scheduled task ${task.id}: ${task.lastResult}` });
    }
    if (changed) await writeJSON(scheduleFile, tasks);
  } catch (error) { console.error("Scheduled task runner error:", error); }
  finally { schedulerBusy = false; }
}
setInterval(() => { void runDueScheduledTasks(); }, 15_000).unref();

router.get("/audit", async (req, res) => {
  if (!isAdmin((req as any).user)) return res.status(403).json({ error: "Admin access required" });
  const events = await readJSON("audit_events.json");
  res.json({ events: Array.isArray(events) ? events.slice(-250).reverse() : [] });
});

// Internal panel event recorder; action names are allow-listed and payloads never include credentials.
export async function recordAuditEvent(event: { actorId?: string; actorName?: string; action: string; targetId?: string; targetName?: string; outcome?: "success" | "failure"; details?: string }) {
  const allowed = new Set(["server.create", "server.start", "server.stop", "server.restart", "server.delete", "server.backup.create", "server.backup.restore", "server.file.delete", "server.owner.update", "settings.update", "extension.action"]);
  if (!allowed.has(event.action)) return;
  const events = await readJSON("audit_events.json") || [];
  events.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    actorId: event.actorId || "system",
    actorName: event.actorName || "System",
    action: event.action,
    targetId: event.targetId || null,
    targetName: event.targetName || null,
    outcome: event.outcome || "success",
    details: String(event.details || "").slice(0, 300)
  });
  await writeJSON("audit_events.json", events.slice(-2000));
}

export default router;
