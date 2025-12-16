import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useWorkHistory } from "@/hooks/use-work-history";
import { formatDate } from "@/utils/format-date";
import { Loader2 } from "lucide-react";

interface WorkHistorySheetProps {
    userId: string | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName: string;
}

const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const formatDuration = (start: string, end: string | undefined) => {
    if (!end) return "Ongoing";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
};

export function WorkHistorySheet({
    userId,
    open,
    onOpenChange,
    userName,
}: WorkHistorySheetProps) {
    const { data: history, isLoading } = useWorkHistory(userId);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Work History - {userName}</SheetTitle>
                    <SheetDescription>
                        View the detailed work logs and session durations.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 h-[calc(100vh-150px)] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : history?.length === 0 ? (
                        <div className="text-center text-muted-foreground p-8">
                            No work history found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time Range</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history?.map((session: any) => (
                                    <TableRow key={session._id}>
                                        <TableCell>
                                            {formatDate(session.startTime)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs text-muted-foreground">
                                                <span>{formatTime(session.startTime)}</span>
                                                <span>
                                                    {session.endTime
                                                        ? formatTime(session.endTime)
                                                        : "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {formatDuration(
                                                session.startTime,
                                                session.endTime
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
