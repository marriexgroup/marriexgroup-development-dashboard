import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useWorkHistory } from "@/hooks/use-work-history";
import { formatDate } from "@/utils/format-date";
import { Loader2, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { useState, useMemo } from "react";
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    isWithinInterval,
    format,
} from "date-fns";
import { cn } from "@/lib/utils";

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

const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
};

const getSessionDuration = (start: string, end: string | undefined) => {
    if (!end) return 0;
    return new Date(end).getTime() - new Date(start).getTime();
};

type FilterType = "all" | "weekly" | "monthly";

export function WorkHistorySheet({
    userId,
    open,
    onOpenChange,
    userName,
}: WorkHistorySheetProps) {
    const { data: history, isLoading } = useWorkHistory(userId);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [currentDate, setCurrentDate] = useState(new Date());

    const dateRange = useMemo(() => {
        if (filterType === "weekly") {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return { start, end };
        } else if (filterType === "monthly") {
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            return { start, end };
        }
        return null;
    }, [filterType, currentDate]);

    const filteredHistory = useMemo(() => {
        if (!history) return [];
        if (filterType === "all") return history;

        if (!dateRange) return history;

        return history.filter((session: any) => {
            const sessionDate = new Date(session.startTime);
            return isWithinInterval(sessionDate, {
                start: dateRange.start,
                end: dateRange.end,
            });
        });
    }, [history, filterType, dateRange]);

    const totalDuration = useMemo(() => {
        return filteredHistory.reduce((acc: number, session: any) => {
            return acc + getSessionDuration(session.startTime, session.endTime);
        }, 0);
    }, [filteredHistory]);

    const handlePrevious = () => {
        if (filterType === "weekly") {
            setCurrentDate((prev) => subWeeks(prev, 1));
        } else if (filterType === "monthly") {
            setCurrentDate((prev) => subMonths(prev, 1));
        }
    };

    const handleNext = () => {
        if (filterType === "weekly") {
            setCurrentDate((prev) => addWeeks(prev, 1));
        } else if (filterType === "monthly") {
            setCurrentDate((prev) => addMonths(prev, 1));
        }
    };

    const getDateLabel = () => {
        if (filterType === "all") return "";
        if (!dateRange) return "";

        if (filterType === "weekly") {
            return `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`;
        }
        return format(dateRange.start, "MMMM yyyy");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full h-[98vh] rounded-lg flex flex-col p-0 gap-0 sm:max-w-[98vw]">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <DialogTitle className="text-xl">Work History - {userName}</DialogTitle>
                    <DialogDescription>
                        View detailed work logs, filter by week or month, and track total hours.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col bg-background">
                    {/* Controls Bar */}
                    <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                            <Select
                                value={filterType}
                                onValueChange={(value: FilterType) => {
                                    setFilterType(value);
                                    setCurrentDate(new Date()); // Reset date when switching filters
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter View" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>

                            {filterType !== "all" && (
                                <div className="flex items-center gap-2 border rounded-md bg-background px-2 py-1 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handlePrevious}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="min-w-[150px] text-center font-medium text-sm tabular-nums">
                                        {getDateLabel()}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 text-primary rounded-lg border border-primary/10 shadow-sm">
                            <div className="p-1.5 bg-primary/10 rounded-full">
                                <Calculator className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Total Duration</span>
                                <span className="font-mono font-bold text-lg leading-none">
                                    {formatDuration(totalDuration)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8 h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredHistory?.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8 flex flex-col items-center justify-center h-[50vh]">
                                <div className="p-4 bg-muted/30 rounded-full mb-4">
                                    <Calculator className="h-8 w-8 opacity-20" />
                                </div>
                                <p className="text-lg font-medium">No work history found</p>
                                <p className="text-sm">Try adjusting your filters or date range.</p>
                            </div>
                        ) : (
                            <div className="border rounded-md shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Date</TableHead>
                                            <TableHead>Time Range</TableHead>
                                            <TableHead className="text-center">Checkpoints</TableHead>
                                            <TableHead className="text-right">Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistory?.map((session: any) => {
                                            const duration = getSessionDuration(session.startTime, session.endTime);
                                            return (
                                                <TableRow key={session._id}>
                                                    <TableCell className="font-medium">
                                                        {formatDate(session.startTime)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                                                                {formatTime(session.startTime)}
                                                            </span>
                                                            <span className="text-muted-foreground/50">→</span>
                                                            <span className={cn("px-2 py-0.5 rounded font-mono text-xs", !session.endTime && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500", session.endTime && "bg-muted")}>
                                                                {session.endTime
                                                                    ? formatTime(session.endTime)
                                                                    : "Ongoing"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {session.checkpoints && session.checkpoints.length > 0 ? (
                                                            <div className="flex flex-col items-center">
                                                                {session.checkpoints.filter((c: any) => c.status === "passed").length > 0 && <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                                                    {session.checkpoints.filter((c: any) => c.status === "passed").length} Passed
                                                                </span>}
                                                                {session.checkpoints.some((c: any) => c.status === "failed") && (
                                                                    <span className="text-[10px] text-destructive">
                                                                        {session.checkpoints.filter((c: any) => c.status === "failed").length} Failed
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium">
                                                        {session.endTime
                                                            ? formatDuration(duration)
                                                            : <span className="text-yellow-600 dark:text-yellow-500 text-xs uppercase font-bold tracking-wider">Ongoing</span>}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
