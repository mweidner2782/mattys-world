import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { resumeHook, start } from "workflow/api";
import {
  ACTOR_TOKEN,
  createInitialState,
  householdActor,
  householdResponseWorkflow,
  householdScheduler
} from "../workflows/woodstock-household.js";

const HOUSEHOLD_PIN_HASH =
  process.env.WOODSTOCK_PIN_HASH ||
  "f34bc64285d49eff9636a279a9ad26ece90c7e3bca0fb491ecdea6345a6564eb";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureScheduler() {
  try {
    await start(householdScheduler, []);
  } catch {
    // A scheduler run may already own the singleton token.
  }
}

async function sendToActor(event) {
  await ensureScheduler();
  try {
    await resumeHook(ACTOR_TOKEN, event);
    return;
  } catch {
    // The household actor has not been started yet.
  }

  try {
    await start(householdActor, [createInitialState()]);
  } catch {
    // A simultaneous request may have started the actor already.
  }

  let lastError;
  for (let attempt = 0; attempt < 35; attempt += 1) {
    try {
      await resumeHook(ACTOR_TOKEN, event);
      return;
    } catch (error) {
      lastError = error;
      await wait(Math.min(1200, 160 + attempt * 85));
    }
  }
  throw lastError || new Error("The shared reminder service is starting. Try again in a moment.");
}

export default defineEventHandler(async (event) => {
  let body;
  try {
    body = await readBody(event);
  } catch {
    setResponseStatus(event, 400);
    return { ok: false, error: "Invalid request" };
  }

  if (body?.pinHash !== HOUSEHOLD_PIN_HASH) {
    setResponseStatus(event, 401);
    return { ok: false, error: "Incorrect household PIN" };
  }

  const responseToken = `woodstock-response:${crypto.randomUUID()}`;
  const responseRun = await start(householdResponseWorkflow, [responseToken]);
  const actorEvent = {
    ...(body?.payload || {}),
    type: body?.action || "get",
    owner: body?.owner === "sara" ? "sara" : "matt",
    deviceId: String(body?.deviceId || "").slice(0, 100),
    responseToken,
    at: new Date().toISOString()
  };

  try {
    await sendToActor(actorEvent);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("The reminder service took too long to respond")), 25_000));
    const result = await Promise.race([responseRun.returnValue, timeout]);
    if (!result?.ok) setResponseStatus(event, 400);
    return result;
  } catch (error) {
    setResponseStatus(event, 503);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reminder service unavailable"
    };
  }
});
