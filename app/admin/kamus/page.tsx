"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Search,
  BookOpen,
  Trash2,
  AlertCircle,
} from "lucide-react";

interface KamusItem {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
  createdAt: string;
}

export default function KamusPage() {
  const [items, setItems] = useState<KamusItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteError, setDeleteError] = useState<string>("");
  const [deleteSuccess, setDeleteSuccess] = useState<string>("");

  const fetchItems = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);

    fetch(`/api/kamus?${params.toString()}`)
      .then((res) => res.json())
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

  const handleDelete = async (id: string) => {
    setDeleteError("");
    setDeleteSuccess("");

    const res = await fetch(`/api/kamus/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setDeleteError(data.error || "Gagal menghapus kamus");
      return;
    }

    setDeleteSuccess("Kamus berhasil dihapus");
    setItems((prev) => prev.filter((item: KamusItem) => item.id !== id));
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="kamus-page-nav"
          >
            Kamus Potensi & Kompetensi
          </h2>
          <p className="text-muted-foreground">
            Kelola data kamus potensi dan kompetensi
          </p>
        </div>
        <Button asChild data-testid="kamus-upload-btn">
          <Link href="/admin/kamus/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Kamus
          </Link>
        </Button>
      </div>
      <Separator />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="kamus-search-input"
            placeholder="Cari berdasarkan nama atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(val: string) => setTypeFilter(val)}
        >
          <SelectTrigger className="w-[200px]" data-testid="kamus-type-filter">
            <SelectValue placeholder="Filter tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="potensi">Potensi</SelectItem>
            <SelectItem value="kompetensi">Kompetensi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {deleteError && (
        <Alert variant="destructive" data-testid="kamus-delete-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}
      {deleteSuccess && (
        <Alert data-testid="kamus-deleted-alert">
          <AlertDescription>{deleteSuccess}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      <div data-testid="kamus-list-container">
        {loading ? (
          <p data-testid="kamus-list-loading">Loading kamus...</p>
        ) : items.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table data-testid="kamus-list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Indikator Perilaku</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: KamusItem) => (
                    <TableRow
                      key={item.id}
                      data-testid={`kamus-item-${item.id}`}
                    >
                      <TableCell className="font-mono text-sm">
                        {item.code}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.type === "kompetensi"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.behavioralIndicators}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`kamus-delete-btn-${item.id}`}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <p
                data-testid="kamus-list-empty"
                className="text-muted-foreground"
              >
                Belum ada data kamus. Upload template untuk memulai.
              </p>
              <Button asChild className="mt-4">
                <Link href="/admin/kamus/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Kamus
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
