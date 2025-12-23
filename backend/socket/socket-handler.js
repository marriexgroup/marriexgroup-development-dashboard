import WorkSession from "../models/work-session.js";
import User from "../models/user.js";
import { authenticator as totp } from "otplib";
import mongoose from "mongoose";

const onlineUsers = new Map(); // userId -> { socketId, ...info }
const activeWorkSessions = new Map(); // userId -> { startTime, checkpointTimer, failureTimer }

const recordFailedCheckpoint = async (userId) => {
    try {
        await WorkSession.findOneAndUpdate(
            { user: userId, status: "active" },
            {
                $push: {
                    checkpoints: {
                        status: "failed",
                        time: new Date(),
                        otpVerified: false
                    }
                }
            }
        );
    } catch (error) {
        console.error("Error recording failed checkpoint:", error);
    }
};

const stopWorkSession = async (io, socket, userId) => {
    try {
        const session = await WorkSession.findOneAndUpdate(
            { user: userId, status: "active" },
            { status: "completed", endTime: new Date() },
            { new: true }
        );

        if (session) {
            const sessionData = activeWorkSessions.get(userId);
            if (sessionData?.checkpointTimer) {
                clearTimeout(sessionData.checkpointTimer);
            }
            if (sessionData?.failureTimer) {
                clearTimeout(sessionData.failureTimer);
            }
            activeWorkSessions.delete(userId);
            io.emit("user-work-update", {
                userId,
                isWorking: false,
                lastSessionDuration: (new Date() - new Date(session.startTime))
            });
            socket.emit("work-stopped");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Stop work session error:", error);
        return false;
    }
};

const scheduleCheckpoint = (io, socket, userId) => {
    // Keep user's test timing for now
    const min = 30 * 60 * 1000;
    const max = 120 * 60 * 1000;
    const randomDelay = Math.floor(Math.random() * (max - min + 1)) + min;

    console.log(`Scheduling checkpoint for ${userId} in ${randomDelay / 1000} seconds`);

    const timer = setTimeout(() => {
        socket.emit("checkpoint-request");

        // Start 10-second failure timer for testing
        const failureTimer = setTimeout(async () => {
            console.log(`Checkpoint timeout for ${userId}`);
            await recordFailedCheckpoint(userId);
            socket.emit("checkpoint-timeout", { message: "Checkpoint timed out. Work session stopped." });

            // Stop work session on timeout
            await stopWorkSession(io, socket, userId);
        }, 10000); // 10 seconds

        const sessionData = activeWorkSessions.get(userId);
        if (sessionData) {
            sessionData.failureTimer = failureTimer;
        }
    }, randomDelay);

    return timer;
};

export const socketHandler = (io) => {
    io.use(async (socket, next) => {
        try {
            // Validate userId during handshake
            const userId = socket.handshake.query.userId;
            
            if (!userId) {
                console.error("Socket connection rejected: userId missing", {
                    socketId: socket.id,
                    query: socket.handshake.query,
                    headers: socket.handshake.headers
                });
                return next(new Error("userId is required"));
            }

            // Validate userId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                console.error("Socket connection rejected: invalid userId format", {
                    userId,
                    socketId: socket.id
                });
                return next(new Error("Invalid userId format"));
            }

            // Verify user exists in database
            const user = await User.findById(userId);
            if (!user) {
                console.error("Socket connection rejected: user not found", {
                    userId,
                    socketId: socket.id
                });
                return next(new Error("User not found"));
            }
            
            // Store userId on socket for later use
            socket.userId = userId;
            console.log("Socket middleware passed for userId:", userId, "socketId:", socket.id);
            next();
        } catch (error) {
            console.error("Socket middleware error:", {
                error: error.message,
                stack: error.stack,
                socketId: socket.id,
                query: socket.handshake.query
            });
            return next(new Error("Authentication failed"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.userId; // Use validated userId from socket
        
        if (!userId) {
            console.error("Connection established without userId, disconnecting:", {
                socketId: socket.id,
                handshake: socket.handshake.query
            });
            socket.disconnect(true);
            return;
        }

        console.log("New client connected:", {
            socketId: socket.id,
            userId: userId,
            transport: socket.conn.transport.name,
            remoteAddress: socket.handshake.address
        });

        onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
        io.emit("update-online-users", Array.from(onlineUsers.keys()));

        // Check if user has an active session in DB
        try {
            const activeSession = await WorkSession.findOne({
                user: userId,
                status: "active"
            });

            if (activeSession) {
                const checkpointTimer = scheduleCheckpoint(io, socket, userId);
                activeWorkSessions.set(userId, {
                    startTime: activeSession.startTime,
                    checkpointTimer,
                    failureTimer: null
                });
                socket.emit("work-status", { isWorking: true, startTime: activeSession.startTime });
                io.emit("user-work-update", { userId, isWorking: true, startTime: activeSession.startTime });
            }
        } catch (err) {
            console.error("Error fetching active session:", err);
        }

        socket.on("start-work", async (data) => {
            const userId = socket.userId;
            
            if (!userId) {
                console.error("Start work failed: userId missing for socket", socket.id);
                socket.emit("error", { message: "Authentication required" });
                return;
            }

            try {
                // Close any existing active sessions first to avoid duplicates
                await WorkSession.updateMany(
                    { user: userId, status: "active" },
                    { status: "completed", endTime: new Date() }
                );

                const newSession = await WorkSession.create({
                    user: userId,
                    startTime: new Date(),
                    status: "active",
                });

                const checkpointTimer = scheduleCheckpoint(io, socket, userId);
                activeWorkSessions.set(userId, {
                    startTime: newSession.startTime,
                    checkpointTimer,
                    failureTimer: null
                });

                io.emit("user-work-update", {
                    userId,
                    isWorking: true,
                    startTime: newSession.startTime
                });

                socket.emit("work-started", { startTime: newSession.startTime });

            } catch (error) {
                console.error("Start work error:", error);
                socket.emit("error", { message: "Failed to start work" });
            }
        });

        socket.on("stop-work", async () => {
            const userId = socket.userId;
            
            if (!userId) {
                console.error("Stop work failed: userId missing for socket", socket.id);
                socket.emit("error", { message: "Authentication required" });
                return;
            }

            await stopWorkSession(io, socket, userId);
        });

        socket.on("verify-checkpoint", async (data) => {
            const userId = socket.userId;
            
            if (!userId) {
                console.error("Verify checkpoint failed: userId missing for socket", socket.id);
                socket.emit("checkpoint-error", { message: "Authentication required" });
                return;
            }

            try {
                const { otp } = data;
                const user = await User.findById(userId).select("+twoFASecret");

                if (!user || !user.twoFASecret) {
                    return socket.emit("checkpoint-error", { message: "Authenticator not configured" });
                }

                const isValid = totp.verify({ token: otp, secret: user.twoFASecret });

                const status = isValid ? "passed" : "failed";

                await WorkSession.findOneAndUpdate(
                    { user: userId, status: "active" },
                    {
                        $push: {
                            checkpoints: {
                                status,
                                time: new Date(),
                                otpVerified: isValid
                            }
                        }
                    }
                );

                const sessionData = activeWorkSessions.get(userId);
                if (sessionData?.failureTimer) {
                    clearTimeout(sessionData.failureTimer);
                    sessionData.failureTimer = null;
                }

                if (isValid) {
                    socket.emit("checkpoint-success");
                    // Schedule next checkpoint
                    if (sessionData) {
                        if (sessionData.checkpointTimer) clearTimeout(sessionData.checkpointTimer);
                        sessionData.checkpointTimer = scheduleCheckpoint(io, socket, userId);
                    }
                } else {
                    socket.emit("checkpoint-error", { message: "Invalid authenticator code. Work session stopped." });
                    await stopWorkSession(io, socket, userId);
                }
            } catch (error) {
                console.error("Checkpoint verification error:", error);
                socket.emit("checkpoint-error", { message: "Verification failed" });
            }
        });

        socket.on("disconnect", (reason) => {
            const userId = socket.userId;
            console.log("Client disconnected:", {
                socketId: socket.id,
                userId: userId || "unknown",
                reason: reason,
                transport: socket.conn?.transport?.name || "unknown"
            });
            
            if (userId) {
                onlineUsers.delete(userId);
                io.emit("update-online-users", Array.from(onlineUsers.keys()));
            }
        });

        // Handle connection errors
        socket.on("error", (error) => {
            console.error("Socket error:", {
                socketId: socket.id,
                userId: socket.userId,
                error: error.message,
                stack: error.stack
            });
        });
    });
};
