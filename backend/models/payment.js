import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "LKR"],
    },
    description: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    projects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
      },
    ],
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;

