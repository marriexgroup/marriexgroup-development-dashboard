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
  slipImage?: File | null;
}

export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      const formData = new FormData();
      formData.append("amount", data.amount.toString());
      formData.append("currency", data.currency || "USD");
      formData.append("description", data.description || "");
      formData.append("paymentDate", data.paymentDate || "");
      formData.append("status", data.status || "pending");
      formData.append("workspace", data.workspace);
      formData.append("notes", data.notes || "");
      formData.append("invoiceNumber", data.invoiceNumber || "");

      if (data.projects && data.projects.length > 0) {
        formData.append("projects", JSON.stringify(data.projects));
      }
      if (data.tasks && data.tasks.length > 0) {
        formData.append("tasks", JSON.stringify(data.tasks));
      }
      if (data.slipImage) {
        formData.append("slipImage", data.slipImage);
      }

      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api-v1";
      const token = localStorage.getItem("token");

      const response = await fetch(`${BASE_URL}/payments`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment");
      }

      return response.json();
    },
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

