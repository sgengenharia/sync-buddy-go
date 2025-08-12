
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "Z-API not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { condominioId } = await req.json().catch(() => ({}));
    if (!condominioId) {
      return new Response(JSON.stringify({ error: "Missing condominioId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: integ, error: intErr } = await supabase
      .from("whatsapp_integrations")
      .select("provider, status, zapi_instance_id")
      .eq("condominio_id", condominioId)
      .maybeSingle();

    if (intErr) {
      console.error("Error fetching integration:", intErr);
      return new Response(JSON.stringify({ error: "Integration not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!integ || integ.provider !== "zapi" || !integ.zapi_instance_id) {
      return new Response(JSON.stringify({ error: "Z-API integration not found/invalid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://api.z-api.io/instances/${integ.zapi_instance_id}/token/${zapiToken}/logout`;
    const zapiResp = await fetch(apiUrl, { method: "POST" });
    const zapiJson = await zapiResp.json().catch(() => ({}));

    if (!zapiResp.ok) {
      console.error("Z-API logout error:", zapiJson);
      return new Response(JSON.stringify({ error: "Falha ao desconectar Z-API", details: zapiJson }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await supabase
      .from("whatsapp_integrations")
      .update({ status: "desconectado", updated_at: new Date().toISOString() })
      .eq("condominio_id", condominioId);

    if (upErr) {
      console.error("Failed to update integration status after logout:", upErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zapi-logout exception:", e);
    return new Response(JSON.stringify({ error: "Unhandled error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
