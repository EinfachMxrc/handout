import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SECONDS,
} from "@/lib/authSession";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo1234";

function isLikelyPlaceholder(url: string): boolean {
  return /(your-deployment|placeholder|example)/i.test(url);
}

function getConvexUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url || isLikelyPlaceholder(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".convex.cloud")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export async function POST() {
  const convexUrl = getConvexUrl();

  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL fehlt oder ist ungueltig." },
      { status: 500 }
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const result = await client.mutation(api.auth.login, {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    const response = NextResponse.json({
      token: result.token,
      name: result.name ?? "Demo Presenter",
      email: result.email ?? DEMO_EMAIL,
      isDemo: result.isDemo ?? true,
    });

    response.cookies.set({
      name: AUTH_SESSION_COOKIE,
      value: result.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : "";
    const fallback =
      "Demo-Login fehlgeschlagen. Bitte Convex-Verbindung prüfen (NEXT_PUBLIC_CONVEX_URL) und `pnpm dev:convex` einmal interaktiv ausführen.";
    return NextResponse.json(
      { error: (message || fallback).replace(/^\[.*?\]\s*/g, "") },
      { status: 502 }
    );
  }
}
