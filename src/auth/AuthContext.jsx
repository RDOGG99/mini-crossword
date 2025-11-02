import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // ensure a profile row exists in public.users
  async function ensureProfile(user) {
    if (!user || !supabase) return;
    const { id, user_metadata } = user;
    const username = user_metadata?.username || user.email?.split("@")[0] || null;
    const display_name = user_metadata?.display_name || username;

    const { error } = await supabase
      .from("users")
      .upsert({ id, username, display_name }, { onConflict: "id" });
    if (error) console.error("ensureProfile error", error);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!supabase) return;
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error", error);
      if (!mounted) return;
      setSession(data?.session ?? null);
      setLoading(false);
      if (data?.session?.user) ensureProfile(data.session.user);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) ensureProfile(newSession.user);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
