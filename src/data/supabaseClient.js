import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log to catch invisible characters / empty envs
console.log("VITE_SUPABASE_URL =", `[${url}]`, "len:", url?.length ?? 0);

export const supabase = createClient(url, anon, {
  auth: { persistSession: true },
});
