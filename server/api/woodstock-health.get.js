import { defineEventHandler } from "h3";
import { VAPID_PUBLIC_KEY } from "../workflows/woodstock-household.js";

export default defineEventHandler(() => ({
  ok: true,
  service: "Woodstock Home reminders",
  pushConfigured: Boolean(VAPID_PUBLIC_KEY)
}));
