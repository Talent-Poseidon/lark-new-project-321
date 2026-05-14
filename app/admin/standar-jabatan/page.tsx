"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  ClipboardList,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface KamusItem {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface KompetensiMapping {
  id: string;
  kamusId: string;
  expectedLevel: number;
  kamus: KamusItem;
}

interface StandarJabatanItem {
  id: string;
  name: string;
  level: string;
  description: string;
  createdAt: string;
  kompetensi: KompetensiMapping[];
}

export default function StandarJabatanPage() {
  const [items, setItems] = useState<StandarJabatanItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [kamusList, setKamusList] = useState<KamusItem[]>([]);
  const [kamusReady, setKamusReady] = useState<boolean>(true);

  // Form state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>("");
  const [formLevel, setFormLevel] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [selectedKompetensi, setSelectedKompetensi] = useState<
    { kamusId: string; expectedLevel: number }[]
  >([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string>("");

  const fetchItems = useCallback(() => {
    const params = new URLSearchParams();
    if (levelFilter && levelFilter !== "all") params.set("level", levelFilter);
    if (search) params.set("search", search);

    fetch(`/api/standar-jabatan?${params.toString()}`)
      .then((res) => res.json())
      .then((data: StandarJabatanItem[]) => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error(err);
        setLoading(false);
      });
  }, [levelFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetch("/api/kamus")
      .then((res) => res.json())
      .then((data: KamusItem[]) => {
        if (Array.isArray(data)) {
          setKamusList(data);
          setKamusReady(data.length > 0);
        } else {
          setKamusReady(false);
        }
      })
      .catch(() => setKamusReady(false));
  }, []);

  const handleAddKompetensi = (kamusId: string) => {
    if (selectedKompetensi.find((k) => k.kamusId === kamusId)) return;
    setSelectedKompetensi((prev) => [...prev, { kamusId, expectedLevel: 3 }]);
  };

  const handleRemoveKompetensi = (kamusId: string) => {
    setSelectedKompetensi((prev) => prev.filter((k) => k.kamusId !== kamusId));
  };

  const handleLevelChange = (kamusId: string, level: number) => {
    setSelectedKompetensi((prev) =>
      prev.map((k) => (k.kamusId === kamusId ? { ...k, expectedLevel: level } : k))
    );
  };

  const resetForm = () => {
    setFormName("");
    setFormLevel("");
    setFormDescription("");
    setSelectedKompetensi([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/standar-jabatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          level: formLevel,
          description: formDescription,
          kompetensi: selectedKompetensi,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Gagal membuat standar jabatan");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Standar jabatan '${data.name}' berhasil dibuat`);
      setItems((prev) => [data, ...prev]);
      resetForm();
      setDialogOpen(false);
    } catch {
      setErrorMessage("Terjadi kesalahan saat membuat standar jabatan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError("");
    setSuccessMessage("");

    const res = await fetch(`/api/standar-jabatan/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setDeleteError(data.error || "Gagal menghapus standar jabatan");
      return;
    }

    setSuccessMessage("Standar jabatan berhasil dihapus");
    setItems((prev) => prev.filter((item: StandarJabatanItem) => item.id !== id));
  };

  const levels = [...new Set(items.map((i) => i.level))];

  // AC-14: If no kamus submitted, show message
  if (!kamusReady && !loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight" data-testid="standar-page-nav">
          Standar Jabatan
        </h2>
        <Separator />
        <Alert data-testid="standar-no-kamus-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kamus Belum Tersedia</AlertTitle>
          <AlertDescription>
            Lakukan Setup Kamus terlebih dahulu sebelum membuat Standar Jabatan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="standar-page-nav">
            Standar Jabatan
          </h2>
          <p className="text-muted-foreground">Kelola standar kompetensi jabatan</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-standar-btn">
              <Plus className="mr-2 h-4 w-4" />
              Buat Standar Jabatan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Standar Jabatan Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} data-testid="standar-form" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Jabatan</label>
                <Input
                  data-testid="standar-name-input"
                  name="name"
                  placeholder="Contoh: Manager IT"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Level/Grade</label>
                <Input
                  data-testid="standar-level-input"
                  name="level"
                  placeholder="Contoh: Senior, Junior, Manager"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  data-testid="standar-description-input"
                  name="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Deskripsi jabatan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              {/* Kompetensi selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Kompetensi/Potensi</label>
                <p className="text-xs text-muted-foreground">
                  Pilih minimal 1 kompetensi dari kamus dan tentukan level yang diharapkan (1-5)
                </p>

                {/* Selected items */}
                {selectedKompetensi.length > 0 && (
                  <div className="space-y-2" data-testid="standar-kompetensi-list">
                    {selectedKompetensi.map((sk) => {
                      const kamus = kamusList.find((k) => k.id === sk.kamusId);
                      return (
                        <div key={sk.kamusId} className="flex items-center gap-2 rounded-md border p-2">
                          <Badge variant={kamus?.type === "kompetensi" ? "default" : "secondary"}>
                            {kamus?.type}
                          </Badge>
                          <span className="flex-1 text-sm">{kamus?.name} ({kamus?.code})</span>
                          <Select
                            value={String(sk.expectedLevel)}
                            onValueChange={(val: string) =>
                              handleLevelChange(sk.kamusId, Number(val))
                            }
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <SelectItem key={lvl} value={String(lvl)}>
                                  Level {lvl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveKompetensi(sk.kamusId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add kompetensi */}
                <div className="rounded-md border p-2">
                  <p className="mb-2 text-xs text-muted-foreground">Klik untuk menambahkan:</p>
                  <div className="flex flex-wrap gap-1">
                    {kamusList
                      .filter((k) => !selectedKompetensi.find((sk) => sk.kamusId === k.id))
                      .map((k) => (
                        <Button
                          key={k.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid={`standar-add-kamus-${k.id}`}
                          onClick={() => handleAddKompetensi(k.id)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {k.name}
                        </Button>
                      ))}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="submit-standar-btn"
                disabled={submitting || selectedKompetensi.length === 0}
              >
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Separator />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="standar-search-input"
            placeholder="Cari berdasarkan nama jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={levelFilter} onValueChange={(val: string) => setLevelFilter(val)}>
          <SelectTrigger className="w-[200px]" data-testid="standar-level-filter">
            <SelectValue placeholder="Filter level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Level</SelectItem>
            {levels.map((lvl) => (
              <SelectItem key={lvl} value={lvl}>
                {lvl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="standar-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {deleteError && (
        <Alert variant="destructive" data-testid="standar-delete-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert data-testid="standar-created-alert">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      <div data-testid="standar-list-container">
        {loading ? (
          <p data-testid="standar-list-loading">Loading standar jabatan...</p>
        ) : items.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table data-testid="standar-list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jabatan</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah Kompetensi</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: StandarJabatanItem) => (
                    <TableRow key={item.id} data-testid={`standar-item-${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.level}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.description}
                      </TableCell>
                      <TableCell>
                        <Badge>{item.kompetensi.length} kompetensi</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`standar-delete-btn-${item.id}`}
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
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <p data-testid="standar-list-empty" className="text-muted-foreground">
                Belum ada standar jabatan. Buat standar jabatan pertama Anda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
