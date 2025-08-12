import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Espaço = {
  id: string;
  nome: string;
};

type MoradorOpt = { id: string; nome: string; unidade: string };

interface NewReservationDialogProps {
  condominioId: string;
  espacos: Espaço[];
  onCreated?: () => void;
}

export function NewReservationDialog({ condominioId, espacos, onCreated }: NewReservationDialogProps) {
  const [open, setOpen] = useState(false);
  const [espacoId, setEspacoId] = useState<string>("");
  const [moradorId, setMoradorId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>();
  const [observacoes, setObservacoes] = useState("");
  const [moradores, setMoradores] = useState<MoradorOpt[]>([]);
  const [loadingMoradores, setLoadingMoradores] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingMoradores(true);
      try {
        const { data, error } = await supabase
          .from("moradores")
          .select("id, nome, unidade, status, permissoes")
          .eq("condominio_id", condominioId)
          .eq("status", "ativo");
        if (error) throw error;
        const opts = (data || []).filter((m: any) => !!m?.permissoes?.podeReservar).map((m: any) => ({ id: m.id, nome: m.nome, unidade: m.unidade }));
        setMoradores(opts);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Erro ao carregar moradores", description: e.message });
      } finally {
        setLoadingMoradores(false);
      }
    })();
  }, [open, condominioId]);

  const isValid = espacoId && moradorId && date;

  const resetForm = () => {
    setEspacoId(espacos[0]?.id || "");
    setMoradorId("");
    setDate(undefined);
    setObservacoes("");
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setEspacoId(espacos[0]?.id || "");
    } else {
      resetForm();
    }
  };

  const save = async () => {
    if (!isValid || !date) return;
    setSaving(true);
    try {
      const yyyyMmDd = date.toISOString().slice(0, 10);
      // conflict check
      const { data: existing, error: existingErr } = await supabase
        .from("reservas")
        .select("id, status")
        .eq("espaco_id", espacoId)
        .eq("data_reserva", yyyyMmDd)
        .neq("status", "cancelada");
      if (existingErr) throw existingErr;
      if ((existing || []).length > 0) {
        toast({ title: "Data indisponível", description: "Já existe uma reserva para este espaço nesta data." });
        return;
      }

      const { error } = await supabase.from("reservas").insert({
        espaco_id: espacoId,
        morador_id: moradorId,
        data_reserva: yyyyMmDd as any,
        status: "pendente",
        observacoes: observacoes || null,
      } as any);
      if (error) throw error;
      toast({ title: "Reserva criada", description: "A reserva foi registrada como pendente." });
      setOpen(false);
      onCreated?.();
      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Novo agendamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova reserva</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Espaço</Label>
            <Select value={espacoId} onValueChange={setEspacoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um espaço" />
              </SelectTrigger>
              <SelectContent>
                {espacos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Morador</Label>
            <Select value={moradorId} onValueChange={setMoradorId} disabled={loadingMoradores}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingMoradores ? "Carregando..." : "Selecione o morador"} />
              </SelectTrigger>
              <SelectContent>
                {moradores.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} – Unidade {m.unidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !date && "text-muted-foreground") }>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? date.toLocaleDateString() : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!isValid || saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
