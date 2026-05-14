"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FolderOpen, Users, UserCheck, Calendar } from "lucide-react";

interface ProjectEvent {
  id: string;
  type: string;
  createdAt: string;
}

interface Invitation {
  id: string;
  email: string;
  name: string;
  status: string;
}

interface BatchData {
  id: string;
  name: string;
  invitations: Invitation[];
}

interface Assessor {
  id: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
  batches: BatchData[];
  assessors: Assessor[];
  events: ProjectEvent[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => {
        if (Array.isArray(data)) setProjects(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const totalParticipants = (project: Project) =>
    project.batches.reduce((sum, b) => sum + b.invitations.length, 0);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="project-page-nav">
            Projects
          </h2>
          <p className="text-muted-foreground">Manage your assessment projects</p>
        </div>
        <Button asChild data-testid="new-project-btn">
          <Link href="/admin/projects/create">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>
      <Separator />

      <div data-testid="project-list-container">
        {loading ? (
          <p data-testid="project-list-loading">Loading projects...</p>
        ) : projects.length > 0 ? (
          <div className="grid gap-4" data-testid="project-list">
            {projects.map((project: Project) => (
              <Link
                key={project.id}
                href={`/admin/projects/${project.id}`}
                data-testid={`project-item-${project.id}`}
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FolderOpen className="h-5 w-5" />
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant={project.status === "active" ? "default" : "secondary"}
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="mb-3 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {totalParticipants(project)} participants
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        {project.assessors.length} assessors
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p data-testid="project-list-empty" className="text-muted-foreground">
                No projects yet. Create your first project to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/projects/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
