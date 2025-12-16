import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAllUsers } from "@/hooks/use-admin";
import { useAuth } from "@/provider/auth-context";
import { useSocket } from "@/provider/socket-context";
import { formatDate } from "@/utils/format-date";
import { WorkHistorySheet } from "@/components/work-tracking/work-history-sheet";
import { Button } from "@/components/ui/button";
import { Clock, History, Loader2, Signal } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router";

const UserTimer = ({ startTime }: { startTime?: string }) => {
    const [elapsed, setElapsed] = useState("00:00:00");

    useEffect(() => {
        if (!startTime) return;

        const start = new Date(startTime);

        const interval = setInterval(() => {
            const now = new Date();
            const diff = now.getTime() - start.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    if (!startTime) return null;
    return <span className="font-mono tabular-nums">{elapsed}</span>;
}

export default function AllUsers() {
    const { user } = useAuth();
    const { data: users, isLoading } = useAllUsers();
    const { onlineUsers, userWorkStatus } = useSocket();
    const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    if (!user?.isSuperAdmin) {
        return <Navigate to="/dashboard" />;
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Users</h1>
                    <p className="text-muted-foreground">
                        Manage and view all registered users in the system.
                    </p>
                </div>
                <Badge variant="outline" className="px-4 py-2 text-sm">
                    Total Users: {users?.length || 0}
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Users Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Work Activity</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Joined Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users?.map((userData: any) => {
                                const isOnline = onlineUsers.includes(userData._id);
                                const workStatus = userWorkStatus.get(userData._id);
                                const isWorking = workStatus?.isWorking;

                                return (
                                    <TableRow key={userData._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <Avatar>
                                                        <AvatarImage src={userData.profilePicture} />
                                                        <AvatarFallback>
                                                            {getInitials(userData.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {isOnline && (
                                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{userData.name}</span>
                                                    <span className="text-xs text-muted-foreground">{userData.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {isOnline ? (
                                                    <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50">
                                                        <Signal className="h-3 w-3 mr-1" />
                                                        Online
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-muted-foreground">
                                                        Offline
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isWorking ? (
                                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                                    <Clock className="h-4 w-4 animate-pulse" />
                                                    <UserTimer startTime={workStatus?.startTime} />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 ml-2"
                                                        onClick={() => {
                                                            setSelectedUser({ id: userData._id, name: userData.name });
                                                            setIsHistoryOpen(true);
                                                        }}
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-muted-foreground"
                                                    onClick={() => {
                                                        setSelectedUser({ id: userData._id, name: userData.name });
                                                        setIsHistoryOpen(true);
                                                    }}
                                                >
                                                    <History className="h-4 w-4 mr-2" />
                                                    History
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {userData.isSuperAdmin ? (
                                                <Badge>Super Admin</Badge>
                                            ) : (
                                                <Badge variant="outline">User</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(new Date(userData.createdAt))}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <WorkHistorySheet
                userId={selectedUser?.id}
                userName={selectedUser?.name || ""}
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
            />
        </div >
    );
}
