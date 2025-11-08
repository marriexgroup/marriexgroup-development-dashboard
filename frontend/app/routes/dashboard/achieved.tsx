import { Loader } from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGetCompletedTasksQuery } from "@/hooks/use-task";
import type { Task } from "@/types";
import { format } from "date-fns";
import { ArrowUpRight, CheckCircle2, Archive } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router";

const Achieved = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState<string>(initialSearch);

  useEffect(() => {
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (search) {
      params.search = search;
    } else {
      delete params.search;
    }

    setSearchParams(params, { replace: true });
  }, [search]);

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== search) setSearch(urlSearch);
  }, [searchParams]);

  const { data: tasks, isLoading } = useGetCompletedTasksQuery() as {
    data: Task[];
    isLoading: boolean;
  };

  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    
    return tasks.filter((task) => {
      const searchLower = search.toLowerCase();
      const title = task.title?.toLowerCase() || "";
      const description = task.description?.toLowerCase() || "";
      const projectTitle = (task.project as any)?.title?.toLowerCase() || "";
      const workspaceName = (task.project as any)?.workspace?.name?.toLowerCase() || "";
      
      return (
        title.includes(searchLower) ||
        description.includes(searchLower) ||
        projectTitle.includes(searchLower) ||
        workspaceName.includes(searchLower)
      );
    });
  }, [tasks, search]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, {
      project: any;
      workspace: any;
      tasks: Task[];
    }> = {};

    filteredTasks.forEach((task) => {
      const project = task.project as any;
      const projectId = project?._id || "unknown";
      const workspace = project?.workspace;

      if (!grouped[projectId]) {
        grouped[projectId] = {
          project,
          workspace,
          tasks: [],
        };
      }

      grouped[projectId].tasks.push(task);
    });

    return Object.values(grouped);
  }, [filteredTasks]);

  if (isLoading) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold">Completed Tasks</h1>
      </div>

      <Input
        placeholder="Search tasks, projects, or workspaces..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {tasksByProject.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            {filteredTasks.length === 0 && tasks && tasks.length > 0
              ? "No tasks found matching your search."
              : "No completed or archived tasks found."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {tasksByProject.map(({ project, workspace, tasks: projectTasks }) => {
            const workspaceId = workspace?._id || workspace;
            const projectId = project?._id;

            return (
              <Card key={projectId}>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {workspace && (
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor:
                            typeof workspace === "object" && workspace?.color
                              ? workspace.color
                              : "#6b7280",
                        }}
                      />
                    )}
                    <CardTitle className="text-lg">
                      {typeof workspace === "object" && workspace?.name
                        ? workspace.name
                        : "Unknown Workspace"}
                    </CardTitle>
                  </div>
                  <CardTitle className="text-xl">{project?.title || "Unknown Project"}</CardTitle>
                  <CardDescription>
                    {projectTasks.length} completed task
                    {projectTasks.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="divide-y">
                    {projectTasks.map((task) => {
                      const taskWorkspaceId =
                        typeof workspace === "object"
                          ? workspace._id
                          : workspace || workspaceId;
                      const taskProjectId = projectId;

                      return (
                        <div
                          key={task._id}
                          className="p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {task.isArchived ? (
                                  <Archive className="size-4 text-gray-500" />
                                ) : (
                                  <CheckCircle2 className="size-4 text-green-500" />
                                )}
                                <Link
                                  to={`/workspaces/${taskWorkspaceId}/projects/${taskProjectId}/tasks/${task._id}`}
                                  className="font-medium hover:text-primary hover:underline transition-colors flex items-center"
                                >
                                  {task.title}
                                  <ArrowUpRight className="size-4 ml-1" />
                                </Link>
                              </div>

                              {task.description && (
                                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant={
                                    task.priority === "High"
                                      ? "destructive"
                                      : task.priority === "Medium"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {task.priority}
                                </Badge>

                                {task.status === "Done" && (
                                  <Badge variant="outline" className="text-green-600">
                                    Done
                                  </Badge>
                                )}

                                {task.isArchived && (
                                  <Badge variant="outline">Archived</Badge>
                                )}

                                {task.dueDate && (
                                  <span className="text-xs text-gray-500">
                                    Due: {format(new Date(task.dueDate), "MMM dd, yyyy")}
                                  </span>
                                )}

                                {task.updatedAt && (
                                  <span className="text-xs text-gray-500">
                                    Updated: {format(new Date(task.updatedAt), "MMM dd, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Achieved;

