
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CRMChamado, CRMStatus } from "../types";
import { CRMCard } from "./CRMCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  title: string;
  status: CRMStatus;
  items: CRMChamado[];
  onDropCard: (cardId: string, toStatus: CRMStatus) => void;
  onOpenDetails: (chamado: CRMChamado) => void;
}

export function KanbanColumn({
  title,
  status,
  items,
  onDropCard,
  onOpenDetails,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background flex flex-col h-full min-h-[400px]"
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const cardId = e.dataTransfer.getData("text/plain");
        if (cardId) onDropCard(cardId, status);
      }}
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{title}</span>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </CardTitle>
        </CardHeader>
      </Card>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {items.map((item) => (
            <CRMCard key={item.id} chamado={item} onClick={onOpenDetails} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
