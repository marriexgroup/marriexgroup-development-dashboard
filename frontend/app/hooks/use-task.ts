import type { CreateTaskFormData } from "@/components/task/create-task-dialog";
import { fetchData, postData, updateData } from "@/lib/fetch-util";
import type { TaskPriority, TaskStatus } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { projectId: string; taskData: CreateTaskFormData }) => {
      const formData = new FormData();
      
      // Add all form fields except images
      formData.append('title', data.taskData.title);
      formData.append('description', data.taskData.description || '');
      formData.append('status', data.taskData.status);
      formData.append('priority', data.taskData.priority);
      formData.append('dueDate', data.taskData.dueDate);
      formData.append('assignees', JSON.stringify(data.taskData.assignees));
      
      // Add images if they exist
      if (data.taskData.images && data.taskData.images.length > 0) {
        data.taskData.images.forEach((image, index) => {
          formData.append('images', image);
        });
      }
      
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api-v1";
      const token = localStorage.getItem("token");
      
      return fetch(`${BASE_URL}/tasks/${data.projectId}/create-task`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to create task');
        }
        return res.json();
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["project", data.project],
      });
    },
  });
};

export const useTaskByIdQuery = (taskId: string) => {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchData(`/tasks/${taskId}`),
  });
};

export const useUpdateTaskTitleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; title: string }) =>
      updateData(`/tasks/${data.taskId}/title`, { title: data.title }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useUpdateTaskStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; status: TaskStatus }) =>
      updateData(`/tasks/${data.taskId}/status`, { status: data.status }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useUpdateTaskDescriptionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; description: string }) =>
      updateData(`/tasks/${data.taskId}/description`, {
        description: data.description,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useUpdateTaskAssigneesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; assignees: string[] }) =>
      updateData(`/tasks/${data.taskId}/assignees`, {
        assignees: data.assignees,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useUpdateTaskPriorityMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; priority: TaskPriority }) =>
      updateData(`/tasks/${data.taskId}/priority`, { priority: data.priority }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useAddSubTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; title: string }) =>
      postData(`/tasks/${data.taskId}/add-subtask`, { title: data.title }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useUpdateSubTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      taskId: string;
      subTaskId: string;
      completed: boolean;
    }) =>
      updateData(`/tasks/${data.taskId}/update-subtask/${data.subTaskId}`, {
        completed: data.completed,
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useAddCommentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string; text: string; images?: File[] }) => {
      const formData = new FormData();
      
      // Add text field
      formData.append('text', data.text || '');
      
      // Add images if they exist
      if (data.images && data.images.length > 0) {
        data.images.forEach((image) => {
          formData.append('images', image);
        });
      }
      
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api-v1";
      const token = localStorage.getItem("token");
      
      return fetch(`${BASE_URL}/tasks/${data.taskId}/add-comment`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).then(res => {
        if (!res.ok) {
          throw new Error('Failed to add comment');
        }
        return res.json();
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", data.task],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data.task],
      });
    },
  });
};

export const useGetCommentsByTaskIdQuery = (taskId: string) => {
  return useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => fetchData(`/tasks/${taskId}/comments`),
  });
};

export const useWatchTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string }) =>
      postData(`/tasks/${data.taskId}/watch`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useAchievedTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { taskId: string }) =>
      postData(`/tasks/${data.taskId}/achieved`, {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["task", data._id],
      });
      queryClient.invalidateQueries({
        queryKey: ["task-activity", data._id],
      });
    },
  });
};

export const useGetMyTasksQuery = () => {
  return useQuery({
    queryKey: ["my-tasks", "user"],
    queryFn: () => fetchData("/tasks/my-tasks"),
  });
};
