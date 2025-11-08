import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import type { Payment, PaymentStatus, PaymentCurrency } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CreatePaymentData {
  amount: number;
  currency?: PaymentCurrency;
  description?: string;
  paymentDate?: string;
  status?: PaymentStatus;
  projects?: string[];
  tasks?: string[];
  workspace: string;
  notes?: string;
  invoiceNumber?: string;
}

export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentData) =>
      postData("/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
    },
  });
};

export const useGetPaymentsQuery = (workspaceId?: string) => {
  return useQuery({
    queryKey: ["payments", workspaceId],
    queryFn: async () => {
      const url = workspaceId
        ? `/payments?workspaceId=${workspaceId}`
        : "/payments";
      return fetchData(url);
    },
  });
};

export const useGetPaymentByIdQuery = (paymentId: string) => {
  return useQuery({
    queryKey: ["payment", paymentId],
    queryFn: async () => fetchData(`/payments/${paymentId}`),
    enabled: !!paymentId,
  });
};

export const useUpdatePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { paymentId: string; data: Partial<CreatePaymentData> }) =>
      updateData(`/payments/${data.paymentId}`, data.data),
    onSuccess: (data: Payment) => {
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["payment", data._id],
      });
    },
  });
};

export const useDeletePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) =>
      deleteData(`/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
    },
  });
};

