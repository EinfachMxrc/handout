import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import { App } from "./App";

function getStoredConvexUrl(): string {
  try {
    const stored = localStorage.getItem("slide-handout-addin");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.convexUrl ?? "";
    }
  } catch {
    // ignore
  }
  return import.meta.env.VITE_CONVEX_URL ?? "";
}

const convexUrl = getStoredConvexUrl();
let convexClient: ConvexReactClient | null = null;
let convexReady = false;

if (convexUrl && convexUrl.startsWith("https://")) {
  try {
    convexClient = new ConvexReactClient(convexUrl);
    convexReady = true;
  } catch {
    convexReady = false;
  }
}

function Root() {
  if (convexClient && convexReady) {
    return (
      <ConvexProvider client={convexClient}>
        <App convexReady={true} />
      </ConvexProvider>
    );
  }
  return <App convexReady={false} />;
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>
  );
}
