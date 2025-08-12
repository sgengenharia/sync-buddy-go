
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type EspacoFormData = {
  id?: string;
  nome: string;
  descricao: string | null;
  capacidade: number;
  valor_diaria: number;
  status: "ativo" | "inativo" | string;
  condominio_id?: string;
};

interface EspacoFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  condominioId: string;
  initialData?: EspacoFormData;
  onSaved?: (espacoId?: string) => void;
}

export function EspacoFormDialog({ open, onOpenChange, condominioId, initialData, onSaved }: EspacoFormDialogProps) {
  const isEdit = !!initialData?.id;

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState<string>("");
  const [capacidade, setCapacidade] = useState<number>(0);
  const [valorDiaria, setValorDiaria] = useState<number>(0);
  const [habilitado, setHabilitado] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setNome(initialData.nome || "");
      setDescricao(initialData.descricao || "");
      setCapacidade(Number(initialData.capacidade || 0));
      setValorDiaria(Number(initialData.valor_diaria || 0));
      setHabilitado(initialData.status === "ativo");
    } else {
      setNome("");
      setDescricao("");
      setCapacidade(0);
      setValorDiaria(0);
      setHabilitado(true);
    }
  }, [open, initialData]);

  const canSave = nome.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      capacidade: Number.isFinite(capacidade) ? capacidade : 0,
      valor_diaria: Number.isFinite(valorDiaria) ? valorDiaria : 0,
      status: habilitado ? "ativo" : "inativo",
      ...(isEdit ? {} : { condominio_id: condominioId }),
    } as any;

    try {
      if (isEdit && initialData?.id) {
        const { error } = await supabase.from("espacos").update(payload).eq("id", initialData.id);
        if (error) throw error;
        toast({ title: "Espaço atualizado" });
        onSaved?.(initialData.id);
      } else {
        const { data, error } = await supabase.from("espacos").insert(payload).select("id").single();
        if (error) throw error;
        toast({ title: "Espaço criado" });
        onSaved?.(data?.id);
      }
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao salvar espaço", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar espaço" : "Novo espaço"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Salão de Festas" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Capacidade</Label>
              <Input
                type="number"
                min={0}
                value={Number.isFinite(capacidade) ? capacidade : 0}
                onChange={(e) => setCapacidade(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço/dia</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={Number.isFinite(valorDiaria) ? valorDiaria : 0}
                onChange={(e) => setValorDiaria(parseFloat(e.target.value || "0"))}
              />
            </div>
            <div className="space-y-2 flex items-center gap-3">
              <div className="flex items-center gap-3 mt-6">
                <Switch checked={habilitado} onCheckedChange={setHabilitado} />
                <Label>Habilitado</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Detalhes do espaço, regras, etc." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EspacoFormDialog;
