import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Morador } from "./types";
import { Loader2, Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Papa from "papaparse";
import { ImportResidentsDialog } from "./ImportResidentsDialog";
import { normalizeBrPhone } from "@/utils/phone";
interface MoradoresModuleProps {
  condominioId: string;
}

const pageSize = 10;

const moradorSchema = z.object({
  nome: z.string().min(2, "Informe o nome completo"),
  unidade: z.string().min(1, "Informe a unidade"),
  bloco: z.string().optional(),
  telefone: z.string().regex(/^\d{11}$/, "Telefone deve conter 11 dígitos (DDD+Número)"),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  permissoes: z.object({
    podeVotar: z.boolean().default(true),
    recebeMsg: z.boolean().default(true),
    liberaAcesso: z.boolean().default(false),
    podeReservar: z.boolean().default(true),
  }).default({ podeVotar: true, recebeMsg: true, liberaAcesso: false, podeReservar: true }),
});

type MoradorFormValues = z.infer<typeof moradorSchema>;

export function MoradoresModule({ condominioId }: MoradoresModuleProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [page, setPage] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Morador | null>(null);
  const [blocoFilter, setBlocoFilter] = useState("");
  const [reservarFilter, setReservarFilter] = useState<"todos" | "sim" | "nao">("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data, isLoading } = useQuery({
    queryKey: ["moradores", condominioId, search, status, blocoFilter, reservarFilter, page],
    queryFn: async () => {
      let q = supabase
        .from("moradores")
        .select("*", { count: "exact" })
        .eq("condominio_id", condominioId);

      if (status !== "todos") q = q.eq("status", status);
      if (blocoFilter.trim()) q = q.ilike("bloco", `%${blocoFilter.trim()}%`);
      if (reservarFilter !== "todos") {
        q = q.contains("permissoes", { podeReservar: reservarFilter === "sim" } as any);
      }
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`nome.ilike.%${s}%,unidade.ilike.%${s}%,telefone.ilike.%${s}%`);
      }

      q = q.order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { items: (data as Morador[]) || [], count: count || 0 };
    },
    staleTime: 5_000,
  });

  const totalPages = useMemo(() => Math.ceil((data?.count || 0) / pageSize), [data?.count]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<MoradorFormValues>({
    resolver: zodResolver(moradorSchema),
    defaultValues: { status: "ativo", permissoes: { podeVotar: true, recebeMsg: true, liberaAcesso: false, podeReservar: true } },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ nome: "", unidade: "", bloco: "", telefone: "", status: "ativo" });
    setOpenForm(true);
  };

  const openEdit = (m: Morador) => {
    setEditing(m);
    reset({
      nome: m.nome,
      unidade: m.unidade,
      bloco: m.bloco || "",
      telefone: m.telefone,
      status: (m.status as "ativo" | "inativo") || "ativo",
      permissoes: {
        podeVotar: !!(m as any).permissoes?.podeVotar,
        recebeMsg: !!(m as any).permissoes?.recebeMsg,
        liberaAcesso: !!(m as any).permissoes?.liberaAcesso,
        podeReservar: !!(m as any).permissoes?.podeReservar,
      },
    });
    setOpenForm(true);
  };

  const onSubmit = async (values: MoradorFormValues) => {
    try {
      if (editing) {
        const { error } = await supabase
          .from("moradores")
          .update({
            nome: values.nome,
            unidade: values.unidade,
            bloco: values.bloco || null,
            telefone: normalizeBrPhone(values.telefone), // já validado para 11 dígitos
            status: values.status,
            permissoes: values.permissoes as any,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Morador atualizado" });
      } else {
        const { error } = await supabase.from("moradores").insert({
          condominio_id: condominioId,
          nome: values.nome,
          unidade: values.unidade,
          bloco: values.bloco || null,
          telefone: normalizeBrPhone(values.telefone),
          status: values.status,
          permissoes: values.permissoes as any,
        } as any);
        if (error) throw error;
        toast({ title: "Morador cadastrado" });
      }
      setOpenForm(false);
      await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro", description: e.message });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("moradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "Morador removido" });
      await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message }),
  });

  // Helpers for quick permission toggle
  type PermKey = "podeVotar" | "recebeMsg" | "liberaAcesso" | "podeReservar";
  const handleRowPerm = async (m: Morador, key: PermKey, value: boolean) => {
    try {
      const newPerms = { ...((m as any).permissoes || {}), [key]: value } as any;
      const { error } = await supabase.from("moradores").update({ permissoes: newPerms }).eq("id", m.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao atualizar permissões", description: e.message });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Moradores do Condomínio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, unidade ou telefone..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(0); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Bloco"
                className="w-28"
                value={blocoFilter}
                onChange={(e) => { setBlocoFilter(e.target.value); setPage(0); }}
              />
              <Select value={reservarFilter} onValueChange={(v: any) => { setReservarFilter(v); setPage(0); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Pode reservar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Pode reservar: Todos</SelectItem>
                  <SelectItem value="sim">Pode reservar: Sim</SelectItem>
                  <SelectItem value="nao">Pode reservar: Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={openForm} onOpenChange={setOpenForm}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Novo morador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar morador" : "Novo morador"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" {...register("nome")} />
                      {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" placeholder="11988887777" {...register("telefone")} />
                      {errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade</Label>
                      <Input id="unidade" {...register("unidade")} />
                      {errors.unidade && <p className="text-sm text-destructive">{errors.unidade.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bloco">Bloco</Label>
                      <Input id="bloco" {...register("bloco")} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Status</Label>
                      <Select value={watch("status")} onValueChange={(v) => setValue("status", v as any)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Permissões</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">Pode votar</span>
                          <Switch
                            checked={!!watch("permissoes.podeVotar")}
                            onCheckedChange={(v) => setValue("permissoes.podeVotar", Boolean(v))}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">Recebe msg</span>
                          <Switch
                            checked={!!watch("permissoes.recebeMsg")}
                            onCheckedChange={(v) => setValue("permissoes.recebeMsg", Boolean(v))}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">Libera acesso</span>
                          <Switch
                            checked={!!watch("permissoes.liberaAcesso")}
                            onCheckedChange={(v) => setValue("permissoes.liberaAcesso", Boolean(v))}
                          />
                        </div>
                        <div className="flex items-center justify-between rounded-md border px-3 py-2">
                          <span className="text-sm">Pode reservar</span>
                          <Switch
                            checked={!!watch("permissoes.podeReservar")}
                            onCheckedChange={(v) => setValue("permissoes.podeReservar", Boolean(v))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between rounded-md border p-2">
              <div className="text-sm">{selectedIds.length} selecionado(s)</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const { error } = await supabase.from("moradores").update({ status: "ativo" }).in("id", selectedIds);
                    if (error) throw error;
                    toast({ title: "Moradores ativados" });
                    setSelectedIds([]);
                    await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: "Erro", description: e.message });
                  }
                }}>Ativar</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const { error } = await supabase.from("moradores").update({ status: "inativo" }).in("id", selectedIds);
                    if (error) throw error;
                    toast({ title: "Moradores inativados" });
                    setSelectedIds([]);
                    await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: "Erro", description: e.message });
                  }
                }}>Inativar</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const rows = (data?.items || []).filter((r) => selectedIds.includes(r.id));
                    await Promise.all(rows.map((r: any) => supabase
                      .from("moradores")
                      .update({ permissoes: { ...(r.permissoes || {}), podeReservar: true } as any })
                      .eq("id", r.id)
                    ));
                    toast({ title: "Reservas liberadas" });
                    setSelectedIds([]);
                    await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: "Erro", description: e.message });
                  }
                }}>Permitir reservas</Button>
                <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    const rows = (data?.items || []).filter((r) => selectedIds.includes(r.id));
                    await Promise.all(rows.map((r: any) => supabase
                      .from("moradores")
                      .update({ permissoes: { ...(r.permissoes || {}), podeReservar: false } as any })
                      .eq("id", r.id)
                    ));
                    toast({ title: "Reservas bloqueadas" });
                    setSelectedIds([]);
                    await qc.invalidateQueries({ queryKey: ["moradores", condominioId] });
                  } catch (e: any) {
                    console.error(e);
                    toast({ title: "Erro", description: e.message });
                  }
                }}>Bloquear reservas</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Limpar seleção</Button>
              </div>
            </div>
          )}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36px]">
                    <Checkbox
                      checked={(data?.items?.length || 0) > 0 && (data?.items || []).every((i) => selectedIds.includes(i.id))}
                      onCheckedChange={(v) => {
                        const pageItems = data?.items || [];
                        const checked = Boolean(v);
                        if (checked) {
                          const ids = Array.from(new Set([...selectedIds, ...pageItems.map((i) => i.id)]));
                          setSelectedIds(ids);
                        } else {
                          const ids = selectedIds.filter((id) => !(data?.items || []).some((i) => i.id === id));
                          setSelectedIds(ids);
                        }
                      }}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Bloco</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="py-6 text-center text-muted-foreground">Nenhum morador encontrado</div>
                    </TableCell>
                  </TableRow>
                )}
                  {data?.items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(m.id)}
                          onCheckedChange={(v) => {
                            const checked = Boolean(v);
                            setSelectedIds((prev) =>
                              checked ? Array.from(new Set([...prev, m.id])) : prev.filter((id) => id !== m.id)
                            );
                          }}
                          aria-label={`Selecionar ${m.nome}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{m.nome}</TableCell>
                      <TableCell>{normalizeBrPhone(m.telefone || "")}</TableCell>
                      <TableCell>{m.unidade}</TableCell>
                      <TableCell>{m.bloco || "-"}</TableCell>
                      <TableCell className="capitalize">{m.status}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Votar</span>
                            <Switch
                              checked={!!(m as any).permissoes?.podeVotar}
                              onCheckedChange={(v) => handleRowPerm(m, "podeVotar", Boolean(v))}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Msg</span>
                            <Switch
                              checked={!!(m as any).permissoes?.recebeMsg}
                              onCheckedChange={(v) => handleRowPerm(m, "recebeMsg", Boolean(v))}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Acesso</span>
                            <Switch
                              checked={!!(m as any).permissoes?.liberaAcesso}
                              onCheckedChange={(v) => handleRowPerm(m, "liberaAcesso", Boolean(v))}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">Reservar</span>
                            <Switch
                              checked={!!(m as any).permissoes?.podeReservar}
                              onCheckedChange={(v) => handleRowPerm(m, "podeReservar", Boolean(v))}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteMutation.mutate(m.id)}
                            disabled={deleteMutation.isPending}
                            aria-label="Remover"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              {data && data.count > 0 && (
                <span>
                  Mostrando {Math.min(page * pageSize + 1, data.count)}-
                  {Math.min((page + 1) * pageSize, data.count)} de {data.count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </Button>
              <span>Página {page + 1} de {Math.max(1, totalPages)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
