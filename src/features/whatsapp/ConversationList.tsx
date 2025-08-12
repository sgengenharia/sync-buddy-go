import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, PlusCircle } from "lucide-react";
import { format } from "date-fns";

interface ConversationListProps {
  condominioId: string;
  activeMoradorId: string | null;
  onSelect: (moradorId: string) => void;
}

interface MessageRow {
  morador_id: string;
  condominio_id: string;
  body: any; // pode vir string ou objeto
  raw?: any;
  timestamp: string;
  direction: string;
}

interface MoradorRow {
  id: string;
  nome: string;
  unidade: string;
  bloco: string | null;
  telefone: string;
}

export function ConversationList({ condominioId, activeMoradorId, onSelect }: ConversationListProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [moradores, setMoradores] = useState<Record<string, MoradorRow>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condominioId) return;

    const load = async () => {
      setLoading(true);
      const { data: msgs, error } = await supabase
        .from("whatsapp_messages")
        .select("morador_id, condominio_id, body, raw, timestamp, direction")
        .eq("condominio_id", condominioId)
        .order("timestamp", { ascending: false })
        .limit(500);
      if (error) {
        console.error(error);
        toast({ title: "Erro ao carregar conversas", variant: "destructive" });
        setLoading(false);
        return;
      }

      setMessages((msgs || []) as MessageRow[]);

      const ids = Array.from(new Set((msgs || []).map((m) => m.morador_id).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: moradoresRows, error: mErr } = await supabase
          .from("moradores")
          .select("id, nome, unidade, bloco, telefone")
          .in("id", ids);
        if (mErr) {
          console.error(mErr);
        } else {
          const map: Record<string, MoradorRow> = {};
          (moradoresRows || []).forEach((r) => (map[r.id] = r as MoradorRow));
          setMoradores(map);
        }
      } else {
        setMoradores({});
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("whatsapp-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages", filter: `condominio_id=eq.${condominioId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominioId]);

  // Extrai um texto legível para exibir no preview da conversa
  const extractSnippet = (m: MessageRow): string => {
    const looksLikeJson = (s: string) => s.trim().startsWith("{") || s.trim().startsWith("[");
    const good = (s: any) => typeof s === "string" && !!s.trim() && s.trim() !== "[object Object]";
    const tryParsed = (obj: any): string | null => {
      if (!obj || typeof obj !== "object") return null;
      const cands = [
        obj?.text?.message, // novo
        obj?.text?.body,
        obj?.content?.text,
        obj?.message?.text?.message, // novo
        obj?.message?.text?.body,
        obj?.message?.extendedTextMessage?.text,
        obj?.message?.conversation,
        obj?.body,
        typeof obj?.text === "string" ? obj.text : null,
      ];
      for (const c of cands) if (good(c)) return (c as string).trim();
      return null;
    };
    // 1) body como string
    if (typeof m.body === "string" && m.body.trim() && m.body !== "[object Object]") {
      if (looksLikeJson(m.body)) {
        try {
          const out = tryParsed(JSON.parse(m.body));
          if (out) return out;
        } catch {}
      }
      return m.body.trim();
    }
    // 2) body como objeto
    if (m.body && typeof m.body === "object") {
      const out = tryParsed(m.body);
      if (out) return out;
    }
    // 3) raw
    const r: any = (m as any).raw;
    if (r) {
      const flatCands = [
        r?.message?.text?.message, // novo
        r?.message?.text?.body,
        r?.text?.message, // novo
        r?.text?.body,
        r?.message?.body,
        r?.text,
        r?.body,
      ];
      for (const c of flatCands) if (good(c)) return (c as string).trim();

      const out = tryParsed(r?.message ?? r);
      if (out) return out;
    }
    // 4) fallback
    return m.direction === "inbound" ? "Mensagem recebida" : (m as any)?.status === "failed" ? "Falha ao enviar" : "Mensagem enviada";
  };
  const latestPerMorador = useMemo(() => {
    const map = new Map<string, MessageRow>();
    for (const m of messages) {
      const existing = map.get(m.morador_id);
      if (!existing || new Date(m.timestamp) > new Date(existing.timestamp)) {
        map.set(m.morador_id, m);
      }
    }
    let arr = Array.from(map.entries()).map(([morador_id, msg]) => ({ morador_id, msg }));
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(({ morador_id, msg }) => {
        const mor = moradores[morador_id];
        const hay = [mor?.nome, mor?.unidade, mor?.bloco || "", mor?.telefone, extractSnippet(msg) || ""].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return arr.sort((a, b) => (a.msg.timestamp < b.msg.timestamp ? 1 : -1));
  }, [messages, moradores, search]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" /> Conversas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-3">
          <Input placeholder="Buscar por nome, unidade ou mensagem" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Separator className="mb-3" />
        <ScrollArea className="h-[520px] pr-2">
          <div className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {!loading && latestPerMorador.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
            )}
            {latestPerMorador.map(({ morador_id, msg }) => {
              const mor = moradores[morador_id];
              const isActive = activeMoradorId === morador_id;
              return (
                <button
                  key={morador_id}
                  onClick={() => onSelect(morador_id)}
                  className={`w-full text-left rounded-md border px-3 py-2 transition ${
                    isActive ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {mor?.nome || "Morador"}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {mor?.bloco ? `Bloco ${mor.bloco} • ` : ""}Unid. {mor?.unidade || "-"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(msg.timestamp), "dd/MM HH:mm")}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {msg.direction === "inbound" ? "↩︎ " : "↪︎ "}
                    {extractSnippet(msg) || "Mensagem"}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
