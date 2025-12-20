import { Button } from "@/components/ui/button";
import { useSocket } from "@/provider/socket-context";
import { Play, Square, ShieldCheck, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const WorkTimer = () => {
    const { socket } = useSocket();
    const [isWorking, setIsWorking] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00:00");
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const [otp, setOtp] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120); // 120 seconds for countdown
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio("/tone-loop-2976.m4a");
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(err => {
                console.error("Failed to play notification sound:", err);
            });
        }
    };

    const stopNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

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
            setShowCheckpoint(false);
            stopNotificationSound();
            toast.success("Work session stopped");
        });

        socket.on("checkpoint-request", () => {
            setShowCheckpoint(true);
            setOtp("");
            setTimeLeft(120);
            playNotificationSound();
            toast.info("Checkpoint required: Please enter your authenticator code within 2 minutes", {
                duration: 10000,
            });
        });

        socket.on("checkpoint-timeout", (data: { message: string }) => {
            setShowCheckpoint(false);
            setOtp("");
            stopNotificationSound();
            toast.error(data.message || "Checkpoint timed out");
        });

        socket.on("checkpoint-success", () => {
            setIsVerifying(false);
            setShowCheckpoint(false);
            stopNotificationSound();
            toast.success("Checkpoint verified successfully");
        });

        socket.on("checkpoint-error", (data: { message: string }) => {
            setIsVerifying(false);
            toast.error(data.message || "Failed to verify checkpoint");
        });

        return () => {
            socket.off("work-status");
            socket.off("work-started");
            socket.off("work-stopped");
            socket.off("checkpoint-request");
            socket.off("checkpoint-timeout");
            socket.off("checkpoint-success");
            socket.off("checkpoint-error");
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

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showCheckpoint && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Local timeout (server will also timeout and emit event)
            // setShowCheckpoint(false); // Wait for server to confirm failure
        }
        return () => clearInterval(timer);
    }, [showCheckpoint, timeLeft]);

    const handleToggleWork = () => {
        if (!socket) return;

        if (isWorking) {
            socket.emit("stop-work");
        } else {
            socket.emit("start-work");
        }
    };

    const handleVerifyCheckpoint = () => {
        if (!socket || !otp || otp.length !== 6) return;
        setIsVerifying(true);
        socket.emit("verify-checkpoint", { otp });
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

            <Dialog open={showCheckpoint} onOpenChange={(open) => {
                // Prevent closing if it's a mandatory checkpoint unless they stop work
                if (!open && isWorking) {
                    toast.warning("You must verify the checkpoint to continue tracking correctly.");
                }
                if (!isWorking) setShowCheckpoint(false);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Engagement Checkpoint
                        </DialogTitle>
                        <DialogDescription>
                            Please enter the 6-digit code from your authenticator app to confirm you are still engaged.
                            <div className={`mt-2 font-bold text-center text-lg ${timeLeft < 30 ? "text-destructive animate-pulse" : "text-primary"}`}>
                                Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Authenticator Code</Label>
                            <Input
                                id="otp"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="000000"
                                className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                                maxLength={6}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleVerifyCheckpoint();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full"
                            onClick={handleVerifyCheckpoint}
                            disabled={otp.length !== 6 || isVerifying}
                        >
                            {isVerifying ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Verify Checkpoint"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
