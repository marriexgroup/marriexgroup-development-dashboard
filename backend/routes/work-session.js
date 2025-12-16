import express from "express";
import { getWorkHistory, getAllWorkSessions } from "../controllers/work-session-controller.js";
import { protect, adminMiddleware } from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/user/:userId", protect, getWorkHistory);
router.get("/all", protect, adminMiddleware, getAllWorkSessions);

export default router;
