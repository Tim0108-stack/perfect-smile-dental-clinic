import cors from "cors";
import express from "express";
import { env } from "./lib/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { appointmentsRouter } from "./routes/appointments.js";
import { followUpsRouter } from "./routes/followUps.js";
import { reportsRouter } from "./routes/reports.js";
import { aiRouter } from "./routes/ai.js";

const app = express();

// ── Core middleware ────────────────────────────────────────────
app.use(
  cors({
    origin: env.clientOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/follow-ups", followUpsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/ai", aiRouter);

// ── 404 + error handling (must be registered last) ──────────────
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] Perfect Smile API listening on http://localhost:${env.port} (${env.nodeEnv})`
  );
});
