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
        if (user) {
            const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
                query: { userId: user._id },
            });

            setSocket(newSocket);

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

            return () => {
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
