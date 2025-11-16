import { Loader } from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetPaymentsQuery, useCreatePaymentMutation, useDeletePaymentMutation } from "@/hooks/use-payment";
import { useGetWorkspacesQuery } from "@/hooks/use-workspace";
import { useGetWorkspaceQuery } from "@/hooks/use-workspace";
import type { Payment, Workspace, Project, Task } from "@/types";
import { format } from "date-fns";
import { DollarSign, Plus, Trash2, Edit } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/provider/auth-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const paymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.enum(["USD", "LKR"]).default("LKR"),
  description: z.string().optional(),
  paymentDate: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  workspace: z.string().min(1, "Workspace is required"),
  projects: z.array(z.string()).optional(),
  tasks: z.array(z.string()).optional(),
  notes: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const Payments = () => {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      currency: "LKR",
      description: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      workspace: "",
      projects: [],
      tasks: [],
      notes: "",
      invoiceNumber: "",
    },
  });

  const { data: workspaces, isLoading: workspacesLoading } = useGetWorkspacesQuery() as {
    data: Workspace[];
    isLoading: boolean;
  };

  const { data: workspaceDetails, isLoading: workspaceDetailsLoading } = useGetWorkspaceQuery(
    selectedWorkspaceId || ""
  ) as {
    data: { projects: Project[]; workspace: Workspace };
    isLoading: boolean;
  };

  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery() as {
    data: Payment[];
    isLoading: boolean;
  };

  const { mutate: createPayment, isPending: isCreating } = useCreatePaymentMutation();
  const { mutate: deletePayment, isPending: isDeleting } = useDeletePaymentMutation();

  // Filter workspaces where user is owner
  const ownedWorkspaces = useMemo(() => {
    if (!workspaces || !user) return [];
    return workspaces.filter((ws) => {
      const isOwner =
        (typeof ws.owner === "object" ? ws.owner._id : ws.owner) === user._id ||
        ws.members.some(
          (member) =>
            member.user._id === user._id && (member.role === "owner" || member.role === "admin")
        );
      return isOwner;
    });
  }, [workspaces, user]);

  // Get all tasks from selected projects
  useEffect(() => {
    if (workspaceDetails?.projects && selectedProjects.length > 0) {
      const tasks: Task[] = [];
      workspaceDetails.projects.forEach((project) => {
        if (selectedProjects.includes(project._id) && project.tasks) {
            let filteredTasks = project.tasks.filter((task) => task.status == "Done");
          tasks.push(...filteredTasks);
        }
      });
      setAvailableTasks(tasks);
    } else {
      setAvailableTasks([]);
      setSelectedTasks([]);
    }
  }, [workspaceDetails, selectedProjects]);

  // Reset form when workspace changes
  useEffect(() => {
    if (selectedWorkspaceId) {
      form.setValue("workspace", selectedWorkspaceId);
      setSelectedProjects([]);
      setSelectedTasks([]);
      form.setValue("projects", []);
      form.setValue("tasks", []);
    }
  }, [selectedWorkspaceId]);

  const handleProjectToggle = (projectId: string) => {
    const newSelected = selectedProjects.includes(projectId)
      ? selectedProjects.filter((id) => id !== projectId)
      : [...selectedProjects, projectId];
    setSelectedProjects(newSelected);
    form.setValue("projects", newSelected);
    
    // Remove tasks from unselected projects
    if (!newSelected.includes(projectId)) {
      const project = workspaceDetails?.projects.find((p) => p._id === projectId);
      if (project?.tasks) {
        const taskIds = project.tasks.map((t) => t._id);
        const newSelectedTasks = selectedTasks.filter((id) => !taskIds.includes(id));
        setSelectedTasks(newSelectedTasks);
        form.setValue("tasks", newSelectedTasks);
      }
    }
  };

  const handleTaskToggle = (taskId: string) => {
    const newSelected = selectedTasks.includes(taskId)
      ? selectedTasks.filter((id) => id !== taskId)
      : [...selectedTasks, taskId];
    setSelectedTasks(newSelected);
    form.setValue("tasks", newSelected);
  };

  const onSubmit = (data: PaymentFormData) => {
    createPayment(
      {
        ...data,
        projects: selectedProjects,
        tasks: selectedTasks,
      },
      {
        onSuccess: () => {
          toast.success("Payment created successfully");
          form.reset();
          setSelectedWorkspaceId("");
          setSelectedProjects([]);
          setSelectedTasks([]);
          setIsCreateDialogOpen(false);
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.message || "Failed to create payment";
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleDelete = (paymentId: string) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      deletePayment(paymentId, {
        onSuccess: () => {
          toast.success("Payment deleted successfully");
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.message || "Failed to delete payment";
          toast.error(errorMessage);
        },
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (paymentsLoading || workspacesLoading) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        {ownedWorkspaces.length > 0 && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payment
          </Button>
        )}
      </div>

      {ownedWorkspaces.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            You need to be a workspace owner to create payments.
          </CardContent>
        </Card>
      )}

      {payments && payments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No payments found. Create your first payment to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments?.map((payment) => {
            const isOwner =
              (typeof payment.workspace.owner === "object"
                ? payment.workspace.owner._id
                : payment.workspace.owner) === user?._id ||
              payment.workspace.members?.some(
                (member) =>
                  member.user._id === user?._id &&
                  (member.role === "owner" || member.role === "admin")
              );

            return (
              <Card key={payment._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: payment.workspace.color }}
                        />
                        <CardTitle className="text-lg">
                          {payment.workspace.name}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        {payment.amount} {payment.currency}
                        {payment.invoiceNumber && ` • Invoice: ${payment.invoiceNumber}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(payment._id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {payment.description && (
                    <p className="text-sm text-gray-600 mb-3">{payment.description}</p>
                  )}

                  {payment.projects && payment.projects.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Projects:</p>
                      <div className="flex flex-wrap gap-2">
                        {payment.projects.map((project) => (
                          <Badge key={project._id} variant="outline">
                            {project.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {payment.tasks && payment.tasks.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Tasks:</p>
                      <div className="flex flex-wrap gap-2">
                        {payment.tasks.map((task) => (
                          <Badge key={task._id} variant="secondary">
                            {task.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Payment Date: {format(new Date(payment.paymentDate), "MMM dd, yyyy")}
                    </span>
                    <span>
                      Created: {format(new Date(payment.createdAt), "MMM dd, yyyy")}
                    </span>
                    {payment.createdBy && (
                      <span>By: {typeof payment.createdBy === "object" ? payment.createdBy.name : "Unknown"}</span>
                    )}
                  </div>

                  {payment.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <p className="font-medium mb-1">Notes:</p>
                      <p className="text-gray-600">{payment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Payment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Payment</DialogTitle>
            <DialogDescription>
              Create a new payment record for selected projects and tasks
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="workspace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace *</FormLabel>
                    <Select
                      value={selectedWorkspaceId}
                      onValueChange={(value) => {
                        setSelectedWorkspaceId(value);
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workspace" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ownedWorkspaces.map((ws) => (
                          <SelectItem key={ws._id} value={ws._id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: ws.color }}
                              />
                              {ws.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedWorkspaceId && workspaceDetailsLoading && (
                <div className="text-sm text-gray-500">Loading projects...</div>
              )}

              {selectedWorkspaceId && workspaceDetails?.projects && (
                <FormItem>
                  <FormLabel>Projects</FormLabel>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                    {workspaceDetails.projects.length === 0 ? (
                      <p className="text-sm text-gray-500">No projects available</p>
                    ) : (
                      workspaceDetails.projects.map((project) => (
                        <div key={project._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={project._id}
                            checked={selectedProjects.includes(project._id)}
                            onCheckedChange={() => handleProjectToggle(project._id)}
                          />
                          <label
                            htmlFor={project._id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {project.title}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </FormItem>
              )}

              {selectedProjects.length > 0 && availableTasks.length > 0 && (
                <FormItem>
                  <FormLabel>Select Tasks</FormLabel>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-3">
                    {availableTasks.map((task) => (
                      <div key={task._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={task._id}
                          checked={selectedTasks.includes(task._id)}
                          onCheckedChange={() => handleTaskToggle(task._id)}
                        />
                        <label
                          htmlFor={task._id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {task.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="LKR">LKR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Payment description"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice number (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    form.reset();
                    setSelectedWorkspaceId("");
                    setSelectedProjects([]);
                    setSelectedTasks([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;

