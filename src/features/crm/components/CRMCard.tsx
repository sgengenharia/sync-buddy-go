
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CRMChamado } from "../types";

interface CRMCardProps {
  chamado: CRMChamado;
  onClick?: (chamado: CRMChamado) => void;
}

export function CRMCard({ chamado, onClick }: CRMCardProps) {
  const descricaoSnippet =
    chamado.descricao.length > 140
      ? chamado.descricao.slice(0, 140) + "..."
      : chamado.descricao;

  return (
    <Card
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", chamado.id);
      }}
      onClick={() => onClick?.(chamado)}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">{chamado.tipo}</Badge>
          <Badge
            className={cn(
              "text-xs",
              chamado.urgencia === "alta" && "bg-red-500/15 text-red-600",
              chamado.urgencia === "media" && "bg-amber-500/15 text-amber-600",
              chamado.urgencia === "baixa" && "bg-emerald-500/15 text-emerald-600"
            )}
          >
            {chamado.urgencia}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{descricaoSnippet}</p>
        <div className="flex flex-wrap gap-1">
          {chamado.tags?.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline" className="text-[10px]">
              #{t}
            </Badge>
          ))}
          {chamado.tags && chamado.tags.length > 4 && (
            <Badge variant="outline" className="text-[10px]">+{chamado.tags.length - 4}</Badge>
          )}
        </div>
        {chamado.telefone_contato && (
          <p className="text-xs text-muted-foreground">{chamado.telefone_contato}</p>
        )}
      </CardContent>
    </Card>
  );
}
