"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, BookOpen, Trash2, Search } from "lucide-react";

interface KamusItem {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
  createdAt: string;
  updatedAt: string;
}

export default function KamusPage() {
  const [items, setItems] = useState<KamusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [alert, setAlert] = useState<{ type: string; message: string }>({
    type: "",
    message: "",
  });

  const fetchItems = React.useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/kamus?${params.toString()}`)
      .then((r) => r.json())
      .then((data: KamusItem[]) => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error(err);
        setLoading(false);
      });
  }, [typeFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string, code: string) => {
    setAlert({ type: "", message: "" });
    if (!confirm(`Hapus kamus '${code}'?`)) return;

    const res = await fetch(`/api/kamus/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setAlert({ type: "error", message: data.error || "Gagal menghapus kamus" });
      return;
    }
    setAlert({ type: "success", message: "Kamus berhasil dihapus" });
    fetchItems();
  };

  const handleDownloadTemplate = () => {
    window.location.href = "/api/kamus/template";
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="kamus-page-nav"
          >
            Kamus Potensi &amp; Kompetensi
          </h2>
          <p className="text-muted-foreground">
            Kelola katalog potensi dan kompetensi assessment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            data-testid="download-template-btn"
            onClick={handleDownloadTemplate}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button asChild data-testid="upload-kamus-btn">
            <Link href="/admin/kamus/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Template
            </Link>
          </Button>
        </div>
      </div>
      <Separator />

      {alert.message && (
        <div
          data-testid={
            alert.type === "success"
              ? "kamus-deleted-alert"
              : "kamus-error-alert"
          }
          className={`rounded-md border p-3 text-sm ${
            alert.type === "success"
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {alert.message}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="kamus-search-input"
            placeholder="Cari berdasarkan nama atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-56" data-testid="kamus-type-filter">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="kamus-type-filter-all">
              Semua Tipe
            </SelectItem>
            <SelectItem value="kompetensi" data-testid="kamus-type-filter-kompetensi">
              Kompetensi
            </SelectItem>
            <SelectItem value="potensi" data-testid="kamus-type-filter-potensi">
              Potensi
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div data-testid="kamus-list-container">
        {loading ? (
          <p data-testid="kamus-list-loading">Loading kamus...</p>
        ) : items.length > 0 ? (
          <div className="grid gap-3" data-testid="kamus-list">
            {items.map((item) => (
              <Card key={item.id} data-testid={`kamus-item-${item.id}`}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={item.type === "kompetensi" ? "default" : "secondary"}
                        data-testid={`kamus-item-${item.id}-type`}
                      >
                        {item.type}
                      </Badge>
                      <span
                        className="font-mono text-sm text-muted-foreground"
                        data-testid={`kamus-item-${item.id}-code`}
                      >
                        {item.code}
                      </span>
                    </div>
                    <h3
                      className="text-lg font-semibold"
                      data-testid={`kamus-item-${item.id}-name`}
                    >
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Indikator: </span>
                      {item.behavioralIndicators}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`delete-kamus-${item.id}-btn`}
                    onClick={() => handleDelete(item.id, item.code)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p
                data-testid="kamus-list-empty"
                className="text-muted-foreground"
              >
                Belum ada kamus yang di-submit. Upload template untuk memulai.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/kamus/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Template
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
