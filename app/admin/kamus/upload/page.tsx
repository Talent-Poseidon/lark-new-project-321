"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  X,
  RefreshCw,
} from "lucide-react";

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

interface PreviewResponse {
  changes: ChangeItem[];
  summary: {
    new: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
}

export default function KamusUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSuccessMessage("");
    setErrorMessage("");
    setRowErrors([]);
    setPreview(null);
    setShowPreview(false);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    resetState();
  };

  const handleDownloadTemplate = async () => {
    const res = await fetch("/api/kamus/template");
    if (!res.ok) {
      setErrorMessage("Gagal mengunduh template");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kamus-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const simulateProgress = () => {
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    return interval;
  };

  const handleUpload = async () => {
    if (!file) return;
    resetState();
    setUploading(true);

    const progressInterval = simulateProgress();

    try {
      // First check if kamus already exists for update flow
      const checkRes = await fetch("/api/kamus");
      const existingItems = await checkRes.json();
      const hasExistingData = Array.isArray(existingItems) && existingItems.length > 0;

      if (hasExistingData) {
        // Preview changes for update
        const formData = new FormData();
        formData.append("file", file);

        const previewRes = await fetch("/api/kamus/preview", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        const previewData = await previewRes.json();

        if (!previewRes.ok) {
          setErrorMessage(previewData.error || "Gagal memproses file");
          if (previewData.errors) setRowErrors(previewData.errors);
          setUploading(false);
          return;
        }

        setPreview(previewData);
        setShowPreview(true);
        setUploading(false);
        return;
      }

      // Fresh upload
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/kamus/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal mengupload kamus");
        if (data.errors) setRowErrors(data.errors);
      } else {
        setSuccessMessage(data.message || `Berhasil mengupload ${data.count} item kamus`);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch {
      setErrorMessage("Terjadi kesalahan saat mengupload file");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!file) return;
    setConfirming(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/kamus/update", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal mengupdate kamus");
        if (data.errors) setRowErrors(data.errors);
      } else {
        setSuccessMessage(data.message || `Berhasil mengupdate ${data.count} item kamus`);
        setFile(null);
        setShowPreview(false);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch {
      setErrorMessage("Terjadi kesalahan saat mengupdate kamus");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/kamus">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <div>
            <h2
              className="text-3xl font-bold tracking-tight"
              data-testid="kamus-upload-page-nav"
            >
              Upload Kamus
            </h2>
            <p className="text-muted-foreground">
              Upload template kamus potensi dan kompetensi
            </p>
          </div>
        </div>
      </div>
      <Separator />

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5" />
            Template Kamus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download template kosong untuk panduan format upload. Template berisi
            kolom: kode, nama, tipe (potensi/kompetensi), deskripsi, dan
            indikator perilaku.
          </p>
          <Button
            variant="outline"
            data-testid="kamus-download-template-btn"
            onClick={handleDownloadTemplate}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Upload File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div data-testid="kamus-upload-form" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                data-testid="kamus-file-input"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    resetState();
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            <Button
              data-testid="kamus-upload-btn"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>

          {/* Progress indicator */}
          {uploading && (
            <div className="space-y-2" data-testid="kamus-upload-progress">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground">
                Memproses file... {uploadProgress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {successMessage && (
        <Alert data-testid="kamus-created-alert">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Berhasil</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="kamus-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Row-level Errors */}
      {rowErrors.length > 0 && (
        <Card data-testid="kamus-row-errors">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">
              Detail Error ({rowErrors.length} masalah ditemukan)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Baris</TableHead>
                  <TableHead>Kolom</TableHead>
                  <TableHead>Pesan Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowErrors.map((err: RowError, idx: number) => (
                  <TableRow key={idx} data-testid={`kamus-error-row-${idx}`}>
                    <TableCell>{err.row}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{err.field}</Badge>
                    </TableCell>
                    <TableCell className="text-destructive">
                      {err.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Preview Changes (Update flow) */}
      {showPreview && preview && (
        <Card data-testid="kamus-preview">
          <CardHeader>
            <CardTitle className="text-lg">Preview Perubahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="default">{preview.summary.new} baru</Badge>
              <Badge variant="secondary">
                {preview.summary.updated} diupdate
              </Badge>
              <Badge variant="destructive">
                {preview.summary.deleted} dihapus
              </Badge>
              <Badge variant="outline">
                {preview.summary.unchanged} tidak berubah
              </Badge>
            </div>

            {preview.changes.length > 0 && (
              <Table data-testid="kamus-preview-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Perubahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.changes.map((change: ChangeItem, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Badge
                          variant={
                            change.status === "new"
                              ? "default"
                              : change.status === "updated"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {change.status === "new"
                            ? "Baru"
                            : change.status === "updated"
                            ? "Update"
                            : "Hapus"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {change.code}
                      </TableCell>
                      <TableCell>{change.data.name}</TableCell>
                      <TableCell>{change.data.type}</TableCell>
                      <TableCell className="text-sm">
                        {change.changes &&
                          Object.entries(change.changes).map(
                            ([field, vals]) => (
                              <div key={field}>
                                <span className="font-medium">{field}:</span>{" "}
                                <span className="text-destructive line-through">
                                  {vals.old}
                                </span>{" "}
                                → <span className="text-green-600">{vals.new}</span>
                              </div>
                            )
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center gap-2">
              <Button
                data-testid="kamus-confirm-update-btn"
                onClick={handleConfirmUpdate}
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Mengkonfirmasi...
                  </>
                ) : (
                  "Konfirmasi Update"
                )}
              </Button>
              <Button
                variant="outline"
                data-testid="kamus-cancel-update-btn"
                onClick={() => {
                  setShowPreview(false);
                  setPreview(null);
                }}
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
