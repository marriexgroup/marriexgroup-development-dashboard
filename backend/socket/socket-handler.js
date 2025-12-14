import WorkSession from "../models/work-session.js";

const onlineUsers = new Map(); // userId -> { socketId, ...info }
const activeWorkSessions = new Map(); // userId -> startTime

export const socketHandler = (io) => {
    io.on("connection", async (socket) => {
        console.log("New client connected:", socket.id);

        const userId = socket.handshake.query.userId;

        if (userId) {
            onlineUsers.set(userId, { socketId: socket.id, lastSeen: new Date() });
            io.emit("update-online-users", Array.from(onlineUsers.keys()));

            // Check if user has an active session in DB
            try {
                const activeSession = await WorkSession.findOne({
                    user: userId,
                    status: "active"
                });

                if (activeSession) {
                    activeWorkSessions.set(userId, activeSession.startTime);
                    socket.emit("work-status", { isWorking: true, startTime: activeSession.startTime });
                    io.emit("user-work-update", { userId, isWorking: true, startTime: activeSession.startTime });
                }
            } catch (err) {
                console.error("Error fetching active session:", err);
            }
        }

        socket.on("start-work", async (data) => {
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

                activeWorkSessions.set(userId, newSession.startTime);

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
            try {
                const session = await WorkSession.findOneAndUpdate(
                    { user: userId, status: "active" },
                    { status: "completed", endTime: new Date() },
                    { new: true }
                );

                if (session) {
                    activeWorkSessions.delete(userId);
                    io.emit("user-work-update", {
                        userId,
                        isWorking: false,
                        lastSessionDuration: (new Date() - new Date(session.startTime))
                    });
                    socket.emit("work-stopped");
                }
            } catch (error) {
                console.error("Stop work error:", error);
            }
        });

        socket.on("disconnect", () => {
            if (userId) {
                onlineUsers.delete(userId);
                io.emit("update-online-users", Array.from(onlineUsers.keys()));
            }
            console.log("Client disconnected:", socket.id);
        });
    });
};
