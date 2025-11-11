// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Read envs
let url = import.meta.env.VITE_SUPABASE_URL ?? "";
let anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Strip accidental quotes/whitespace from copy/paste
if (typeof url === "string") url = url.trim().replace(/^"+|"+$/g, "");
if (typeof anon === "string") anon = anon.trim().replace(/^"+|"+$/g, "");

// Log exactly what we're using (to catch empty/quoted values)
console.log("Supabase URL:", `[${url}]`, "len:", url.length);

// Basic validation so we fail loudly in dev instead of making relative fetches
if (!url || !/^https?:\/\//.test(url)) {
  console.error("❌ VITE_SUPABASE_URL is missing or invalid. Check your .env.local");
}
if (!anon) {
  console.error("❌ VITE_SUPABASE_ANON_KEY is missing. Check your .env.local");
}

export const supabase = (url && anon) ? createClient(url, anon, {
  auth: { persistSession: true },
}) : null;
