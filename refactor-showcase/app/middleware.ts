import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-Middleware: Security-Header für alle Routen + In-Memory Rate-Limiting für Auth-Endpoints.
 *
 * Sicherheits-Strategie:
 * - CSP gegen XSS (script-src 'self' + Convex/Next inline-Skripte erlauben)
 * - HSTS gegen Protocol-Downgrade (in Production)
 * - X-Frame-Options DENY gegen Clickjacking
 * - Referrer-Policy strict-origin-when-cross-origin (Privacy)
 * - Permissions-Policy schließt nicht benötigte APIs
 *
 * Rate-Limit ist bewusst In-Memory (Edge-fähig, kein Redis-Setup nötig). Für mehrere
 * Edge-Instanzen wäre Upstash Ratelimit der nächste Schritt.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const buckets = new Map<string, { count: number; resetAt: number }>();

const PROTECTED_PATHS = ["/auth/login", "/auth/register", "/auth/demo"];

function getClientId(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() ?? "unknown";
}

function isRateLimited(id: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return true;
  bucket.count += 1;
  return false;
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    if (isRateLimited(getClientId(req))) {
      return new NextResponse("Zu viele Anfragen. Bitte später erneut versuchen.", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  const res = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );

  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
