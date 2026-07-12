import { createHook, FatalError, sleep } from "workflow";
import { DateTime } from "luxon";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = "BHx6BCCJAviNa3RRxm1x3qbJ4GFKSj1sIDRlSGAytvJEjDwwAFXrLSi-sLhOPg6eN2Cmy3jRza9WyGYJuvRqnP4";
const VAPID_PRIVATE_KEY = "JToL4nQnis2rPam5358yU5QG0qkzRuSpU6u5ms5Y_4c";
const VAPID_SUBJECT = "mailto:weidner.matt@gmail.com";

function nextOccurrence(dueAt, recurrence, timeZone) {
  let value = DateTime.fromISO(dueAt, { setZone: true }).setZone(timeZone || "America/New_York");
  if (!value.isValid) value = DateTime.fromISO(dueAt, { zone: "utc" });
  if (recurrence === "daily") value = value.plus({ days: 1 });
  if (recurrence === "weekly") value = value.plus({ weeks: 1 });
  if (recurrence === "monthly") value = value.plus({ months: 1 });
  if (recurrence === "yearly") value = value.plus({ years: 1 });
  return value.toUTC().toISO();
}

async function deliverPush(task) {
  "use step";
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: task.source === "test" ? "Woodstock Home test" : task.title,
    body: task.notes || "A house task is due now.",
    tag: `woodstock-${task.id}`,
    url: `/woodstock/schedule.html?task=${encodeURIComponent(task.id)}`,
    taskId: task.id,
    controlToken: task.controlToken,
    recurrence: task.recurrence,
    dueAt: task.dueAt,
    timeZone: task.timeZone
  });

  try {
    await webpush.sendNotification(task.subscription, payload, {
      TTL: 60 * 60 * 24,
      urgency: "high"
    });
    return { delivered: true };
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      throw new FatalError("The device push subscription is no longer active");
    }
    throw error;
  }
}

export async function woodstockReminderWorkflow(initialTask) {
  "use workflow";
  let task = { ...initialTask };

  while (true) {
    let outcome;
    {
      const control = createHook({ token: task.controlToken });
      outcome = await Promise.race([
        sleep(new Date(task.dueAt)).then(() => ({ kind: "due" })),
        control.then((action) => ({ kind: "action", action }))
      ]);
      control.dispose();
    }

    if (outcome.kind === "action") {
      if (outcome.action.type === "cancel") {
        return { status: "cancelled", taskId: task.id };
      }
      if (outcome.action.type === "reschedule") {
        task = { ...task, dueAt: outcome.action.dueAt };
        continue;
      }
      if (outcome.action.type === "replace") {
        task = {
          ...task,
          title: outcome.action.title,
          notes: outcome.action.notes,
          dueAt: outcome.action.dueAt,
          recurrence: outcome.action.recurrence,
          timeZone: outcome.action.timeZone
        };
        continue;
      }
    }

    await deliverPush(task);

    if (task.recurrence === "none" || task.source === "test") {
      return { status: "sent", taskId: task.id };
    }

    task = {
      ...task,
      dueAt: nextOccurrence(task.dueAt, task.recurrence, task.timeZone)
    };
  }
}
