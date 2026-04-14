export const AUTH_SESSION_COOKIE = "slide_handout_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function setServerSessionCookie(token: string): Promise<void> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error("Session konnte nicht gespeichert werden.");
  }
}

export async function clearServerSessionCookie(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
  });
}
