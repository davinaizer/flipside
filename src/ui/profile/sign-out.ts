import { api } from "@/ui/api/client";

/** Revokes the sign-in token (POST /auth/logout), then goes to the login page (AU7). */
export async function logOut(push: (href: string) => void): Promise<void> {
  try {
    await api.logout();
  } catch {
    // A 401 (expired or revoked token) or a network error: still go to /login.
  } finally {
    push("/login");
  }
}
