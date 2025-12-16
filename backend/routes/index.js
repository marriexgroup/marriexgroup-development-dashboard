import express from "express";

import authRoutes from "./auth.js";
import workspaceRoutes from "./workspace.js";
import projectRoutes from "./project.js";
import taskRoutes from "./task.js";
import userRoutes from "./user.js";
import paymentRoutes from "./payment.js";
import adminRoutes from "./admin-routes.js";
import workSessionRoutes from "./work-session.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/users", userRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes);
router.use("/work-sessions", workSessionRoutes);

export default router;
