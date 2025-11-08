import { Loader } from "@/components/loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetWorkspacesQuery } from "@/hooks/use-workspace";
import type { Workspace } from "@/types";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

const Members = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState<string>(initialSearch);

  useEffect(() => {
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      if (key !== "workspaceId") {
        params[key] = value;
      }
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

  const { data: workspaces, isLoading } = useGetWorkspacesQuery() as {
    data: Workspace[];
    isLoading: boolean;
  };

  if (isLoading)
    return (
      <div>
        <Loader />
      </div>
    );

  if (!workspaces || workspaces.length === 0) return <div>No workspaces found</div>;

  // Filter members across all workspaces based on search
  const workspacesWithFilteredMembers = workspaces.map((workspace) => {
    const filteredMembers = workspace.members?.filter(
      (member) => {
        const searchLower = search.toLowerCase();
        const name = member.user?.name?.toLowerCase() || "";
        const email = member.user?.email?.toLowerCase() || "";
        const role = member.role?.toLowerCase() || "";
        
        return (
          name.includes(searchLower) ||
          email.includes(searchLower) ||
          role.includes(searchLower)
        );
      }
    ) || [];
    
    return {
      ...workspace,
      filteredMembers,
    };
  }).filter((workspace) => workspace.filteredMembers.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold">Workspace Members</h1>
      </div>

      <Input
        placeholder="Search members ...."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="board">Board View</TabsTrigger>
        </TabsList>

        {/* LIST VIEW */}
        <TabsContent value="list">
          <div className="space-y-6">
            {workspacesWithFilteredMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No members found matching your search.
                </CardContent>
              </Card>
            ) : (
              workspacesWithFilteredMembers.map((workspace) => (
                <Card key={workspace._id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: workspace.color }}
                      />
                      {workspace.name}
                    </CardTitle>
                    <CardDescription>
                      {workspace.filteredMembers.length} member
                      {workspace.filteredMembers.length !== 1 ? "s" : ""} in this workspace
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="divide-y">
                      {workspace.filteredMembers.map((member, index) => (
                        <div
                          key={`${workspace._id}-${member.user?._id || index}`}
                          className="flex flex-col md:flex-row items-center justify-between p-4 gap-3"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar className="bg-gray-500">
                              <AvatarImage src={member.user?.profilePicture} />
                              <AvatarFallback>
                                {member.user?.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.user?.name || "Unknown"}</p>
                              <p className="text-sm text-gray-500">
                                {member.user?.email || "No email"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 ml-11 md:ml-0 flex-wrap gap-2">
                            <Badge
                              variant={
                                ["admin", "owner"].includes(member.role)
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {member.role}
                            </Badge>

                            <Badge variant={"outline"}>{workspace.name}</Badge>

                            {member.role !== "owner" && (
                              <Badge
                                variant={
                                  member.user?.dataProtectionAgreement?.accepted
                                    ? "default"
                                    : "destructive"
                                }
                                className="flex items-center gap-1"
                              >
                                {member.user?.dataProtectionAgreement?.accepted ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Agreement Accepted
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    Agreement Pending
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* BOARD VIEW */}
        <TabsContent value="board">
          <div className="space-y-8">
            {workspacesWithFilteredMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No members found matching your search.
                </CardContent>
              </Card>
            ) : (
              workspacesWithFilteredMembers.map((workspace) => (
                <div key={workspace._id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: workspace.color }}
                    />
                    <h2 className="text-xl font-semibold">{workspace.name}</h2>
                    <Badge variant="outline" className="ml-2">
                      {workspace.filteredMembers.length} member
                      {workspace.filteredMembers.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {workspace.filteredMembers.map((member, index) => (
                      <Card key={`${workspace._id}-${member.user?._id || index}`}>
                        <CardContent className="p-6 flex flex-col items-center text-center">
                          <Avatar className="bg-gray-500 size-20 mb-4">
                            <AvatarImage src={member.user?.profilePicture} />
                            <AvatarFallback className="uppercase">
                              {member.user?.name?.substring(0, 2) || "??"}
                            </AvatarFallback>
                          </Avatar>

                          <h3 className="text-lg font-medium mb-2">
                            {member.user?.name || "Unknown"}
                          </h3>

                          <p className="text-sm text-gray-500 mb-4">
                            {member.user?.email || "No email"}
                          </p>

                          <div className="flex flex-col gap-2 items-center">
                            <Badge
                              variant={
                                ["admin", "owner"].includes(member.role)
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {member.role}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {workspace.name}
                            </Badge>
                            {member.role !== "owner" && (
                              <Badge
                                variant={
                                  member.user?.dataProtectionAgreement?.accepted
                                    ? "default"
                                    : "destructive"
                                }
                                className="flex items-center gap-1 text-xs"
                              >
                                {member.user?.dataProtectionAgreement?.accepted ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Agreement Accepted
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" />
                                    Agreement Pending
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Members;
