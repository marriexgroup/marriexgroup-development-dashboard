import { Button } from "@/components/ui/button";
import { useSocket } from "@/provider/socket-context";
import { Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const WorkTimer = () => {
    const { socket } = useSocket();
    const [isWorking, setIsWorking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00:00");

    useEffect(() => {
        if (!socket) return;

        // Listen for initial status or updates
        socket.on("work-status", (data: { isWorking: boolean; startTime?: string }) => {
            setIsWorking(data.isWorking);
            if (data.startTime) {
                setStartTime(new Date(data.startTime));
            } else {
                setStartTime(null);
                setElapsedTime("00:00:00");
            }
        });

        socket.on("work-started", (data: { startTime: string }) => {
            setIsWorking(true);
            setStartTime(new Date(data.startTime));
            toast.success("Work session started");
        });

        socket.on("work-stopped", () => {
            setIsWorking(false);
            setStartTime(null);
            setElapsedTime("00:00:00");
            toast.success("Work session stopped");
        });

        return () => {
            socket.off("work-status");
            socket.off("work-started");
            socket.off("work-stopped");
        };
    }, [socket]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isWorking && startTime) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - startTime.getTime();

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, "0")}:${minutes
                        .toString()
                        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                );
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isWorking, startTime]);

    const handleToggleWork = () => {
        if (!socket) return;

        if (isWorking) {
            socket.emit("stop-work");
        } else {
            socket.emit("start-work");
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <div className="flex items-center gap-4 bg-background border p-2 rounded-full shadow-lg">
                {isWorking && (
                    <span className="font-mono text-lg font-bold px-3 tabular-nums text-primary">
                        {elapsedTime}
                    </span>
                )}
                <Button
                    size={isWorking ? "icon" : "default"}
                    variant={isWorking ? "destructive" : "default"}
                    className={`rounded-full ${isWorking ? "h-12 w-12" : "h-12 px-6"}`}
                    onClick={handleToggleWork}
                >
                    {isWorking ? (
                        <Square className="h-5 w-5 fill-current" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Play className="h-5 w-5 fill-current" />
                            <span className="font-semibold">Start Work</span>
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
};
