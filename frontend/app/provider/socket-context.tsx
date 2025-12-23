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
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            // Connection event handlers
            newSocket.on("connect", () => {
                console.log("Socket connected:", newSocket.id);
            });

            newSocket.on("connect_error", (error) => {
                console.error("Socket connection error:", error.message);
                // Connection will automatically retry based on reconnection settings
            });

            newSocket.on("disconnect", (reason) => {
                console.log("Socket disconnected:", reason);
                if (reason === "io server disconnect") {
                    // Server disconnected the socket, manually reconnect
                    newSocket.connect();
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
