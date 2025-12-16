import { fetchData } from "@/lib/fetch-util";
import { useQuery } from "@tanstack/react-query";

export const useWorkHistory = (userId: string | undefined) => {
    return useQuery({
        queryKey: ["work-history", userId],
        queryFn: () => fetchData<any>(`/work-sessions/user/${userId}`),
        enabled: !!userId,
    });
};
