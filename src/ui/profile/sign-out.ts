import { api } from "@/ui/api/client";

/** Clears the auth cookie (POST /auth/logout), then goes to the login page (AG3). */
export async function logOut(push: (href: string) => void): Promise<void> {
  try {
    await api.logout();
  } catch {
    // A 401 (expired cookie, rotated password) or a network error: still go to /login.
  } finally {
    push("/login");
  }
}
