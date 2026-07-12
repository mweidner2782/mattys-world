import { createError, defineEventHandler } from "nitro/h3";
import { start } from "workflow/api";
import { woodstockReminderWorkflow } from "../../../workflows/woodstock-reminder.js";

const HOUSEHOLD_PIN = "198361";
const MAX_FUTURE_MS = 1000 * 60 * 60 * 24 * 366 * 3;
const ALLOWED_RECURRENCES = new Set(["none", "daily", "weekly", "monthly", "yearly"]);

function isPushSubscription(value) {
  return Boolean(
    value &&
    typeof value.endpoint === "string" &&
    value.keys &&
    typeof value.keys.p256dh === "string" &&
    typeof value.keys.auth === "string"
  );
}

export default defineEventHandler(async (event) => {
  const body = await event.req.json();
  if (body?.pin !== HOUSEHOLD_PIN) {
    throw createError({ statusCode: 401, statusMessage: "Incorrect household PIN" });
  }

  const task = body?.task;
  if (!task || typeof task !== "object") {
    throw createError({ statusCode: 400, statusMessage: "Task is required" });
  }

  const dueMs = Date.parse(task.dueAt);
  if (!Number.isFinite(dueMs) || dueMs < Date.now() - 60_000 || dueMs > Date.now() + MAX_FUTURE_MS) {
    throw createError({ statusCode: 400, statusMessage: "Choose a valid reminder date within the next three years" });
  }

  if (
    typeof task.id !== "string" || task.id.length < 8 || task.id.length > 120 ||
    typeof task.controlToken !== "string" || task.controlToken.length < 16 || task.controlToken.length > 220 ||
    typeof task.title !== "string" || task.title.trim().length < 2 || task.title.length > 160 ||
    (task.notes && (typeof task.notes !== "string" || task.notes.length > 500)) ||
    !ALLOWED_RECURRENCES.has(task.recurrence || "none") ||
    !isPushSubscription(task.subscription)
  ) {
    throw createError({ statusCode: 400, statusMessage: "The reminder details are incomplete" });
  }

  const safeTask = {
    id: task.id,
    controlToken: task.controlToken,
    title: task.title.trim(),
    notes: String(task.notes || "").trim(),
    dueAt: new Date(dueMs).toISOString(),
    recurrence: task.recurrence || "none",
    timeZone: typeof task.timeZone === "string" ? task.timeZone.slice(0, 80) : "America/New_York",
    subscription: task.subscription,
    source: task.source === "test" ? "test" : "schedule"
  };

  const run = await start(woodstockReminderWorkflow, [safeTask]);
  return { ok: true, runId: run.runId };
});
