import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function toE164(phone: string) {
  const d = onlyDigits(phone);
  if (!d) return "";
  if (d.startsWith("55")) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return `+${d}`;
}

function toLocal11(phone: string) {
  let d = onlyDigits(phone);
  if (!d) return "";
  if (d.startsWith("55")) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  return d;
}

function pick<T = any>(obj: any, keys: string[]): Partial<T> {
  const out: any = {};
  for (const k of keys) if (k in (obj || {})) out[k] = obj[k];
  return out;
}

// Safely turn various payload fields into a string
function toStringish(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if ("body" in v) return toStringish((v as any).body);
    if ("text" in v) return toStringish((v as any).text);
    try {
      const s = JSON.stringify(v);
      return s || "";
    } catch {
      return "";
    }
  }
  return "";
}

function isGoodString(s: any): s is string {
  return typeof s === "string" && !!s.trim() && s.trim() !== "[object Object]";
}

// Try to extract the best text field from common Z-API/WA payload shapes
function extractBestText(m: any, payload: any): string | null {
  // Priorizar campos com texto válido e ignorar "[object Object]"
  const candidates: any[] = [
    payload?.text?.message,
    m?.text?.message,
    payload?.text?.body,
    m?.text?.body,
    m?.body,
    payload?.body,
    payload?.message,
  ];

  for (const c of candidates) {
    if (isGoodString(c)) return c.trim();
  }
  return null;
}

// Normalize timestamps from seconds/ms/ISO into a safe ISO string within sane bounds
function normalizeTimestamp(input: any): string {
  const now = Date.now();
  const min = Date.UTC(2000, 0, 1); // 2000-01-01
  let ms: number | null = null;

  if (typeof input === "number") {
    ms = input > 1e12 ? input : input * 1000; // if already ms, keep; else convert seconds->ms
  } else if (typeof input === "string") {
    const n = Number(input);
    if (!Number.isNaN(n) && /^(\d+)$/.test(input)) {
      ms = n > 1e12 ? n : n * 1000;
    } else {
      const parsed = Date.parse(input);
      if (!Number.isNaN(parsed)) ms = parsed;
    }
  }

  if (ms === null) ms = now;
  // Clamp to sane range [2000, 2100]
  const max = Date.UTC(2100, 0, 1);
  if (ms < min || ms > max) ms = now;
  return new Date(ms).toISOString();
}

type ZapiMessage = {
  id?: string;
  from?: string;
  to?: string;
  fromMe?: boolean;
  text?: { body?: string; message?: string };
  body?: string;
  message?: string;
  content?: { text?: string };
  timestamp?: number | string;
  key?: { id?: string };
  sender?: { id?: string };
  contact?: { phone?: string };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const providedToken = url.searchParams.get("token");
  const secret = Deno.env.get("ZAPI_WEBHOOK_TOKEN");

  if (!secret || providedToken !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const payload = await req.json().catch(() => null);
    // Log detalhado do payload recebido para diagnóstico
    try {
      console.log("[ZAPI-WEBHOOK] Payload recebido:", JSON.stringify(payload));
    } catch (e) {
      console.error("[ZAPI-WEBHOOK] Falha ao serializar payload:", e);
    }
    if (!payload) {
      return new Response(JSON.stringify({ error: "No JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Colete candidatos a mensagens em diferentes formatos
    const msgsCandidates: any[] = [];
    if (Array.isArray(payload?.messages)) msgsCandidates.push(...payload.messages);
    if (payload?.message) msgsCandidates.push(payload.message);
    if (Array.isArray(payload?.data?.messages)) msgsCandidates.push(...payload.data.messages);
    if (payload?.data?.message) msgsCandidates.push(payload.data.message);
    if (Array.isArray(payload?.results)) msgsCandidates.push(...payload.results);

    // Novo: se não houver mensagens nas coleções acima, tente formato "flat" no root
    if (msgsCandidates.length === 0) {
      const rootFrom =
        payload?.from ??
        payload?.sender?.id ??
        payload?.contact?.phone ??
        payload?.participantPhone ??
        payload?.participant ??
        payload?.phone ??
        null;

      const rootText = payload?.text ?? payload?.body ?? payload?.message ?? null;

      if (rootFrom && (rootText || payload?.type)) {
        // Construir text preservando "message" quando disponível para evitar "[object Object]"
        let textField: { body?: string; message?: string } | undefined = undefined;
        if (typeof rootText === "string") {
          if (isGoodString(rootText)) {
            textField = { body: rootText };
          }
        } else if (rootText && typeof rootText === "object") {
          const msg =
            typeof (rootText as any).message === "string"
              ? (rootText as any).message
              : typeof (rootText as any).body === "string"
              ? (rootText as any).body
              : "";
          if (isGoodString(msg)) {
            textField = { message: msg };
          }
        }

        const rootCandidate: ZapiMessage = {
          id: payload?.messageId || payload?.id,
          from: rootFrom,
          fromMe: payload?.fromMe === true,
          text: textField,
          timestamp: payload?.momment || payload?.moment || payload?.timestamp,
          key: { id: payload?.messageId },
        };
        msgsCandidates.push(rootCandidate);
        console.log("zapi-webhook: synthesized root message", {
          from: rootFrom,
          type: payload?.type,
          hasText: Boolean(textField?.message || textField?.body),
        });
      }
    }

    const msgs: ZapiMessage[] = msgsCandidates as ZapiMessage[];

    const instanceId = payload?.instanceId || payload?.data?.instanceId || payload?.instance?.id || null;
    const statusRaw = String(
      payload?.status || payload?.data?.status || payload?.event || payload?.type || ""
    ).toUpperCase();

    console.log("zapi-webhook: received", {
      msgsCount: msgs.length,
      instanceId,
      statusRaw,
      hasFromMe: msgs.some((m: any) => m?.fromMe === true),
      keys: Object.keys(payload || {}),
      tokenOk: true,
    });

    let inserted = 0;
    let updatedIntegration = false;

    if (instanceId && statusRaw) {
      let newStatus: string | null = null;
      const activeHints = [
        "CONNECT",
        "CONNECTED",
        "AVAILABLE",
        "PAIRED",
        "READY",
        "RECEIVED",
        "READ",
        "COMPOSING",
        "TYPING",
      ];
      if (activeHints.some((h) => statusRaw.includes(h))) newStatus = "ativo";
      else if (statusRaw.includes("QRCODE") || statusRaw.includes("QR")) newStatus = "qr";
      else if (
        statusRaw.includes("DISCONNECT") ||
        statusRaw.includes("LOGOUT") ||
        statusRaw.includes("UNPAIRED") ||
        statusRaw.includes("OFFLINE")
      ) newStatus = "desconectado";
      else if (statusRaw.includes("ERROR") || statusRaw.includes("FAIL")) newStatus = "erro";

      if (newStatus) {
        const { error: upErr } = await supabase
          .from("whatsapp_integrations")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("zapi_instance_id", instanceId as string);
        if (upErr) {
          console.error("Update integration status error:", upErr, { instanceId, newStatus, statusRaw });
        } else {
          updatedIntegration = true;
        }
      }
    }

    for (const m of msgs) {
      // Ignora mensagens enviadas por nós (fromMe = true)
      if ((m as any)?.fromMe === true) continue;

      const textRaw = extractBestText(m, payload);

      const from =
        m?.from ??
        m?.sender?.id ??
        m?.contact?.phone ??
        payload?.from ??
        payload?.phone ??
        payload?.participantPhone ??
        payload?.participant ??
        null;

      if (!from || !textRaw) continue;

      const providerMessageId = (m as any)?.id || (m as any)?.key?.id || payload?.messageId || null;
      const tsIso = normalizeTimestamp((m as any)?.timestamp ?? payload?.momment ?? payload?.moment ?? payload?.timestamp);

      const local11 = toLocal11(from);
      if (!local11) {
        console.warn("Número de origem vazio após normalização local11", { from });
        continue;
      }
      const candidates = [local11];

      const { data: moradorRow, error: morErr } = await supabase
        .from("moradores")
        .select("id, condominio_id, telefone")
        .in("telefone", candidates)
        .limit(1)
        .maybeSingle();

      if (morErr) {
        console.error("Fetch morador error:", morErr, { candidates });
        continue;
      }
      if (!moradorRow) {
        console.warn("Morador not found for phone", { candidates, from, text: textRaw });
        continue;
      }

      const bodyStr = toStringish(textRaw).trim();

      const insertPayload = {
        morador_id: moradorRow.id,
        condominio_id: moradorRow.condominio_id,
        body: bodyStr,
        timestamp: tsIso,
        direction: "inbound",
        type: "text",
        status: "received",
        provider_message_id: providerMessageId,
        raw: {
          meta: pick(payload, ["instanceId", "event", "type"]),
          message: m,
        },
      } as any;

      const { error: insErr } = await supabase.from("whatsapp_messages").insert(insertPayload);
      if (insErr) {
        console.error("Insert inbound error:", insErr, insertPayload);
        continue;
      }
      inserted++;

      // Update/insert session without ON CONFLICT (não há constraint única composta)
      const nowIso = new Date().toISOString();
      const { data: sess, error: sessSelErr } = await supabase
        .from("whatsapp_sessions")
        .select("id")
        .eq("condominio_id", moradorRow.condominio_id)
        .eq("morador_id", moradorRow.id)
        .maybeSingle();

      if (sessSelErr) {
        console.error("Session select error:", sessSelErr);
      } else if (sess?.id) {
        const { error: sessUpdErr } = await supabase
          .from("whatsapp_sessions")
          .update({ last_message_at: tsIso, state: "open", updated_at: nowIso })
          .eq("id", sess.id);
        if (sessUpdErr) console.error("Session update error:", sessUpdErr);
      } else {
        const { error: sessInsErr } = await supabase.from("whatsapp_sessions").insert({
          condominio_id: moradorRow.condominio_id,
          morador_id: moradorRow.id,
          last_message_at: tsIso,
          state: "open",
          updated_at: nowIso,
          context: {},
        } as any);
        if (sessInsErr) console.error("Session insert error:", sessInsErr);
      }

      // Auto-reply simples (se não houve outbound nos últimos X minutos)
      const windowMinutes = 10;
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data: recentOut, error: recentErr } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("morador_id", moradorRow.id)
        .eq("condominio_id", moradorRow.condominio_id)
        .eq("direction", "outbound")
        .gte("timestamp", cutoff)
        .limit(1);

      if (recentErr) {
        console.error("Recent outbound check error:", recentErr);
      }

      // Corrigido: usar o texto extraído
      if ((!recentOut || recentOut.length === 0) && bodyStr.length > 0) {
        const autoText =
          "Olá! Recebemos sua mensagem e em breve retornaremos. Se precisar de algo urgente, responda com 'URGENTE'.";
        console.log("zapi-webhook: sending auto-reply", {
          moradorId: moradorRow.id,
          condominioId: moradorRow.condominio_id,
        });

        const { error: sendErr } = await supabase.functions.invoke("zapi-send", {
          body: {
            condominioId: moradorRow.condominio_id,
            moradorId: moradorRow.id,
            text: autoText,
          },
        });

        if (sendErr) {
          console.error("Auto-reply send error:", sendErr);
        } else {
          console.log("Auto-reply sent ok");
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted, updatedIntegration }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zapi-webhook exception:", e);
    return new Response(JSON.stringify({ error: "Unhandled error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
