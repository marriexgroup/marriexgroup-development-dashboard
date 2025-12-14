import express from "express";
import { getAllUsers } from "../controllers/admin-controller.js";
import authMiddleware from "../middleware/auth-middleware.js";

const router = express.Router();

router.get("/users", authMiddleware, getAllUsers);

export default router;
