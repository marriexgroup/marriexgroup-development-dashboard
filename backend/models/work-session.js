import mongoose from "mongoose";

const workSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        startTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        status: {
            type: String, // "active", "completed"
            enum: ["active", "completed"],
            default: "active",
        },
        checkpoints: [
            {
                status: {
                    type: String,
                    enum: ["passed", "failed"],
                    required: true,
                },
                time: {
                    type: Date,
                    default: Date.now,
                },
                otpVerified: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    { timestamps: true }
);

const WorkSession = mongoose.model("WorkSession", workSessionSchema);

export default WorkSession;
