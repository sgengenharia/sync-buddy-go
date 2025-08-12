
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CRMChamado, CRMStatus } from "./types";
import { KanbanColumn } from "./components/KanbanColumn";
import { CRMFilters } from "./CRMFilters";
import { CRMDetailSheet } from "./CRMDetailSheet";

const statusColumns: { key: CRMStatus; title: string }[] = [
  { key: "novo", title: "Novo" },
  { key: "em_andamento", title: "Em andamento" },
  { key: "aguardando", title: "Aguardando" },
  { key: "resolvido", title: "Resolvido" },
];

interface CRMBoardProps {
  condominioId: string;
}

export function CRMBoard({ condominioId }: CRMBoardProps) {
  const [chamados, setChamados] = useState<CRMChamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<CRMChamado | null>(null);

  useEffect(() => {
    if (!condominioId) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chamados_crm")
        .select("*")
        .eq("condominio_id", condominioId)
        .order("data_criacao", { ascending: false });

      if (error) {
        console.error(error);
        toast({
          title: "Erro ao carregar CRM",
          description: "Não foi possível carregar os chamados.",
          variant: "destructive",
        });
      } else {
        setChamados((data || []) as CRMChamado[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("crm-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chamados_crm", filter: `condominio_id=eq.${condominioId}` },
        (_payload) => {
          // Recarrega por simplicidade (mantém consistência)
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominioId]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    chamados.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [chamados]);

  const filteredChamados = useMemo(() => {
    const normalize = (v: string) => v?.toLowerCase?.() || "";
    const q = normalize(search);
    const hasQuery = q.length > 0;

    return chamados.filter((c) => {
      // filtro por tags (todas selecionadas devem estar presentes)
      if (selectedTags.length > 0) {
        const set = new Set(c.tags || []);
        const containsAll = selectedTags.every((t) => set.has(t));
        if (!containsAll) return false;
      }
      if (!hasQuery) return true;

      const haystack = [
        c.descricao,
        c.tipo,
        c.urgencia,
        c.telefone_contato || "",
        ...(c.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [chamados, search, selectedTags]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<CRMStatus, CRMChamado[]> = {
      novo: [],
      em_andamento: [],
      aguardando: [],
      resolvido: [],
    };
    filteredChamados.forEach((c) => groups[c.status].push(c));
    return groups;
  }, [filteredChamados]);

  const handleDropCard = async (cardId: string, toStatus: CRMStatus) => {
    const card = chamados.find((c) => c.id === cardId);
    if (!card || card.status === toStatus) return;

    const oldStatus = card.status;
    // Atualiza status
    const { error } = await supabase
      .from("chamados_crm")
      .update({ status: toStatus })
      .eq("id", cardId);

    if (error) {
      console.error(error);
      toast({
        title: "Falha ao mover",
        description: "Não foi possível atualizar o status do chamado.",
        variant: "destructive",
      });
      return;
    }

    // Loga atividade de mudança de status
    const { error: actError } = await (supabase.from("atividades_crm" as any) as any).insert({
      chamado_id: cardId,
      tipo: "status_change",
      conteudo: `Status: ${oldStatus} -> ${toStatus}`,
      metadata: { from: oldStatus, to: toStatus },
    } as any);
    if (actError) console.error("Erro ao registrar atividade:", actError);

    toast({ title: "Chamado movido", description: `Novo status: ${toStatus}` });
    // Otimista: atualiza local enquanto o realtime não chega
    setChamados((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, status: toStatus } : c))
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">CRM - Central de Relacionamento</h2>
        <p className="text-muted-foreground">
          Gerencie chamados e solicitações dos moradores
        </p>
      </div>

      <CRMFilters
        search={search}
        onSearchChange={setSearch}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
        allTags={allTags}
      />

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando chamados...</div>
      ) : (
        // Substitui o grid por rolagem horizontal
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {statusColumns.map((col) => (
              <div key={col.key} className="w-[360px] flex-shrink-0">
                <KanbanColumn
                  title={col.title}
                  status={col.key}
                  items={groupedByStatus[col.key]}
                  onDropCard={handleDropCard}
                  onOpenDetails={(chamado) => {
                    setSelectedChamado(chamado);
                    setDetailsOpen(true);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <CRMDetailSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        chamado={selectedChamado}
      />
    </div>
  );
}
