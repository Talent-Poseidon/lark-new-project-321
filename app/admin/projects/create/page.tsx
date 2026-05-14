"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, X } from "lucide-react";
import Link from "next/link";

interface Participant {
  name: string;
  email: string;
}

interface MasterDataItem {
  id: string;
  type: string;
  name: string;
}

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [batchName, setBatchName] = useState<string>("Batch 1");
  const [configuration, setConfiguration] = useState<string>("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState<string>("");
  const [newParticipantEmail, setNewParticipantEmail] = useState<string>("");
  const [alert, setAlert] = useState<{ type: string; message: string }>({
    type: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [masterDataAvailable, setMasterDataAvailable] = useState<boolean | null>(null);
  const [masterData, setMasterData] = useState<MasterDataItem[]>([]);

  // Check master data availability on mount
  useEffect(() => {
    fetch("/api/master-data")
      .then((res) => res.json())
      .then((data: MasterDataItem[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMasterDataAvailable(true);
          setMasterData(data);
        } else {
          setMasterDataAvailable(false);
        }
      })
      .catch(() => setMasterDataAvailable(false));
  }, []);

  const addParticipant = () => {
    if (!newParticipantName || !newParticipantEmail) {
      setAlert({ type: "error", message: "Participant name and email are required" });
      return;
    }
    if (participants.length >= 20) {
      setAlert({
        type: "error",
        message:
          "A batch cannot exceed 20 participants. Please create the project and add a new batch for additional participants.",
      });
      return;
    }
    setParticipants([
      ...participants,
      { name: newParticipantName, email: newParticipantEmail },
    ]);
    setNewParticipantName("");
    setNewParticipantEmail("");
    setAlert({ type: "", message: "" });
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert({ type: "", message: "" });

    if (!name) {
      setAlert({ type: "error", message: "Project name is required" });
      return;
    }

    if (!masterDataAvailable) {
      setAlert({
        type: "error",
        message:
          "Master data is not available. Please set up master data (templates, competencies) before creating a project.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          batchName,
          participants,
          configuration: configuration ? JSON.parse(configuration) : {},
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create project");
      }

      setAlert({ type: "success", message: "Project created successfully" });
      setTimeout(() => router.push("/admin/projects"), 1000);
    } catch (err) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create project",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
            data-testid="create-project-page-nav"
          >
            Create Project
          </h2>
          <p className="text-muted-foreground">Set up a new assessment project</p>
        </div>
      </div>
      <Separator />

      {masterDataAvailable === false && (
        <div
          data-testid="master-data-error-alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
        >
          Master data is not available. Please set up master data (templates,
          competencies, dictionaries) before creating a project.
        </div>
      )}

      {alert.message && (
        <div
          data-testid={
            alert.type === "success"
              ? "project-created-alert"
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

      <form data-testid="create-project-form" onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="project-name">
                  Project Name *
                </label>
                <Input
                  id="project-name"
                  data-testid="project-name-input"
                  name="name"
                  placeholder="Enter project name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="project-description">
                  Description
                </label>
                <Input
                  id="project-description"
                  data-testid="project-description-input"
                  name="description"
                  placeholder="Enter project description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="project-configuration">
                  Configuration (JSON)
                </label>
                <Input
                  id="project-configuration"
                  data-testid="project-configuration-input"
                  name="configuration"
                  placeholder='{"key": "value"}'
                  value={configuration}
                  onChange={(e) => setConfiguration(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Batch & Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Batch &amp; Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium" htmlFor="batch-name">
                  Batch Name
                </label>
                <Input
                  id="batch-name"
                  data-testid="batch-name-input"
                  name="batchName"
                  placeholder="Batch 1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Participants ({participants.length}/20)
                </label>
                <div className="flex gap-2">
                  <Input
                    data-testid="participant-name-input"
                    placeholder="Name"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                  />
                  <Input
                    data-testid="participant-email-input"
                    placeholder="Email"
                    value={newParticipantEmail}
                    onChange={(e) => setNewParticipantEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addParticipant}
                    data-testid="add-participant-btn"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {participants.length > 0 && (
                  <div
                    className="space-y-2"
                    data-testid="participant-list"
                  >
                    {participants.map((p: Participant, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border p-2"
                        data-testid={`participant-item-${i}`}
                      >
                        <span className="text-sm">
                          {p.name} ({p.email})
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(i)}
                          data-testid={`remove-participant-${i}-btn`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {masterData.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Available master data: {masterData.map((m: MasterDataItem) => m.name).join(", ")}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            type="submit"
            data-testid="submit-project-btn"
            disabled={submitting || masterDataAvailable === false}
            className="w-full"
          >
            {submitting ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
