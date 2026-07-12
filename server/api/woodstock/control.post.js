import { createError, defineEventHandler } from "nitro/h3";
import { resumeHook } from "workflow/api";

const ALLOWED_ACTIONS = new Set(["cancel", "reschedule", "replace"]);
const ALLOWED_RECURRENCES = new Set(["none", "daily", "weekly", "monthly", "yearly"]);

export default defineEventHandler(async (event) => {
  const body = await event.req.json();
  const token = body?.token;
  const action = body?.action;

  if (typeof token !== "string" || token.length < 16 || token.length > 220 || !ALLOWED_ACTIONS.has(action?.type)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid reminder control request" });
  }

  const payload = { type: action.type };
  if (action.type === "reschedule" || action.type === "replace") {
    const dueMs = Date.parse(action.dueAt);
    if (!Number.isFinite(dueMs)) {
      throw createError({ statusCode: 400, statusMessage: "A valid date is required" });
    }
    payload.dueAt = new Date(dueMs).toISOString();
  }
  if (action.type === "replace") {
    if (typeof action.title !== "string" || action.title.trim().length < 2 || action.title.length > 160) {
      throw createError({ statusCode: 400, statusMessage: "A task title is required" });
    }
    if (!ALLOWED_RECURRENCES.has(action.recurrence || "none")) {
      throw createError({ statusCode: 400, statusMessage: "Invalid repeat setting" });
    }
    payload.title = action.title.trim();
    payload.notes = String(action.notes || "").trim().slice(0, 500);
    payload.recurrence = action.recurrence || "none";
    payload.timeZone = typeof action.timeZone === "string" ? action.timeZone.slice(0, 80) : "America/New_York";
  }

  try {
    const result = await resumeHook(token, payload);
    return { ok: true, runId: result.runId };
  } catch {
    throw createError({ statusCode: 404, statusMessage: "This reminder is no longer waiting. Save it again to create a new alert." });
  }
});
