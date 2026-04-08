import express from "express";
import authRoutes from "./routes/auth.routes";
import tenantRoutes from "./routes/tenant.routes";
import usersRoutes from "./routes/users.routes";
import branchesRoutes from "./routes/branches.routes";
import uploadsRoutes from "./routes/uploads.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import anomaliesRoutes from "./routes/anomalies.routes";
import metricsRoutes from "./routes/metrics.routes";
import reportsRoutes from "./routes/reports.routes";
import auditLogsRoutes from "./routes/audit-logs.routes";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/branches", branchesRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/anomalies", anomaliesRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

export default app;
