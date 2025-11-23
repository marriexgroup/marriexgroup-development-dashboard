import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import { validateRequest } from "zod-express-middleware";
import { z } from "zod";
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from "../controllers/payment.js";

const router = express.Router();

const paymentSchema = z.object({
  amount: z.number().min(0),
  currency: z.enum(["USD","LKR"]).optional(),
  description: z.string().optional(),
  paymentDate: z.string().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  projects: z.array(z.string()).optional(),
  tasks: z.array(z.string()).optional(),
  workspace: z.string(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

router.post(
  "/",
  authMiddleware,
  validateRequest({
    body: paymentSchema,
  }),
  createPayment
);

router.get(
  "/",
  authMiddleware,
  validateRequest({
    query: z.object({
      workspaceId: z.string().optional(),
    }),
  }),
  getPayments
);

router.get(
  "/:paymentId",
  authMiddleware,
  validateRequest({
    params: z.object({
      paymentId: z.string(),
    }),
  }),
  getPaymentById
);

router.put(
  "/:paymentId",
  authMiddleware,
  validateRequest({
    params: z.object({
      paymentId: z.string(),
    }),
    body: paymentSchema.partial(),
  }),
  updatePayment
);

router.delete(
  "/:paymentId",
  authMiddleware,
  validateRequest({
    params: z.object({
      paymentId: z.string(),
    }),
  }),
  deletePayment
);

export default router;

