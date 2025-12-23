import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";

interface SocketContextType {
    socket: Socket | null;
    onlineUsers: string[];
    userWorkStatus: Map<string, { isWorking: boolean; startTime?: string }>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [userWorkStatus, setUserWorkStatus] = useState<
        Map<string, { isWorking: boolean; startTime?: string }>
    >(new Map());

    useEffect(() => {
        if (user && user._id) {
            const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
                query: { userId: user._id },
                transports: ["polling", "websocket"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                forceNew: false,
                // Better handling for serverless environments
                upgrade: true,
                rememberUpgrade: false,
                // Add auth token if available
                auth: {},
            });

            // Connection event handlers
            newSocket.on("connect", () => {
                console.log("Socket connected:", newSocket.id);
            });

            newSocket.on("connect_error", (error) => {
                console.error("Socket connection error:", {
                    message: error.message,
                    type: error.type,
                    description: error.description,
                    context: error.context
                });
                // Connection will automatically retry based on reconnection settings
            });

            newSocket.on("disconnect", (reason) => {
                console.log("Socket disconnected:", {
                    reason: reason,
                    socketId: newSocket.id,
                    connected: newSocket.connected
                });
                
                // Handle different disconnect reasons
                if (reason === "io server disconnect") {
                    // Server disconnected the socket, manually reconnect
                    console.log("Server disconnected socket, attempting reconnect...");
                    newSocket.connect();
                } else if (reason === "transport close" || reason === "transport error") {
                    // Transport error, will auto-reconnect
                    console.log("Transport error, will auto-reconnect...");
                } else if (reason === "ping timeout") {
                    // Connection timeout, will auto-reconnect
                    console.log("Connection timeout, will auto-reconnect...");
                }
            });

            newSocket.on("error", (error) => {
                console.error("Socket error:", error);
            });

            // Application event handlers
            newSocket.on("update-online-users", (users: string[]) => {
                setOnlineUsers(users);
            });

            newSocket.on("user-work-update", (data: { userId: string; isWorking: boolean; startTime?: string }) => {
                setUserWorkStatus((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(data.userId, { isWorking: data.isWorking, startTime: data.startTime });
                    return newMap;
                });
            });

            setSocket(newSocket);

            return () => {
                newSocket.removeAllListeners();
                newSocket.close();
            };
        } else {
            setSocket(null);
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, userWorkStatus }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};
