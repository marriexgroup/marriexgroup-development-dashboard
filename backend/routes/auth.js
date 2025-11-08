import express from "express";

import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import {
  loginSchema,
  registerSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  twoFASetupRequestSchema,
  twoFASetupVerifySchema,
  signAgreementSchema,
} from "../libs/validate-schema.js";
import {
  loginUser,
  registerUser,
  resetPasswordRequest,
  verifyEmail,
  verifyResetPasswordTokenAndResetPassword,
  signAgreement,
} from "../controllers/auth-controller.js";

const router = express.Router();

router.post(
  "/register",
  validateRequest({
    body: registerSchema,
  }),
  registerUser
);
router.post(
  "/login",
  validateRequest({
    body: loginSchema,
  }),
  loginUser
);

router.post(
  "/verify-email",
  validateRequest({
    body: verifyEmailSchema,
  }),
  verifyEmail
);

router.post(
  "/reset-password-request",
  validateRequest({
    body: resetPasswordRequestSchema,
  }),
  resetPasswordRequest
);

router.post(
  "/reset-password",
  validateRequest({
    body: resetPasswordSchema,
  }),
  verifyResetPasswordTokenAndResetPassword
);

// 2FA setup routes
import { setupTwoFARequest, setupTwoFAVerify } from "../controllers/auth-controller.js";

router.post(
  "/setup-2fa-request",
  validateRequest({
    body: twoFASetupRequestSchema,
  }),
  setupTwoFARequest
);

router.post(
  "/setup-2fa-verify",
  validateRequest({
    body: twoFASetupVerifySchema,
  }),
  setupTwoFAVerify
);

// Sign agreement with 2FA
router.post(
  "/sign-agreement",
  validateRequest({
    body: signAgreementSchema,
  }),
  signAgreement
);

export default router;
