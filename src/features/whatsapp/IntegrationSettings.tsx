
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationSettingsProps {
  condominioId: string;
}

type Provider = "meta" | "zapi";

export function IntegrationSettings({ condominioId }: IntegrationSettingsProps) {
  const [provider, setProvider] = useState<Provider>("meta");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!condominioId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_integrations")
      .select("id, provider, phone_number_id, zapi_instance_id, display_name, status")
      .eq("condominio_id", condominioId)
      .maybeSingle();
    if (error) {
      console.error(error);
    } else if (data) {
      setProvider((data.provider as Provider) || "meta");
      setPhoneNumberId(data.phone_number_id || "");
      setZapiInstanceId((data as any).zapi_instance_id || "");
      setDisplayName(data.display_name || "");
      setStatus(data.status || null);
    } else {
      setProvider("meta");
      setPhoneNumberId("");
      setZapiInstanceId("");
      setDisplayName("");
      setStatus(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [condominioId]);

  const handleSave = async () => {
    if (provider === "meta" && !phoneNumberId.trim()) {
      toast({ title: "Informe o Phone Number ID (Meta)", variant: "destructive" });
      return;
    }
    if (provider === "zapi" && !zapiInstanceId.trim()) {
      toast({ title: "Informe a Instância Z-API (ID)", variant: "destructive" });
      return;
    }

    const payload: any = {
      condominio_id: condominioId,
      provider,
      phone_number_id: provider === "meta" ? phoneNumberId.trim() : null,
      zapi_instance_id: provider === "zapi" ? zapiInstanceId.trim() : null,
      display_name: displayName.trim() || null,
      status: "ativo",
    };

    const { error } = await supabase
      .from("whatsapp_integrations")
      .upsert(payload, { onConflict: "condominio_id" } as any);

    if (error) {
      console.error(error);
      toast({ title: "Erro ao salvar integração", variant: "destructive" });
    } else {
      toast({ title: "Integração salva" });
      load();
    }
  };

  const handleDisconnect = async () => {
    if (provider !== "zapi" || !zapiInstanceId) {
      toast({ title: "Apenas Z-API permite desconectar pela interface", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke("zapi-logout", {
      body: { condominioId },
    });
    setLoading(false);
    if (error) {
      console.error("zapi-logout error:", error);
      toast({ title: "Falha ao desconectar", description: "Verifique a instância no painel Z-API.", variant: "destructive" });
      return;
    }
    toast({ title: "Instância desconectada" });
    load();
  };

  const renderStatusBadge = () => {
    const s = (status || "").toLowerCase();
    if (s === "ativo") return <Badge className="capitalize">Ativo</Badge>;
    if (s === "qr") return <Badge variant="secondary" className="capitalize">Aguardando QR</Badge>;
    if (s === "desconectado") return <Badge variant="outline" className="capitalize">Desconectado</Badge>;
    if (s === "erro") return <Badge variant="destructive" className="capitalize">Erro</Badge>;
    return <Badge variant="outline">—</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integração WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-sm">Provedor</label>
          <Select
            value={provider}
            onValueChange={(v: Provider) => setProvider(v)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o provedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meta">Meta (Oficial)</SelectItem>
              <SelectItem value="zapi">Z-API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 flex items-end justify-between gap-3">
          <div className="w-full">
            <label className="text-sm">Status</label>
            <div className="mt-2">{renderStatusBadge()}</div>
          </div>
          {provider === "zapi" && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading || !zapiInstanceId}
            >
              Desconectar
            </Button>
          )}
        </div>

        {provider === "meta" ? (
          <div className="md:col-span-2">
            <label className="text-sm">Phone Number ID (Meta)</label>
            <Input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="ex: 123456789012345"
              disabled={loading}
            />
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="text-sm">Instância Z-API (ID)</label>
            <Input
              value={zapiInstanceId}
              onChange={(e) => setZapiInstanceId(e.target.value)}
              placeholder="ex: ABCDEF123456"
              disabled={loading}
            />
          </div>
        )}

        <div className="md:col-span-3">
          <label className="text-sm">Nome de Exibição</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="ex: Condomínio Jardim"
            disabled={loading}
          />
        </div>

        <div className="md:col-span-3 flex justify-end gap-2">
          <Button onClick={handleSave} disabled={loading}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}
