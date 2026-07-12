import { defineEventHandler } from "nitro/h3";

const VAPID_PUBLIC_KEY = "BHx6BCCJAviNa3RRxm1x3qbJ4GFKSj1sIDRlSGAytvJEjDwwAFXrLSi-sLhOPg6eN2Cmy3jRza9WyGYJuvRqnP4";

export default defineEventHandler(() => ({
  publicKey: VAPID_PUBLIC_KEY
}));
