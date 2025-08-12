
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CRMAtividade, CRMChamado } from "./types";

interface CRMDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamado: CRMChamado | null;
}

export function CRMDetailSheet({ open, onOpenChange, chamado }: CRMDetailSheetProps) {
  const [atividades, setAtividades] = useState<CRMAtividade[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!chamado?.id) return;

    const loadAtividades = async () => {
      const query = (supabase.from("atividades_crm" as any) as any)
        .select("*")
        .eq("chamado_id", chamado.id)
        .order("created_at", { ascending: true });
      const { data, error } = await query;
      if (error) {
        console.error(error);
        return;
      }
      setAtividades((data as unknown as CRMAtividade[]) || []);
    };
    loadAtividades();

    const channel = supabase
      .channel("crm-atividades-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "atividades_crm",
          filter: `chamado_id=eq.${chamado.id}`,
        },
        (_payload) => {
          // Recarrega a lista em qualquer mudança deste chamado
          loadAtividades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chamado?.id]);

  const handleAddComment = async () => {
    if (!chamado?.id || !newComment.trim()) return;
    const { error } = await (supabase.from("atividades_crm" as any) as any).insert({
      chamado_id: chamado.id,
      tipo: "comentario",
      conteudo: newComment.trim(),
      metadata: {},
    } as any);
    if (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
        variant: "destructive",
      });
      return;
    }
    setNewComment("");
    toast({ title: "Comentário adicionado" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalhes do Chamado</SheetTitle>
        </SheetHeader>
        {!chamado ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhum chamado selecionado.</div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{chamado.tipo}</Badge>
                <Badge>{chamado.urgencia}</Badge>
                <Badge variant="outline">{chamado.status}</Badge>
              </div>
              {chamado.telefone_contato && (
                <p className="text-sm text-muted-foreground">
                  Tel.: {chamado.telefone_contato}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {chamado.tags?.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    #{t}
                  </Badge>
                ))}
              </div>
              <Separator />
              <p className="text-sm whitespace-pre-wrap">{chamado.descricao}</p>
            </div>

            <Separator />

            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-3">
                  {atividades.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem atividades ainda.</p>
                  ) : (
                    atividades.map((a) => (
                      <div key={a.id} className="rounded-md border p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{a.tipo}</Badge>
                          <span>{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                        {a.conteudo && (
                          <p className="text-sm mt-1 whitespace-pre-wrap">{a.conteudo}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 border-t space-y-2">
              <Textarea
                placeholder="Escreva um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleAddComment}>Adicionar comentário</Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
