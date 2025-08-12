import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";
import { format } from "date-fns";

interface MessageThreadProps {
  condominioId: string;
  moradorId: string;
}

interface MessageRow {
  id: string;
  morador_id: string;
  condominio_id: string;
  body: any; // pode vir string, json ou null
  timestamp: string;
  direction: "inbound" | "outbound";
  status: string | null;
  raw?: any;
}

export function MessageThread({ condominioId, moradorId }: MessageThreadProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [moradorNome, setMoradorNome] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Novos estados para envio via Z-API
  const [canSend, setCanSend] = useState(false);
  const [provider, setProvider] = useState<"meta" | "zapi" | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Função reutilizável para carregar o thread (usada no mount, realtime e após envio)
  const loadThread = useCallback(async () => {
    if (!condominioId || !moradorId) return;
    const { data: msgs, error } = await supabase
      .from("whatsapp_messages")
      .select("id, morador_id, condominio_id, body, timestamp, direction, status, raw")
      .eq("condominio_id", condominioId)
      .eq("morador_id", moradorId)
      .order("timestamp", { ascending: true })
      .limit(500);

    if (error) {
      console.error(error);
      toast({ title: "Erro ao carregar mensagens", variant: "destructive" });
      return;
    }
    setMessages((msgs || []) as MessageRow[]);

    const { data: mor, error: mErr } = await supabase
      .from("moradores")
      .select("nome")
      .eq("id", moradorId)
      .maybeSingle();
    if (!mErr && mor) setMoradorNome(mor.nome);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [condominioId, moradorId]);

  useEffect(() => {
    if (!condominioId || !moradorId) return;

    // Carrega na entrada
    loadThread();

    // Realtime para atualizações do thread
    const channel = supabase
      .channel("whatsapp-thread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `condominio_id=eq.${condominioId},morador_id=eq.${moradorId}`,
        },
        () => {
          // Recarrega quando houver mutação relevante
          loadThread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominioId, moradorId, loadThread]);

  // Carrega integração para habilitar envio (apenas Z-API ativa)
  useEffect(() => {
    if (!condominioId) return;
    (async () => {
      const { data, error } = await supabase
        .from("whatsapp_integrations")
        .select("provider, status")
        .eq("condominio_id", condominioId)
        .maybeSingle();
      if (error) {
        console.error("Erro ao carregar integração:", error);
        setCanSend(false);
        setProvider(null);
        return;
      }
      const prov = (data?.provider as "meta" | "zapi") || "meta";
      setProvider(prov);
      setCanSend(prov === "zapi" && data?.status === "ativo");
    })();
  }, [condominioId]);

  // Realtime: atualiza automaticamente quando a integração mudar (status/provedor)
  useEffect(() => {
    if (!condominioId) return;
    const channel = supabase
      .channel(`whatsapp-integration-${condominioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_integrations", filter: `condominio_id=eq.${condominioId}` },
        async () => {
          const { data } = await supabase
            .from("whatsapp_integrations")
            .select("provider, status")
            .eq("condominio_id", condominioId)
            .maybeSingle();
          const prov = (data?.provider as "meta" | "zapi") || null;
          setProvider(prov);
          setCanSend(prov === "zapi" && data?.status === "ativo");
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [condominioId]);

  const renderMessage = (m: MessageRow) => {
    const looksLikeJson = (s: string) => {
      const t = s.trim();
      return t.startsWith("{") || t.startsWith("[");
    };

    const tryExtractFromParsed = (obj: any): string | null => {
      if (!obj || typeof obj !== "object") return null;
      const candidates = [
        obj?.text?.message,
        obj?.text?.body,
        obj?.content?.text,
        obj?.message?.text?.message,
        obj?.message?.text?.body,
        obj?.message?.extendedTextMessage?.text,
        obj?.message?.conversation,
        obj?.body,
        typeof obj?.text === "string" ? obj.text : null,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim() && c.trim() !== "[object Object]") return c.trim();
      }
      return null;
    };

    const tryExtractFromRaw = (raw: any): string | null => {
      if (!raw) return null;
      const r = raw;
      const candidates = [
        r?.message?.text?.message,
        r?.message?.text?.body,
        r?.message?.content?.text,
        r?.message?.message?.extendedTextMessage?.text,
        r?.message?.message?.conversation,
        r?.message?.body,
        typeof r?.message?.text === "string" ? r.message.text : null,
        r?.text?.message,
        r?.text?.body,
        typeof r?.text === "string" ? r.text : null,
        r?.body,
      ];
      for (const c of candidates) {
        if (typeof c === "string" && c.trim() && c.trim() !== "[object Object]") return c.trim();
      }
      // última tentativa: parsear objetos profundos sem retornar "[object Object]"
      try {
        const s = JSON.stringify(r?.message ?? r);
        if (s && s !== "{}") {
          const parsed = JSON.parse(s);
          const out = tryExtractFromParsed(parsed);
          if (out) return out;
        }
      } catch {}
      return null;
    };

    const body = m.body as any;

    // 1) Se body é string, trata
    if (typeof body === "string" && body.trim()) {
      const s = body.trim();
      if (s !== "[object Object]") {
        if (looksLikeJson(s)) {
          try {
            const parsed = JSON.parse(s);
            const out = tryExtractFromParsed(parsed);
            if (out) return out;
          } catch {}
        }
        return s;
      }
    }

    // 2) Se body é objeto, tenta extrair
    if (body && typeof body === "object") {
      const out = tryExtractFromParsed(body);
      if (out) return out;
    }

    // 3) Tenta a partir do raw
    const fromRaw = tryExtractFromRaw((m as any).raw);
    if (fromRaw) return fromRaw;

    // 4) Fallbacks amigáveis
    if (m.direction === "inbound") return "Mensagem recebida (sem texto)";
    if (m.status === "failed") return "Falha ao enviar";
    return "Mensagem enviada";
  };

  const handleCriarChamado = async () => {
    const descricaoBase = messages.length ? messages[messages.length - 1].body || "Mensagem via WhatsApp" : "Mensagem via WhatsApp";
    const { error } = await supabase.from("chamados_crm").insert({
      condominio_id: condominioId,
      morador_id: moradorId,
      descricao: descricaoBase,
      tipo: "whatsapp",
      urgencia: "media",
      status: "novo",
    } as any);
    if (error) {
      console.error(error);
      toast({ title: "Falha ao criar chamado", variant: "destructive" });
    } else {
      toast({ title: "Chamado criado no CRM" });
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    if (!canSend) {
      toast({
        title: "Envio indisponível",
        description: provider === "meta" ? "Envio por Meta ainda não implementado." : "Verifique a integração Z-API.",
        variant: "destructive",
      });
      return;
    }

    const msgText = text.trim();
    setText("");

    // Otimista: adiciona mensagem localmente
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageRow = {
      id: tempId,
      morador_id: moradorId,
      condominio_id: condominioId,
      body: msgText,
      timestamp: new Date().toISOString(),
      direction: "outbound",
      status: "sending",
      raw: {},
    };
    setMessages((prev) => [...prev, tempMessage]);

    setSending(true);
    const { error } = await supabase.functions.invoke("zapi-send", {
      body: { condominioId, moradorId, text: msgText },
    });
    setSending(false);

    if (error) {
      console.error("zapi-send error:", error);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)));
      toast({ title: "Falha ao enviar", description: error.message ?? "Não foi possível enviar a mensagem.", variant: "destructive" });
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "sent" } : m)));
    }

    // Atualiza do servidor (resolve divergências e captura status real)
    await loadThread();

    // Scroll para o final
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{moradorNome || "Conversas"}</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleCriarChamado}>
            <Plus className="h-4 w-4 mr-1" /> Criar chamado no CRM
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px] pr-3">
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] rounded-md p-2 border ${m.direction === "inbound" ? "mr-auto" : "ml-auto"}`}>
                <div className="text-xs text-muted-foreground mb-1">
                  {format(new Date(m.timestamp), "dd/MM HH:mm")}
                </div>
                <div className="text-sm leading-relaxed">
                  {renderMessage(m)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <div className="mt-4 flex gap-2">
          {canSend ? (
            <>
              <Input
                placeholder={provider === "zapi" ? "Escreva uma mensagem..." : "Envio por Meta ainda não disponível"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!canSend || sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button onClick={handleSend} disabled={!canSend || sending || !text.trim()}>
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </>
          ) : (
            <>
              <Input placeholder="Envio automatizado via chatbot" disabled />
              <Button disabled>Enviar</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
