import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { NewReservationDialog } from "./NewReservationDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EspacoFormDialog, { EspacoFormData } from "./EspacoFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ReservasModuleProps { condominioId: string }

type Espaco = {
  id: string;
  nome: string;
  status: string;
  descricao?: string | null;
  valor_diaria?: number | null;
  capacidade?: number | null;
};

type ReservaRow = {
  id: string;
  data_reserva: string; // YYYY-MM-DD
  status: string;
  observacoes: string | null;
  moradores?: { nome: string | null; unidade: string | null } | null;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReservasModule({ condominioId }: { condominioId: string }) {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const { data: espacosData } = useQuery({
    queryKey: ["espacos", condominioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("espacos")
        .select("id, nome, status, descricao, valor_diaria, capacidade")
        .eq("condominio_id", condominioId)
        .order("nome");
      if (error) throw error;
      return (data || []) as Espaco[];
    },
    staleTime: 10_000,
  });

  const activeEspacos = useMemo(() => (espacosData || []).filter(e => e.status === "ativo"), [espacosData]);

  const [espacoId, setEspacoId] = useState<string>("");
  useEffect(() => {
    // Define seleção inicial apenas quando ainda não houver um espaço selecionado
    if (!espacoId) {
      const firstActive = activeEspacos[0]?.id;
      const fallback = (espacosData || [])[0]?.id;
      if (firstActive || fallback) {
        setEspacoId(firstActive || fallback);
      }
    }
  }, [espacoId, activeEspacos, espacosData]);

  const selectedEspaco = useMemo(() => (espacosData || []).find(e => e.id === espacoId), [espacoId, espacosData]);

  const monthStart = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), [currentMonth]);
  const monthEnd = useMemo(() => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), [currentMonth]);

  const { data: reservasData, isLoading } = useQuery({
    queryKey: ["reservas", espacoId, ymd(monthStart), ymd(monthEnd)],
    enabled: !!espacoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservas")
        .select("id, data_reserva, status, observacoes, moradores(nome,unidade)")
        .eq("espaco_id", espacoId)
        .gte("data_reserva", ymd(monthStart))
        .lte("data_reserva", ymd(monthEnd))
        .order("data_reserva", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ReservaRow[];
    },
  });

  const reservedDates = useMemo(() => (reservasData || []).filter(r => r.status !== "cancelada").map(r => new Date(`${r.data_reserva}T00:00:00`)), [reservasData]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas").update({ status: "aprovada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Reserva aprovada" });
      await qc.invalidateQueries({ queryKey: ["reservas", espacoId, ymd(monthStart), ymd(monthEnd)] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservas").update({ status: "cancelada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Reserva cancelada" });
      await qc.invalidateQueries({ queryKey: ["reservas", espacoId, ymd(monthStart), ymd(monthEnd)] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message }),
  });

  // Mutations para ações do espaço
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const espaco = (espacosData || []).find(e => e.id === id);
      if (!espaco) throw new Error("Espaço não encontrado");
      const newStatus = espaco.status === "ativo" ? "inativo" : "ativo";
      const { error } = await supabase.from("espacos").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Status do espaço atualizado" });
      await qc.invalidateQueries({ queryKey: ["espacos", condominioId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message }),
  });

  const deleteEspacoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("espacos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Espaço excluído" });
      await qc.invalidateQueries({ queryKey: ["espacos", condominioId] });
      // Se o espaço deletado estava selecionado, limpar seleção
      setEspacoId("");
    },
    onError: (e: any) => toast({ title: "Não foi possível excluir", description: e.message }),
  });

  // Estado do Dialog de Espaço (criar/editar)
  const [espacoDialogOpen, setEspacoDialogOpen] = useState(false);
  const [espacoEditing, setEspacoEditing] = useState<EspacoFormData | undefined>(undefined);

  const openCreateEspaco = () => {
    setEspacoEditing(undefined);
    setEspacoDialogOpen(true);
  };

  const openEditEspaco = () => {
    if (!selectedEspaco) return;
    setEspacoEditing({
      id: selectedEspaco.id,
      nome: selectedEspaco.nome,
      descricao: selectedEspaco.descricao ?? "",
      capacidade: Number(selectedEspaco.capacidade || 0),
      valor_diaria: Number(selectedEspaco.valor_diaria || 0),
      status: (selectedEspaco.status as any) || "ativo",
    });
    setEspacoDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg">Reserva de Espaços</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={espacoId} onValueChange={setEspacoId}>
              <SelectTrigger className="min-w-56">
                <SelectValue placeholder="Selecione o espaço" />
              </SelectTrigger>
              <SelectContent>
                {(espacosData || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome} {e.status !== "ativo" ? "(inativo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditEspaco} disabled={!selectedEspaco}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar espaço
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => selectedEspaco && toggleStatusMutation.mutate(selectedEspaco.id)}
                  disabled={!selectedEspaco}
                >
                  {selectedEspaco?.status === "ativo" ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" /> Desabilitar
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" /> Habilitar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={!selectedEspaco}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir espaço</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Caso existam reservas não canceladas, a exclusão será bloqueada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => selectedEspaco && deleteEspacoMutation.mutate(selectedEspaco.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={openCreateEspaco}>
              <Plus className="h-4 w-4 mr-1" /> Novo espaço
            </Button>

            <NewReservationDialog
              condominioId={condominioId}
              espacos={(activeEspacos || [])}
              onCreated={() => qc.invalidateQueries({ queryKey: ["reservas", espacoId, ymd(monthStart), ymd(monthEnd)] })}
            />
          </div>
        </CardHeader>

        {/* Dialog para criar/editar espaço */}
        <EspacoFormDialog
          open={espacoDialogOpen}
          onOpenChange={setEspacoDialogOpen}
          condominioId={condominioId}
          initialData={espacoEditing}
          onSaved={async (newId) => {
            await qc.invalidateQueries({ queryKey: ["espacos", condominioId] });
            if (newId) setEspacoId(newId);
          }}
        />

        <CardContent className="space-y-6">
          {/* Calendar month view */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={undefined}
            onSelect={() => {}}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{ reserved: reservedDates }}
            modifiersClassNames={{ reserved: "bg-primary/20 rounded-md" }}
          />

          {/* Reservations list */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Morador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-[180px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reservasData || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma reserva neste mês.</TableCell>
                  </TableRow>
                )}
                {(reservasData || []).map((r) => {
                  const mor = r.moradores;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(`${r.data_reserva}T00:00:00`).toLocaleDateString()}</TableCell>
                      <TableCell>{mor?.nome || "-"} {mor?.unidade ? `– Unidade ${mor.unidade}` : ""}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "aprovada" ? "default" : r.status === "cancelada" ? "secondary" : "outline"}>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate" title={r.observacoes || undefined}>{r.observacoes || "-"}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" disabled={r.status !== "pendente"} onClick={() => approveMutation.mutate(r.id)}>Aprovar</Button>
                        <Button size="sm" variant="outline" disabled={r.status === "cancelada"} onClick={() => cancelMutation.mutate(r.id)}>Cancelar</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
