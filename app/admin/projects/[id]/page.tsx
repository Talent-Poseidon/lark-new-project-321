"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  UserPlus,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
} from "lucide-react";
import Link from "next/link";

interface Invitation {
  id: string;
  email: string;
  name: string;
  status: string;
  sentAt: string | null;
  expiresAt: string | null;
  batchId: string;
}

interface BatchData {
  id: string;
  name: string;
  invitations: Invitation[];
}

interface AssessorUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface Assessor {
  id: string;
  userId: string;
  assignedAt: string;
  user: AssessorUser;
}

interface ProjectEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  configuration: Record<string, unknown>;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
  batches: BatchData[];
  assessors: Assessor[];
  events: ProjectEvent[];
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string | null;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "sent":
      return <Mail className="h-4 w-4 text-blue-500" />;
    case "accepted":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "expired":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const statusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "sent":
      return "default";
    case "accepted":
      return "default";
    case "expired":
      return "destructive";
    default:
      return "secondary";
  }
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<{ type: string; message: string }>({
    type: "",
    message: "",
  });
  const [assessorEmail, setAssessorEmail] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [sendingInvitations, setSendingInvitations] = useState<boolean>(false);
  const [assigningAssessor, setAssigningAssessor] = useState<boolean>(false);

  const fetchProject = useCallback(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => {
        if (Array.isArray(data)) {
          const found = data.find((p: Project) => p.id === projectId);
          if (found) setProject(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    // Fetch available users for assessor assignment
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data: AvailableUser[]) => {
        if (Array.isArray(data)) setAvailableUsers(data);
      })
      .catch(() => {});
  }, [fetchProject]);

  const sendInvitations = async () => {
    if (!project) return;
    setSendingInvitations(true);
    setAlert({ type: "", message: "" });

    const pendingInvitations = project.batches
      .flatMap((b: BatchData) => b.invitations)
      .filter((inv: Invitation) => inv.status === "pending")
      .map((inv: Invitation) => inv.id);

    if (pendingInvitations.length === 0) {
      setAlert({ type: "error", message: "No pending invitations to send" });
      setSendingInvitations(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationIds: pendingInvitations }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send invitations");
      }
      const result = await res.json();
      setAlert({ type: "success", message: result.message });
      fetchProject();
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send invitations",
      });
    } finally {
      setSendingInvitations(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    setAlert({ type: "", message: "" });
    try {
      const res = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resend invitation");
      }
      setAlert({ type: "success", message: "Invitation resent successfully" });
      fetchProject();
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to resend invitation",
      });
    }
  };

  const assignAssessor = async () => {
    if (!assessorEmail) {
      setAlert({ type: "error", message: "Please enter an assessor email" });
      return;
    }
    setAssigningAssessor(true);
    setAlert({ type: "", message: "" });

    // Find user by email
    const user = availableUsers.find(
      (u: AvailableUser) => u.email === assessorEmail
    );
    if (!user) {
      setAlert({
        type: "error",
        message:
          "Assessor not found in master data. Assessors must be registered users.",
      });
      setAssigningAssessor(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/assessors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [user.id] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign assessor");
      }
      const result = await res.json();
      setAlert({ type: "success", message: result.message });
      setAssessorEmail("");
      fetchProject();
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to assign assessor",
      });
    } finally {
      setAssigningAssessor(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-6">
        <p data-testid="project-detail-loading">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 p-8 pt-6">
        <p>Project not found</p>
      </div>
    );
  }

  const allInvitations = project.batches.flatMap((b: BatchData) => b.invitations);
  const pendingCount = allInvitations.filter(
    (inv: Invitation) => inv.status === "pending"
  ).length;
  const expiredCount = allInvitations.filter(
    (inv: Invitation) => inv.status === "expired"
  ).length;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="project-detail-nav"
          >
            {project.name}
          </h2>
          <p className="text-muted-foreground">
            {project.description || "No description"}
          </p>
        </div>
        <Badge variant={project.status === "active" ? "default" : "secondary"}>
          {project.status}
        </Badge>
      </div>
      <Separator />

      {alert.message && (
        <div
          data-testid={
            alert.type === "success"
              ? "project-success-alert"
              : "project-error-alert"
          }
          className={`rounded-lg border p-4 ${
            alert.type === "success"
              ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invitations Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations ({allInvitations.length})
              </CardTitle>
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={sendInvitations}
                  disabled={sendingInvitations}
                  data-testid="send-invitations-btn"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendingInvitations
                    ? "Sending..."
                    : `Send ${pendingCount} Pending`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {allInvitations.length > 0 ? (
              <div
                className="space-y-2"
                data-testid="invitation-list"
              >
                {allInvitations.map((inv: Invitation) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                    data-testid={`invitation-item-${inv.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(inv.status)}
                      <div>
                        <p className="text-sm font-medium">{inv.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                      {inv.status === "expired" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendInvitation(inv.id)}
                          data-testid={`resend-invitation-${inv.id}-btn`}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Resend
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-testid="invitation-list-empty"
              >
                No participants added to this project yet.
              </p>
            )}
            {expiredCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {expiredCount} invitation(s) have expired and can be resent.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assessors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assessors ({project.assessors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                data-testid="assessor-email-input"
                placeholder="Assessor email"
                value={assessorEmail}
                onChange={(e) => setAssessorEmail(e.target.value)}
              />
              <Button
                onClick={assignAssessor}
                disabled={assigningAssessor}
                data-testid="assign-assessor-btn"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {assigningAssessor ? "Assigning..." : "Assign"}
              </Button>
            </div>

            {project.assessors.length > 0 ? (
              <div
                className="space-y-2"
                data-testid="assessor-list"
              >
                {project.assessors.map((assessor: Assessor) => (
                  <div
                    key={assessor.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                    data-testid={`assessor-item-${assessor.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {assessor.user.name || "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assessor.user.email}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(assessor.assignedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p
                className="text-sm text-muted-foreground"
                data-testid="assessor-list-empty"
              >
                No assessors assigned yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {project.events.length > 0 ? (
            <div className="space-y-3" data-testid="event-list">
              {project.events.map((event: ProjectEvent) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                  data-testid={`event-item-${event.id}`}
                >
                  <Badge>{event.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="event-list-empty">
              No events yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
