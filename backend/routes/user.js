import express from "express";
import authenticateUser from "../middleware/auth-middleware.js";
import {
  uploadProfilePicture,
  handleUploadError,
} from "../middleware/upload-middleware.js";
import {
  changePassword,
  getUserProfile,
  updateUserProfile,
} from "../controllers/user.js";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";

const router = express.Router();

router.get("/profile", authenticateUser, getUserProfile);
router.put(
  "/profile",
  authenticateUser,
  uploadProfilePicture,
  handleUploadError,
  validateRequest({
    body: z.object({
      name: z.string(),
      profilePicture: z.any().optional(),
    }),
  }),
  updateUserProfile
);

router.put(
  "/change-password",
  authenticateUser,
  validateRequest({
    body: z.object({
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    }),
  }),
  changePassword
);

export default router;
