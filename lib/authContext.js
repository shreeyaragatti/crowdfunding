import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import supabase from "./supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (accessToken) => {
    if (!accessToken) {
      setProfile(null);
      return null;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your profile.");
      setProfile(data.profile);
      return data.profile;
    } catch (error) {
      console.error("Profile load failed:", error.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      loadProfile(data.session?.access_token).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession?.access_token) {
        loadProfile(nextSession.access_token);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      loading,
      session,
      user: session?.user || null,
      profile,
      role: profile?.role || null,
      accessToken: session?.access_token || null,
      refreshProfile: () => loadProfile(session?.access_token),
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      },
    }),
    [loading, session, profile, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
};

export async function authFetch(url, options = {}) {
  const currentSession = supabase ? (await supabase.auth.getSession()).data.session : null;
  const headers = new Headers(options.headers || {});
  if (currentSession?.access_token) {
    headers.set("Authorization", `Bearer ${currentSession.access_token}`);
  }
  return fetch(url, { ...options, headers });
}
