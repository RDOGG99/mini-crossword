// src/auth/AuthContext.jsx
// Thin adapter: Clerk handles identity; this context keeps the same useAuth() API
// so all existing consumers (Grid, Profile, etc.) need zero changes.

import { createContext, useContext, useEffect, useMemo } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabaseClient";
import { setApiUser } from "../data/api";

const AuthContext = createContext({ user: null, loading: true });

// Best-effort: keep a profile row in public.users keyed by Clerk user ID.
// NOTE: If Supabase RLS policies reference auth.uid() they will need updating
// to allow Clerk user IDs (e.g. via a service-role upsert or policy change).
async function ensureProfile(clerkUser) {
  if (!clerkUser || !supabase) return;
  try {
    const display_name =
      clerkUser.fullName ||
      clerkUser.firstName ||
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      null;
    const username =
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] || null;

    await supabase
      .from("users")
      .upsert({ id: clerkUser.id, username, display_name }, { onConflict: "id" });
  } catch (e) {
    console.warn("ensureProfile:", e?.message ?? e);
  }
}

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  // Keep api.js functions in sync with the current user ID.
  // api.js uses this to decide whether to read/write Supabase or localStorage.
  useEffect(() => {
    setApiUser(clerkUser?.id ?? null);
  }, [clerkUser?.id]);

  // Ensure a Supabase profile row on sign-in.
  useEffect(() => {
    if (clerkUser) ensureProfile(clerkUser);
  }, [clerkUser?.id]);

  const value = useMemo(() => {
    const name = clerkUser
      ? clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        ""
      : "";

    return {
      // Consistent shape for all downstream consumers
      user: clerkUser
        ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            name,
            imageUrl: clerkUser.imageUrl ?? null,
          }
        : null,
      loading: !isLoaded,

      signOut: () => clerkSignOut(),

      updateName: async (displayName) => {
        if (!clerkUser) return;
        await clerkUser.update({ firstName: displayName });
        if (supabase) {
          await supabase
            .from("users")
            .update({ display_name: displayName })
            .eq("id", clerkUser.id);
        }
      },
    };
  }, [clerkUser, isLoaded, clerkSignOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
