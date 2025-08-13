import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBrPhone } from "@/utils/phone";

interface ImportResidentsDialogProps {
  condominioId: string;
  onImported?: () => void;
}

type CsvRow = {
  nome: string;
  telefone: string;
  unidade: string;
  bloco?: string;
  status?: string;
  podeVotar?: string | boolean;
  recebeMsg?: string | boolean;
  liberaAcesso?: string | boolean;
  podeReservar?: string | boolean;
};

function parseBool(v: any, fallback: boolean) {
  if (typeof v === "boolean") return v;
  if (v == null) return fallback;
  const s = String(v).trim().toLowerCase();
  return ["1", "true", "sim", "s", "y", "yes"].includes(s)
    ? true
    : ["0", "false", "nao", "não", "n", "no"].includes(s)
    ? false
    : fallback;
}

export function ImportResidentsDialog({ condominioId, onImported }: ImportResidentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const isReady = rows.length > 0 && errors.length === 0;

  const handleFile = (file: File | null) => {
    setRows([]);
    setErrors([]);
    setFileName(file?.name || "");
    if (!file) return;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        const parsed = (result.data || []).map((r) => ({
          nome: (r as any).nome?.toString().trim() || "",
          telefone: (r as any).telefone?.toString().trim() || "",
          unidade: (r as any).unidade?.toString().trim() || "",
          bloco: (r as any).bloco?.toString().trim() || undefined,
          status: (r as any).status?.toString().trim().toLowerCase() || undefined,
          podeVotar: (r as any).podevotar ?? (r as any)["pode_votar"] ?? (r as any)["pode votar"],
          recebeMsg: (r as any).recebemsg ?? (r as any)["recebe_msg"] ?? (r as any)["recebe msg"],
          liberaAcesso: (r as any).liberaacesso ?? (r as any)["libera_acesso"] ?? (r as any)["libera acesso"],
          podeReservar: (r as any).podereservar ?? (r as any)["pode_reservar"] ?? (r as any)["pode reservar"],
        }));

        const errs: string[] = [];
        parsed.forEach((r, i) => {
          if (!r.nome) errs.push(`Linha ${i + 2}: nome é obrigatório`);
          if (!r.unidade) errs.push(`Linha ${i + 2}: unidade é obrigatória`);
          if (!r.telefone) errs.push(`Linha ${i + 2}: telefone é obrigatório`);
          else if (!/^\d{11}$/.test(r.telefone.replace(/\D/g, ''))) errs.push(`Linha ${i + 2}: telefone deve conter 11 dígitos (DDD+Número)`);
          if (r.status && !["ativo", "inativo"].includes(r.status))
            errs.push(`Linha ${i + 2}: status inválido (use ativo|inativo)`);
        });

        setRows(parsed);
        setErrors(errs);
      },
      error: (err) => {
        setErrors([`Erro ao ler CSV: ${err.message}`]);
      },
    });
  };

  const templateCsv = useMemo(() => {
    const data: CsvRow[] = [
      {
        nome: "Maria Souza",
        telefone: "11988887777",
        unidade: "101",
        bloco: "A",
        status: "ativo",
        podeVotar: "sim",
        recebeMsg: "sim",
        liberaAcesso: "nao",
        podeReservar: "sim",
      },
    ];
    return Papa.unparse(data, { header: true });
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_moradores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importRows = async () => {
    try {
      if (!isReady) {
        toast({ title: "Arquivo inválido", description: errors[0] || "Revise o CSV." });
        return;
      }
      setIsImporting(true);

      const payload = rows.map((r) => ({
        condominio_id: condominioId,
        nome: r.nome,
        telefone: normalizeBrPhone(r.telefone), // já validado para 11 dígitos
        unidade: r.unidade,
        bloco: r.bloco || null,
        status: (r.status === "inativo" ? "inativo" : "ativo") as "ativo" | "inativo",
        permissoes: {
          podeVotar: parseBool(r.podeVotar, true),
          recebeMsg: parseBool(r.recebeMsg, true),
          liberaAcesso: parseBool(r.liberaAcesso, false),
          podeReservar: parseBool(r.podeReservar, true),
        },
      }));

      // Insert in chunks to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("moradores").insert(chunk);
        if (error) throw error;
      }

      toast({ title: "Importação concluída", description: `${payload.length} moradores importados.` });
      setOpen(false);
      setRows([]);
      setFileName("");
      onImported?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na importação", description: e.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Importar CSV</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar moradores via CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input type="file" accept=".csv" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
            <Button variant="ghost" onClick={downloadTemplate}>Baixar modelo</Button>
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">Arquivo: {fileName}</p>
          )}
          {errors.length > 0 && (
            <div className="text-sm text-destructive">
              {errors.slice(0, 5).map((er, i) => (
                <div key={i}>{er}</div>
              ))}
              {errors.length > 5 && <div>... e mais {errors.length - 5} erros</div>}
            </div>
          )}
          {rows.length > 0 && (
            <div className="border rounded-md max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Bloco</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 20).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell>{r.telefone}</TableCell>
                      <TableCell>{r.unidade}</TableCell>
                      <TableCell>{r.bloco || '-'}</TableCell>
                      <TableCell>{r.status || 'ativo'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Colunas suportadas: nome, telefone, unidade, bloco, status (ativo|inativo), podeVotar, recebeMsg, liberaAcesso, podeReservar. <b>Telefone deve conter 11 dígitos (DDD+Número), ex: 11988887777.</b>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={importRows} disabled={!isReady || isImporting}>
            {isImporting ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
