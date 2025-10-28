import type { User, Workspace } from "@/types";
import { WorkspaceAvatar } from "./workspace-avatar";
import { Button } from "../ui/button";
import { Plus, UserPlus, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAcceptGenerateInviteMutation, useSearchWorkspaceMembers } from "@/hooks/use-workspace";
import { Loader } from "../loader";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  members: {
    _id: string;
    user: User;
    role: "admin" | "member" | "owner" | "viewer";
    joinedAt: Date;
  }[];
  onCreateProject: () => void;
  onAddMember: () => void;
}

export const WorkspaceHeader = ({
  workspace,
  members,
  onCreateProject,
  onAddMember,
}: WorkspaceHeaderProps) => {
  console.log(members);
  
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("member");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const { data, isLoading, isFetching } = useSearchWorkspaceMembers(search);
  const users = useMemo(() => (data as any)?.users ?? [], [data]);
  const showResults = search.length > 0;
  const { mutate: acceptInvite, isPending: isAccepting } = useAcceptGenerateInviteMutation();
  const queryClient = useQueryClient();

  const getInitials = (name?: string, email?: string) => {
    const source = (name && name.trim().length > 0 ? name : email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) || "?";
    const second = parts.length > 1 ? parts[1].charAt(0) : "";
    return (first + second).toUpperCase();
  };
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-3">
          <div className="flex md:items-center gap-3">
            {workspace.color && (
              <WorkspaceAvatar color={workspace.color} name={workspace.name} />
            )}

            <h2 className="text-xl md:text-2xl font-semibold">
              {workspace.name}
            </h2>
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-start mb-4 md:mb-0">
            {/* <Button variant={"outline"} onClick={onAddMember}>
              <UserPlus className="size-4 mr-2" />
              Add Member
            </Button> */}
            <Button onClick={onCreateProject}>
              <Plus className="size-4 mr-2" />
              Create Project
            </Button>
          </div>
        </div>

        {workspace.description && (
          <p className="text-sm md:text-base text-muted-foreground">
            {workspace.description}
          </p>
        )}
      </div>

      {/* Add Member UI Section */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Add Team Members</h3>
          <p className="text-xs text-muted-foreground">
            Search for users and add them to your workspace with a specific role
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search members..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {showResults && (
                <div className="absolute z-20 mt-2 w-full border border-border rounded-md bg-background shadow-sm max-h-64 overflow-auto">
                  <div className="p-2 space-y-1">
                    {(isLoading || isFetching) && (
                      <div className="flex items-center justify-center py-4">
                        <Loader />
                      </div>
                    )}
                    {!isLoading && !isFetching && users.length === 0 && (
                      <div className="py-3 text-center text-sm text-muted-foreground">No users found</div>
                    )}
                    {!isLoading && !isFetching && users.length > 0 && (
                      <div className="space-y-1">
                        {users.map((u: any) => (
                          <div
                            key={u._id ?? u.email}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => {
                              setSelectedUser(u);
                              setSearch("");
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={u.profilePicture} />
                              <AvatarFallback className="text-xs">{(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{u.name ?? "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <select className="w-full sm:w-32 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <Button
              size="sm"
              className="whitespace-nowrap"
              onClick={() =>
                selectedUser &&
                acceptInvite({ workspaceId: workspace._id, memberId: selectedUser._id }, {
                  onSuccess: () => {
                    toast.success("Member added successfully");
                    queryClient.invalidateQueries({ queryKey: ["workspace", workspace._id, "details"] });
                    queryClient.invalidateQueries({ queryKey: ["workspace", workspace._id] });
                    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
                    setSelectedUser(null);
                    setTimeout(() => setSuccessMessage(""), 2000);
                  },
                })
              }
              disabled={!selectedUser || isAccepting}
            >
              <UserPlus className="size-4 mr-2" />
              {isAccepting ? "Adding..." : selectedUser ? "Add" : "Select user"}
            </Button>
          </div>
          
          {/* results rendered within input container above */}
        </div>
      </div>

      {members.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Members</span>

          <div className="flex space-x-2">
            {members.map((member) => (
              <Avatar
                key={member._id}
                className="relative h-8 w-8 rounded-full border-2 border-background overflow-hidden"
                title={member.user.name}
              >
                <AvatarImage
                  src={member.user.profilePicture}
                  alt={member.user.name}
                />
                <AvatarFallback>{getInitials(member.user.name, member.user.email)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};