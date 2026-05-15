"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Download, FileSpreadsheet } from "lucide-react";

interface RowError {
  row: number;
  field: string;
  message: string;
}

interface ChangeItem {
  code: string;
  status: "new" | "updated" | "deleted";
  changes?: Record<string, { old: string; new: string }>;
  data: {
    code: string;
    name: string;
    type: string;
    description: string;
    behavioralIndicators: string;
  };
}

interface PreviewSummary {
  new: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export default function KamusUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "update">("create");
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [stage, setStage] = useState<string>("");
  const [errors, setErrors] = useState<RowError[]>([]);
  const [alert, setAlert] = useState<{ type: string; message: string }>({
    type: "",
    message: "",
  });
  const [preview, setPreview] = useState<{
    changes: ChangeItem[];
    summary: PreviewSummary;
  } | null>(null);

  const handleFile = (f: File | null) => {
    setFile(f);
    setErrors([]);
    setPreview(null);
    setAlert({ type: "", message: "" });
  };

  const handleSubmit = async () => {
    setAlert({ type: "", message: "" });
    setErrors([]);
    setPreview(null);

    if (!file) {
      setAlert({ type: "error", message: "Pilih file template terlebih dahulu" });
      return;
    }

    setUploading(true);
    setProgress(0);
    setStage("Mengunggah file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        mode === "update" ? "/api/kamus/preview" : "/api/kamus/upload";

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);

      // Track upload progress (file → server)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          // Upload itself occupies 0–50% of progress
          const pct = Math.round((e.loaded / e.total) * 50);
          setProgress(pct);
        }
      };

      xhr.upload.onload = () => {
        setProgress(60);
        setStage("Memvalidasi & memproses data...");
      };

      const responseText: string = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          setProgress(95);
          resolve(xhr.responseText);
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      const status = xhr.status;
      const data = JSON.parse(responseText);
      setProgress(100);
      setStage("Selesai");

      if (status >= 400) {
        if (Array.isArray(data.errors)) {
          setErrors(data.errors as RowError[]);
        }
        setAlert({
          type: "error",
          message: data.error || "Validasi gagal",
        });
        return;
      }

      if (mode === "update") {
        setPreview(data);
        if (data.changes.length === 0) {
          setAlert({
            type: "info",
            message: "Tidak ada perubahan terdeteksi dari file ini.",
          });
        }
      } else {
        setAlert({
          type: "success",
          message: `Berhasil mengupload ${data.count} item kamus. Event 'KamusSubmitted' di-generate.`,
        });
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Upload gagal",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!preview) return;
    setAlert({ type: "", message: "" });
    setUploading(true);
    setProgress(70);
    setStage("Menerapkan perubahan...");

    try {
      const res = await fetch("/api/kamus/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: preview.changes }),
      });
      const data = await res.json();
      setProgress(100);
      setStage("Selesai");

      if (!res.ok) {
        setAlert({
          type: "error",
          message: data.error || "Gagal menerapkan perubahan",
        });
        return;
      }

      setAlert({
        type: "success",
        message: `Perubahan diterapkan: ${data.created.length} baru, ${data.updated.length} di-update, ${data.deleted.length} dihapus. Event 'KamusSubmitted' di-generate.`,
      });
      setPreview(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setTimeout(() => router.push("/admin/kamus"), 1500);
    } catch (err) {
      console.error(err);
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menerapkan perubahan",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2">
            <Link href="/admin/kamus">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Kamus
            </Link>
          </Button>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="kamus-upload-page-nav"
          >
            Upload Kamus Template
          </h2>
          <p className="text-muted-foreground">
            Unggah file template (.xlsx, .xls, .csv) untuk menambah atau memperbarui kamus.
          </p>
        </div>
        <Button
          variant="outline"
          data-testid="download-template-btn"
          onClick={() => {
            window.location.href = "/api/kamus/template";
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Empty Template
        </Button>
      </div>
      <Separator />

      <Card data-testid="kamus-upload-form">
        <CardHeader>
          <CardTitle className="text-lg">Pilih File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Mode</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "create" ? "default" : "outline"}
                size="sm"
                data-testid="mode-create-btn"
                onClick={() => setMode("create")}
              >
                Tambah Baru
              </Button>
              <Button
                type="button"
                variant={mode === "update" ? "default" : "outline"}
                size="sm"
                data-testid="mode-update-btn"
                onClick={() => setMode("update")}
              >
                Update (Preview)
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mode === "create"
                ? "Sistem akan menambahkan baris baru. Kode duplikat akan ditolak."
                : "Sistem akan membandingkan file dengan kamus saat ini dan menampilkan preview perubahan."}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">File Template</label>
            <input
              ref={inputRef}
              data-testid="kamus-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
            />
            {file && (
              <p
                data-testid="selected-file-name"
                className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <Button
            type="button"
            data-testid="submit-kamus-btn"
            disabled={uploading || !file}
            onClick={handleSubmit}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Memproses..." : mode === "update" ? "Preview Perubahan" : "Upload Kamus"}
          </Button>
        </CardContent>
      </Card>

      {uploading && (
        <Card data-testid="upload-progress-container">
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span data-testid="upload-progress-stage">{stage}</span>
              <span data-testid="upload-progress-value">{progress}%</span>
            </div>
            <Progress value={progress} data-testid="upload-progress-bar" />
          </CardContent>
        </Card>
      )}

      {alert.message && (
        <div
          data-testid={
            alert.type === "success"
              ? "kamus-created-alert"
              : alert.type === "info"
              ? "kamus-info-alert"
              : "kamus-error-alert"
          }
          className={`rounded-md border p-4 text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : alert.type === "info"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {alert.message}
        </div>
      )}

      {errors.length > 0 && (
        <Card data-testid="kamus-errors-container">
          <CardHeader>
            <CardTitle className="text-base text-red-700">
              {errors.length} baris bermasalah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul
              data-testid="kamus-errors-list"
              className="space-y-1 text-sm"
            >
              {errors.map((err, idx) => (
                <li
                  key={idx}
                  data-testid={`kamus-error-row-${err.row}`}
                  className="rounded border border-red-100 bg-red-50 px-3 py-2"
                >
                  <span className="font-semibold">Baris {err.row}:</span>{" "}
                  <span className="font-mono text-xs">[{err.field}]</span>{" "}
                  {err.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {preview && preview.changes.length > 0 && (
        <Card data-testid="kamus-preview-container">
          <CardHeader>
            <CardTitle className="text-base">Preview Perubahan</CardTitle>
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              <Badge variant="default" data-testid="preview-summary-new">
                Baru: {preview.summary.new}
              </Badge>
              <Badge variant="secondary" data-testid="preview-summary-updated">
                Diubah: {preview.summary.updated}
              </Badge>
              <Badge variant="destructive" data-testid="preview-summary-deleted">
                Dihapus: {preview.summary.deleted}
              </Badge>
              <Badge variant="outline" data-testid="preview-summary-unchanged">
                Tidak berubah: {preview.summary.unchanged}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul data-testid="kamus-preview-list" className="space-y-2 text-sm">
              {preview.changes.map((c) => (
                <li
                  key={c.code}
                  data-testid={`preview-change-${c.code}`}
                  className="rounded border bg-muted/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        c.status === "new"
                          ? "default"
                          : c.status === "deleted"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {c.status}
                    </Badge>
                    <span className="font-mono text-xs">{c.code}</span>
                    <span className="font-medium">{c.data.name}</span>
                  </div>
                  {c.changes && (
                    <ul className="ml-4 mt-1 list-disc text-xs text-muted-foreground">
                      {Object.entries(c.changes).map(([field, v]) => (
                        <li key={field}>
                          <span className="font-medium">{field}: </span>
                          <span className="line-through">{v.old}</span>{" "}
                          → <span>{v.new}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                data-testid="confirm-preview-btn"
                disabled={uploading}
                onClick={handleConfirmPreview}
              >
                Konfirmasi Perubahan
              </Button>
              <Button
                variant="outline"
                data-testid="cancel-preview-btn"
                onClick={() => setPreview(null)}
                disabled={uploading}
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
