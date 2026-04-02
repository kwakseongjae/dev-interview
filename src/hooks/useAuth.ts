import { useSyncExternalStore } from "react";
import { isLoggedIn, isAuthReady } from "@/lib/api";

function subscribe(callback: () => void) {
  window.addEventListener("authStateChanged", callback);
  return () => window.removeEventListener("authStateChanged", callback);
}

/**
 * Reactive auth state hook.
 * Uses useSyncExternalStore to subscribe to "authStateChanged" custom events
 * dispatched by the Supabase auth listener in api.ts.
 * Components re-render automatically when login state changes.
 *
 * - `loggedIn`: Whether the user has an active session
 * - `authReady`: Whether INITIAL_SESSION has fired (auth state is definitive)
 *    Before authReady, loggedIn may be false even for authenticated users.
 */
export function useAuth(): { loggedIn: boolean; authReady: boolean } {
  const loggedIn = useSyncExternalStore(subscribe, isLoggedIn, () => false);
  const authReady = useSyncExternalStore(subscribe, isAuthReady, () => false);
  return { loggedIn, authReady };
}
