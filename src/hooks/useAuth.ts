import { useSyncExternalStore } from "react";
import { isLoggedIn } from "@/lib/api";

function subscribe(callback: () => void) {
  window.addEventListener("authStateChanged", callback);
  return () => window.removeEventListener("authStateChanged", callback);
}

/**
 * Reactive auth state hook.
 * Uses useSyncExternalStore to subscribe to "authStateChanged" custom events
 * dispatched by the Supabase auth listener in api.ts.
 * Components re-render automatically when login state changes.
 */
export function useAuth(): { loggedIn: boolean } {
  const loggedIn = useSyncExternalStore(subscribe, isLoggedIn, () => false);
  return { loggedIn };
}
