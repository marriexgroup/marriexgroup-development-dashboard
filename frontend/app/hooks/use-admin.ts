import { fetchData } from "@/lib/fetch-util";
import { useQuery } from "@tanstack/react-query";

export const useAllUsers = () => {
    return useQuery({
        queryKey: ["admin-users"],
        queryFn: () => fetchData<any>("/admin/users"),
    });
};
