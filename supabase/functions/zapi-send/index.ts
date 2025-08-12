
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function toZapiPhone(telefone: string) {
  // Z-API espera apenas dígitos com DDI, ex: 5511999999999
  const d = onlyDigits(telefone);
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const zapiToken = Deno.env.get("ZAPI_TOKEN");

    if (!supabaseUrl || !serviceKey) {
      console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!zapiToken) {
      console.error("Missing ZAPI_TOKEN");
      return new Response(JSON.stringify({ error: "ZAPI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { condominioId, moradorId, text } = await req.json();
    if (!condominioId || !moradorId || !text?.toString?.().trim()) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca morador (telefone) e integração ativa do condomínio
    const [{ data: morador, error: morErr }, { data: integ, error: intErr }] = await Promise.all([
      supabase.from("moradores").select("telefone").eq("id", moradorId).maybeSingle(),
      supabase
        .from("whatsapp_integrations")
        .select("provider, status, zapi_instance_id")
        .eq("condominio_id", condominioId)
        .maybeSingle(),
    ]);

    if (morErr) {
      console.error("Error fetching morador:", morErr);
      return new Response(JSON.stringify({ error: "Morador not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!morador?.telefone) {
      return new Response(JSON.stringify({ error: "Morador sem telefone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (intErr) {
      console.error("Error fetching integration:", intErr);
      return new Response(JSON.stringify({ error: "Integration not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!integ || integ.provider !== "zapi" || integ.status !== "ativo" || !integ.zapi_instance_id) {
      return new Response(JSON.stringify({ error: "Z-API integration not active for this condomínio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = toZapiPhone(morador.telefone);
    if (!phone) {
      return new Response(JSON.stringify({ error: "Telefone do morador inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Envia via Z-API
    const apiUrl = `https://api.z-api.io/instances/${integ.zapi_instance_id}/token/${zapiToken}/send-text`;

    const zapiResp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Inclui também o header esperado por algumas versões da Z-API
        "Client-Token": zapiToken,
        "client-token": zapiToken,
      },
      body: JSON.stringify({ phone, message: text.toString() }),
    });

    // Log detalhado da resposta da API do Zapi
    const zapiText = await zapiResp.text();
    let zapiJson = {};
    try {
      zapiJson = JSON.parse(zapiText);
    } catch {
      zapiJson = { raw: zapiText };
    }
    try {
      console.log('[ZAPI-SEND] status:', zapiResp.status, 'body:', zapiText);
    } catch {}

    const providerMessageId =
      zapiJson?.messageId ||
      zapiJson?.id ||
      zapiJson?.data?.id ||
      zapiJson?.data?.messageId ||
      null;

    // Registra mensagem (inclusive em caso de falha) para refletir no UI
    const nowIso = new Date().toISOString();
    const sendStatus = zapiResp.ok ? "sent" : "failed";
    const { error: insErr } = await supabase.from("whatsapp_messages").insert({
      morador_id: moradorId,
      condominio_id: condominioId,
      body: text.toString(),
      timestamp: nowIso,
      direction: "outbound",
      type: "text",
      status: sendStatus,
      provider_message_id: providerMessageId,
      raw: zapiJson || {},
    } as any);
    if (insErr) {
      console.error("Insert outbound error:", insErr);
    }

    if (!zapiResp.ok) {
      console.error("Z-API error:", zapiJson);
      return new Response(JSON.stringify({ error: "Falha ao enviar pela Z-API", details: zapiJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Garante sessão atualizada (sem ON CONFLICT)
    const { data: sess, error: sessSelErr } = await supabase
      .from("whatsapp_sessions")
      .select("id")
      .eq("condominio_id", condominioId)
      .eq("morador_id", moradorId)
      .maybeSingle();

    if (sessSelErr) {
      console.error("Session select error (send):", sessSelErr);
    } else if (sess?.id) {
      const { error: sessUpdErr } = await supabase
        .from("whatsapp_sessions")
        .update({ last_message_at: nowIso, state: "open", updated_at: nowIso })
        .eq("id", sess.id);
      if (sessUpdErr) console.error("Session update error (send):", sessUpdErr);
    } else {
      const { error: sessInsErr } = await supabase.from("whatsapp_sessions").insert({
        condominio_id: condominioId,
        morador_id: moradorId,
        last_message_at: nowIso,
        state: "open",
        updated_at: nowIso,
        context: {},
      } as any);
      if (sessInsErr) console.error("Session insert error (send):", sessInsErr);
    }

    return new Response(JSON.stringify({ ok: true, providerMessageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zapi-send exception:", e);
    return new Response(JSON.stringify({ error: "Unhandled error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
