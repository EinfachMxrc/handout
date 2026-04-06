import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Alte Viewer-Heartbeats stündlich löschen
crons.interval(
  "cleanup viewer heartbeats",
  { hours: 1 },
  internal.viewers.cleanupHeartbeats
);

export default crons;
