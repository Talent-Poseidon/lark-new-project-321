"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
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
  kamus: KamusItem;
}

interface ScenarioItem {
  id: string;
  name: string;
  type: string;
  description: string;
  duration: number;
  instructions: string;
  createdAt: string;
  kompetensi: KompetensiMapping[];
}

const SCENARIO_TYPES = [
  { value: "simulasi", label: "Simulasi" },
  { value: "wawancara", label: "Wawancara" },
  { value: "tes_tertulis", label: "Tes Tertulis" },
  { value: "role_play", label: "Role Play" },
  { value: "in_tray", label: "In-Tray" },
  { value: "other", label: "Lainnya" },
];

export default function ScenarioPage() {
  const [items, setItems] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [kamusList, setKamusList] = useState<KamusItem[]>([]);
  const [kamusReady, setKamusReady] = useState<boolean>(true);

  // Form state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formDuration, setFormDuration] = useState<string>("");
  const [formInstructions, setFormInstructions] = useState<string>("");
  const [selectedKompetensi, setSelectedKompetensi] = useState<{ kamusId: string }[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string>("");

  const fetchItems = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);

    fetch(`/api/scenario?${params.toString()}`)
      .then((res) => res.json())
      .then((data: ScenarioItem[]) => {
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
    setSelectedKompetensi((prev) => [...prev, { kamusId }]);
  };

  const handleRemoveKompetensi = (kamusId: string) => {
    setSelectedKompetensi((prev) => prev.filter((k) => k.kamusId !== kamusId));
  };

  const resetForm = () => {
    setFormName("");
    setFormType("");
    setFormDescription("");
    setFormDuration("");
    setFormInstructions("");
    setSelectedKompetensi([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          type: formType,
          description: formDescription,
          duration: Number(formDuration),
          instructions: formInstructions,
          kompetensi: selectedKompetensi,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Gagal membuat scenario");
        setSubmitting(false);
        return;
      }

      setSuccessMessage(`Scenario '${data.name}' berhasil dibuat`);
      setItems((prev) => [data, ...prev]);
      resetForm();
      setDialogOpen(false);
    } catch {
      setErrorMessage("Terjadi kesalahan saat membuat scenario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteError("");
    setSuccessMessage("");

    const res = await fetch(`/api/scenario/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setDeleteError(data.error || "Gagal menghapus scenario");
      return;
    }

    setSuccessMessage("Scenario berhasil dihapus");
    setItems((prev) => prev.filter((item: ScenarioItem) => item.id !== id));
  };

  // AC-24: If no kamus submitted, show message
  if (!kamusReady && !loading) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight" data-testid="scenario-page-nav">
          Scenario Assessment
        </h2>
        <Separator />
        <Alert data-testid="scenario-no-kamus-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kamus Belum Tersedia</AlertTitle>
          <AlertDescription>
            Lakukan Setup Kamus terlebih dahulu sebelum membuat Scenario Assessment.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight" data-testid="scenario-page-nav">
            Scenario Assessment
          </h2>
          <p className="text-muted-foreground">Kelola skenario dan instrumen assessment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-scenario-btn">
              <Plus className="mr-2 h-4 w-4" />
              Buat Scenario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Scenario Assessment Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} data-testid="scenario-form" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Scenario</label>
                <Input
                  data-testid="scenario-name-input"
                  name="name"
                  placeholder="Contoh: Simulasi Presentasi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipe Scenario</label>
                <Select value={formType} onValueChange={(val: string) => setFormType(val)}>
                  <SelectTrigger data-testid="scenario-type-input">
                    <SelectValue placeholder="Pilih tipe scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Durasi (menit)</label>
                <Input
                  data-testid="scenario-duration-input"
                  name="duration"
                  type="number"
                  min="1"
                  placeholder="60"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi</label>
                <textarea
                  data-testid="scenario-description-input"
                  name="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Deskripsi scenario..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instruksi Pelaksanaan</label>
                <textarea
                  data-testid="scenario-instructions-input"
                  name="instructions"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Instruksi pelaksanaan scenario..."
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  required
                />
              </div>

              {/* Kompetensi selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Kompetensi/Potensi yang Diukur</label>
                <p className="text-xs text-muted-foreground">
                  Pilih minimal 1 kompetensi dari kamus yang akan diukur melalui scenario ini
                </p>

                {selectedKompetensi.length > 0 && (
                  <div className="space-y-2" data-testid="scenario-kompetensi-list">
                    {selectedKompetensi.map((sk) => {
                      const kamus = kamusList.find((k) => k.id === sk.kamusId);
                      return (
                        <div key={sk.kamusId} className="flex items-center gap-2 rounded-md border p-2">
                          <Badge variant={kamus?.type === "kompetensi" ? "default" : "secondary"}>
                            {kamus?.type}
                          </Badge>
                          <span className="flex-1 text-sm">{kamus?.name} ({kamus?.code})</span>
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
                          data-testid={`scenario-add-kamus-${k.id}`}
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
                data-testid="submit-scenario-btn"
                disabled={submitting || selectedKompetensi.length === 0 || !formType}
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
            data-testid="scenario-search-input"
            placeholder="Cari berdasarkan nama scenario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={(val: string) => setTypeFilter(val)}>
          <SelectTrigger className="w-[200px]" data-testid="scenario-type-filter">
            <SelectValue placeholder="Filter tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {SCENARIO_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="scenario-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      {deleteError && (
        <Alert variant="destructive" data-testid="scenario-delete-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert data-testid="scenario-created-alert">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* List */}
      <div data-testid="scenario-list-container">
        {loading ? (
          <p data-testid="scenario-list-loading">Loading scenario...</p>
        ) : items.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table data-testid="scenario-list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Scenario</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Kompetensi</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: ScenarioItem) => (
                    <TableRow key={item.id} data-testid={`scenario-item-${item.id}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SCENARIO_TYPES.find((t) => t.value === item.type)?.label || item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.duration} menit
                        </div>
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
                          data-testid={`scenario-delete-btn-${item.id}`}
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
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p data-testid="scenario-list-empty" className="text-muted-foreground">
                Belum ada scenario assessment. Buat scenario pertama Anda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
