import { DateTime } from "luxon";
import { createHook, sleep } from "workflow";
import { resumeHook } from "workflow/api";

export const TIME_ZONE = "America/New_York";
export const ACTOR_TOKEN = "woodstock-household:v3";
export const SCHEDULER_TOKEN = "woodstock-scheduler:v1";
export const VAPID_PUBLIC_KEY =
  "BNTC7TVCqO9Rnzsb0aQkUxDQMsqPCB-a5r5hnIkxbItxko2VxXHgdmGvAkjnGpfOb-YTTig_ZEjUNBshdwsOM60";

const MAX_ACTIVITY = 160;

function uid(prefix = "id") {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function nextWeekday(now, weekday, hour, minute = 0) {
  let candidate = now.startOf("day").set({ hour, minute, second: 0, millisecond: 0 });
  const delta = (weekday - candidate.weekday + 7) % 7;
  candidate = candidate.plus({ days: delta });
  if (candidate <= now) candidate = candidate.plus({ weeks: 1 });
  return candidate;
}

function nextAnnual(now, month, day, hour = 9) {
  let candidate = DateTime.fromObject(
    { year: now.year, month, day, hour, minute: 0 },
    { zone: TIME_ZONE }
  );
  if (candidate <= now) candidate = candidate.plus({ years: 1 });
  return candidate;
}

function makeTask({ id, title, details, category, due, recurrence, assignedTo = "both" }) {
  const stamp = DateTime.now().toUTC().toISO();
  return {
    id,
    title,
    details,
    category,
    assignedTo,
    dueAt: due.toISO(),
    notifyAt: due.toISO(),
    recurrence,
    active: true,
    completedAt: null,
    lastCompletedAt: null,
    lastCompletedBy: null,
    lastNotifiedAt: null,
    scheduleVersion: 1,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function createInitialState() {
  const now = DateTime.now().setZone(TIME_ZONE);
  const nextMonth = now.plus({ months: 1 }).startOf("month").set({ hour: 9 });
  const pest = now.plus({ months: 1 }).startOf("month").plus({ days: 14 }).set({ hour: 9 });

  const tasks = [
    makeTask({ id: "pool-weekly", title: "Pool service", details: "Weekly during pool season · Pool Science", category: "Pool", due: nextWeekday(now, 2, 8), recurrence: { unit: "week", interval: 1 } }),
    makeTask({ id: "trash-weekly", title: "Set out trash and recycling", details: "Roll bins out Wednesday night for Thursday pickup", category: "Grounds", due: nextWeekday(now, 3, 19), recurrence: { unit: "week", interval: 1 } }),
    makeTask({ id: "landscape-weekly", title: "Landscaping review", details: "Weekly during the growing season", category: "Grounds", due: nextWeekday(now, 5, 8), recurrence: { unit: "week", interval: 1 } }),
    makeTask({ id: "alarms-monthly", title: "Test smoke and CO alarms", details: "Test all alarms and replace batteries as required", category: "Safety", due: nextMonth, recurrence: { unit: "month", interval: 1 } }),
    makeTask({ id: "pest-quarterly", title: "Pest service review", details: "Confirm the next Thomas Pest visit", category: "Pest", due: pest, recurrence: { unit: "month", interval: 3 } }),
    makeTask({ id: "hvac-annual", title: "HVAC and boiler service", details: "Book Bonestell before heating season", category: "HVAC", due: nextAnnual(now, 9, 1), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "stove-annual", title: "Wood stove and chimney service", details: "Complete before winter use", category: "Safety", due: nextAnnual(now, 9, 15), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "generator-annual", title: "Generator service", details: "Annual service with Gen Plus", category: "Generator", due: nextAnnual(now, 10, 1), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "winter-annual", title: "Winter readiness", details: "Clear vents, generator, propane access and snow routes", category: "Seasonal", due: nextAnnual(now, 10, 15), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "roof-annual", title: "Roof and exterior inspection", details: "Inspect roof, flashing, screws, drainage and overhangs", category: "Exterior", due: nextAnnual(now, 4, 15), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "propane-annual", title: "Propane usage and price review", details: "Review before the annual early-buy deadline", category: "Propane", due: nextAnnual(now, 5, 1), recurrence: { unit: "year", interval: 1 } }),
    makeTask({ id: "radon-biennial", title: "Radon retest", details: "Retest the house every two years", category: "Safety", due: nextAnnual(now, 3, 6).plus({ years: 1 }), recurrence: { unit: "year", interval: 2 } })
  ];

  return {
    version: 2,
    timezone: TIME_ZONE,
    createdAt: now.toUTC().toISO(),
    updatedAt: now.toUTC().toISO(),
    tasks,
    subscriptions: [],
    activity: [
      {
        id: uid("activity"),
        at: now.toUTC().toISO(),
        by: "system",
        type: "created",
        text: "Shared Woodstock Home reminders created"
      }
    ]
  };
}

function sanitize(value, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

function ownerName(owner) {
  return owner === "matt" ? "Matt" : owner === "sara" ? "Sara" : "Someone";
}

function publicState(state) {
  return {
    version: state.version,
    timezone: state.timezone,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    tasks: [...state.tasks].sort((a, b) => {
      if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }),
    devices: state.subscriptions.map((item) => ({
      deviceId: item.deviceId,
      owner: item.owner,
      label: item.label,
      lastSeenAt: item.lastSeenAt
    })),
    activity: state.activity.slice(-80).reverse()
  };
}

function addActivity(state, entry) {
  return {
    ...state,
    activity: [...state.activity, { id: uid("activity"), ...entry }].slice(-MAX_ACTIVITY)
  };
}

function nextOccurrence(task, completedAt) {
  const recurrence = task.recurrence || { unit: "none", interval: 1 };
  if (recurrence.unit === "none") return null;
  const interval = Math.max(1, Number(recurrence.interval) || 1);
  let next = DateTime.fromISO(task.dueAt, { setZone: true }).setZone(TIME_ZONE);
  const floor = DateTime.fromISO(completedAt, { setZone: true }).setZone(TIME_ZONE);
  const increment =
    recurrence.unit === "day" ? { days: interval } :
    recurrence.unit === "week" ? { weeks: interval } :
    recurrence.unit === "month" ? { months: interval } :
    { years: interval };
  do next = next.plus(increment); while (next <= floor);
  return next;
}

async function processEvent(state, event) {
  "use step";

  const now = DateTime.fromISO(event.at || new Date().toISOString(), { setZone: true }).setZone(TIME_ZONE);
  const nowIso = now.toUTC().toISO();
  const actor = event.owner === "sara" ? "sara" : event.owner === "matt" ? "matt" : "system";
  let nextState = { ...state, updatedAt: nowIso };
  const pushes = [];
  let message = "Updated";
  const findIndex = (id) => nextState.tasks.findIndex((task) => task.id === id);

  switch (event.type) {
    case "get":
      message = "Current shared reminders";
      break;

    case "subscribe": {
      const endpoint = event.subscription?.endpoint;
      if (!endpoint) throw new Error("A valid push subscription is required");
      const record = {
        deviceId: sanitize(event.deviceId, 100) || uid("device"),
        owner: event.owner === "sara" ? "sara" : "matt",
        label: sanitize(event.label, 80) || "Phone",
        subscription: event.subscription,
        lastSeenAt: nowIso
      };
      nextState = {
        ...nextState,
        subscriptions: [
          ...nextState.subscriptions.filter((item) => item.subscription?.endpoint !== endpoint && item.deviceId !== record.deviceId),
          record
        ]
      };
      nextState = addActivity(nextState, {
        at: nowIso,
        by: record.owner,
        type: "notifications",
        text: `${ownerName(record.owner)} enabled reminders on ${record.label}`
      });
      pushes.push({
        subscriptions: [record],
        payload: {
          title: "Woodstock Home",
          body: "Notifications are connected. A task completed by Matt or Sara is completed for both.",
          tag: "woodstock-connected",
          data: { url: "/woodstock/#reminders" }
        }
      });
      message = "Notifications enabled";
      break;
    }

    case "unsubscribe":
      nextState = {
        ...nextState,
        subscriptions: nextState.subscriptions.filter(
          (item) => item.deviceId !== event.deviceId && item.subscription?.endpoint !== event.endpoint
        )
      };
      message = "Notifications disabled on this device";
      break;

    case "heartbeat":
      nextState = {
        ...nextState,
        subscriptions: nextState.subscriptions.map((item) => item.deviceId === event.deviceId ? { ...item, lastSeenAt: nowIso } : item)
      };
      message = "Device refreshed";
      break;

    case "addTask": {
      const due = DateTime.fromISO(event.task?.dueAt || "", { setZone: true }).setZone(TIME_ZONE);
      if (!due.isValid) throw new Error("Choose a valid date and time");
      const unit = ["none", "day", "week", "month", "year"].includes(event.task?.recurrence?.unit) ? event.task.recurrence.unit : "none";
      const task = {
        id: sanitize(event.task?.id, 100) || uid("task"),
        title: sanitize(event.task?.title, 120),
        details: sanitize(event.task?.details, 400),
        category: sanitize(event.task?.category, 60) || "House",
        assignedTo: ["matt", "sara", "both"].includes(event.task?.assignedTo) ? event.task.assignedTo : "both",
        dueAt: due.toISO(),
        notifyAt: due.toISO(),
        recurrence: { unit, interval: Math.max(1, Math.min(24, Number(event.task?.recurrence?.interval) || 1)) },
        active: true,
        completedAt: null,
        lastCompletedAt: null,
        lastCompletedBy: null,
        lastNotifiedAt: null,
        scheduleVersion: 1,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      if (!task.title) throw new Error("A reminder title is required");
      nextState = { ...nextState, tasks: [...nextState.tasks, task] };
      nextState = addActivity(nextState, { at: nowIso, by: actor, type: "added", text: `${ownerName(actor)} added “${task.title}”` });
      message = "Reminder added for both phones";
      break;
    }

    case "updateTask": {
      const index = findIndex(event.task?.id);
      if (index < 0) throw new Error("Reminder not found");
      const current = nextState.tasks[index];
      const due = DateTime.fromISO(event.task?.dueAt || current.dueAt, { setZone: true }).setZone(TIME_ZONE);
      if (!due.isValid) throw new Error("Choose a valid date and time");
      const updated = {
        ...current,
        title: sanitize(event.task?.title ?? current.title, 120),
        details: sanitize(event.task?.details ?? current.details, 400),
        category: sanitize(event.task?.category ?? current.category, 60) || "House",
        assignedTo: ["matt", "sara", "both"].includes(event.task?.assignedTo) ? event.task.assignedTo : current.assignedTo,
        dueAt: due.toISO(),
        notifyAt: due.toISO(),
        recurrence: {
          unit: ["none", "day", "week", "month", "year"].includes(event.task?.recurrence?.unit) ? event.task.recurrence.unit : current.recurrence.unit,
          interval: Math.max(1, Math.min(24, Number(event.task?.recurrence?.interval ?? current.recurrence.interval) || 1))
        },
        active: true,
        completedAt: null,
        scheduleVersion: current.scheduleVersion + 1,
        updatedAt: nowIso
      };
      const tasks = [...nextState.tasks];
      tasks[index] = updated;
      nextState = { ...nextState, tasks };
      nextState = addActivity(nextState, { at: nowIso, by: actor, type: "updated", text: `${ownerName(actor)} updated “${updated.title}”` });
      message = "Reminder updated for both phones";
      break;
    }

    case "completeTask": {
      const index = findIndex(event.taskId);
      if (index < 0) throw new Error("Reminder not found");
      const current = nextState.tasks[index];
      if (current.completedAt) {
        message = "Already completed on both phones";
        break;
      }
      const following = nextOccurrence(current, now.toISO());
      const updated = following ? {
        ...current,
        dueAt: following.toISO(),
        notifyAt: following.toISO(),
        lastCompletedAt: nowIso,
        lastCompletedBy: actor,
        completedAt: null,
        active: true,
        scheduleVersion: current.scheduleVersion + 1,
        updatedAt: nowIso
      } : {
        ...current,
        active: false,
        completedAt: nowIso,
        lastCompletedAt: nowIso,
        lastCompletedBy: actor,
        scheduleVersion: current.scheduleVersion + 1,
        updatedAt: nowIso
      };
      const tasks = [...nextState.tasks];
      tasks[index] = updated;
      nextState = { ...nextState, tasks };
      nextState = addActivity(nextState, { at: nowIso, by: actor, type: "completed", text: `${ownerName(actor)} completed “${current.title}” for both` });
      message = following ? "Completed for both. The next recurring reminder is scheduled." : "Completed on both phones";
      break;
    }

    case "snoozeTask": {
      const index = findIndex(event.taskId);
      if (index < 0) throw new Error("Reminder not found");
      const current = nextState.tasks[index];
      const hours = Math.max(1, Math.min(168, Number(event.hours) || 24));
      const updated = {
        ...current,
        notifyAt: now.plus({ hours }).toISO(),
        active: true,
        completedAt: null,
        scheduleVersion: current.scheduleVersion + 1,
        updatedAt: nowIso
      };
      const tasks = [...nextState.tasks];
      tasks[index] = updated;
      nextState = { ...nextState, tasks };
      nextState = addActivity(nextState, { at: nowIso, by: actor, type: "snoozed", text: `${ownerName(actor)} snoozed “${current.title}” for ${hours} hours` });
      message = "Snoozed on both phones";
      break;
    }

    case "deleteTask": {
      const index = findIndex(event.taskId);
      if (index < 0) throw new Error("Reminder not found");
      const current = nextState.tasks[index];
      nextState = { ...nextState, tasks: nextState.tasks.filter((task) => task.id !== event.taskId) };
      nextState = addActivity(nextState, { at: nowIso, by: actor, type: "deleted", text: `${ownerName(actor)} deleted “${current.title}”` });
      message = "Reminder deleted from both phones";
      break;
    }

    case "testPush": {
      const targets = nextState.subscriptions.filter((item) => !event.deviceId || item.deviceId === event.deviceId);
      pushes.push({
        subscriptions: targets,
        payload: {
          title: "Woodstock Home test",
          body: "Push notifications are working on this device.",
          tag: `woodstock-test-${Date.now()}`,
          data: { url: "/woodstock/#reminders" }
        }
      });
      message = targets.length ? "Test notification sent" : "Enable notifications first";
      break;
    }

    case "tick": {
      const dueTasks = nextState.tasks.filter((task) => {
        return task.active && !task.completedAt && task.notifyAt && new Date(task.notifyAt).getTime() <= now.toMillis() + 60_000;
      });

      if (!dueTasks.length) {
        message = "No reminders are due";
        break;
      }

      const dueIds = new Set(dueTasks.map((task) => task.id));
      for (const current of dueTasks) {
        const targets = nextState.subscriptions.filter((item) => current.assignedTo === "both" || current.assignedTo === item.owner);
        pushes.push({
          subscriptions: targets,
          payload: {
            title: `Woodstock Home · ${current.category}`,
            body: current.details ? `${current.title} — ${current.details}` : current.title,
            tag: `woodstock-${current.id}`,
            requireInteraction: true,
            actions: [{ action: "done", title: "Done" }, { action: "snooze", title: "Snooze 1 day" }],
            data: { url: "/woodstock/#reminders", taskId: current.id }
          }
        });
      }

      const repeatAt = now.plus({ days: 1 }).startOf("day").set({ hour: 9 });
      nextState = {
        ...nextState,
        tasks: nextState.tasks.map((task) => dueIds.has(task.id) ? {
          ...task,
          lastNotifiedAt: nowIso,
          notifyAt: repeatAt.toISO(),
          scheduleVersion: task.scheduleVersion + 1,
          updatedAt: nowIso
        } : task)
      };
      message = `Processed ${dueTasks.length} due reminder${dueTasks.length === 1 ? "" : "s"}`;
      break;
    }

    default:
      throw new Error("Unknown Woodstock Home action");
  }

  return { state: nextState, pushes, message };
}

async function sendPushBatch(batch) {
  "use step";
  if (!batch?.subscriptions?.length) return [];
  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:weidner.matt@gmail.com",
    process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY || "j32ym7FdHaSSTYCemlbkUUni9J1K6IMOcqzEq_lkqfc"
  );
  const invalid = [];
  const payload = JSON.stringify(batch.payload);
  await Promise.all(batch.subscriptions.map(async (record) => {
    try {
      await webpush.sendNotification(record.subscription, payload, { TTL: 86_400 });
    } catch (error) {
      const status = Number(error?.statusCode || error?.status || 0);
      if (status === 404 || status === 410) invalid.push(record.subscription?.endpoint);
      else console.error("Woodstock push failed", status, error?.message || error);
    }
  }));
  return invalid.filter(Boolean);
}

async function sendResponse(responseToken, payload) {
  "use step";
  let lastError;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      await resumeHook(responseToken, payload);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 90 + attempt * 60)));
    }
  }
  throw lastError || new Error("Unable to return Woodstock Home state");
}

export async function householdResponseWorkflow(responseToken) {
  "use workflow";
  const response = createHook({ token: responseToken });
  return await response;
}

async function emitSchedulerTick() {
  "use step";
  const event = {
    type: "tick",
    owner: "system",
    at: new Date().toISOString()
  };
  let lastError;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      await resumeHook(ACTOR_TOKEN, event);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(1200, 150 + attempt * 80)));
    }
  }
  console.error("Unable to deliver Woodstock scheduler tick", lastError);
}

export async function householdScheduler() {
  "use workflow";
  const singleton = createHook({ token: SCHEDULER_TOKEN });
  const conflict = await singleton.getConflict();
  if (conflict) return { dedupedTo: conflict.runId };

  while (true) {
    await emitSchedulerTick();
    await sleep("5 minutes");
  }
}

export async function householdActor(initialState) {
  "use workflow";
  let state = initialState;
  const events = createHook({ token: ACTOR_TOKEN });
  const conflict = await events.getConflict();
  if (conflict) return { dedupedTo: conflict.runId };

  for await (const event of events) {
    try {
      const result = await processEvent(state, event);
      state = result.state;

      if (event.responseToken) {
        await sendResponse(event.responseToken, {
          ok: true,
          message: result.message,
          publicKey: VAPID_PUBLIC_KEY,
          state: publicState(state)
        });
      }

      const invalidEndpoints = [];
      for (const push of result.pushes) invalidEndpoints.push(...(await sendPushBatch(push)));
      if (invalidEndpoints.length) {
        const invalid = new Set(invalidEndpoints);
        state = {
          ...state,
          subscriptions: state.subscriptions.filter((item) => !invalid.has(item.subscription?.endpoint))
        };
      }
    } catch (error) {
      if (event.responseToken) {
        await sendResponse(event.responseToken, {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to update reminders",
          publicKey: VAPID_PUBLIC_KEY,
          state: publicState(state)
        });
      }
    }
  }
}
