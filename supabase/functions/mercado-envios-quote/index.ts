// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ShippingOption = {
  id?: string;
  name?: string;
  display?: string;
  list_cost?: number;
  cost?: number;
  estimated_delivery_time?: {
    date?: string;
    shipping?: number;
  };
  estimated_delivery_limit?: {
    date?: string;
  };
};

const normalizeCep = (value: string) => value.replace(/\D/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const cep = normalizeCep(payload?.cep || "");
    const declaredValue = Number(payload?.declaredValue || 0);
    const dimensions = String(payload?.dimensions || "16x16x16,1000");

    if (cep.length !== 8) {
      return new Response(JSON.stringify({ error: "CEP inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enviosApiUrl = Deno.env.get("MERCADO_ENVIOS_API_URL") || "https://api.mercadolibre.com/sites/MLB/shipping_options";
    const mercadoEnviosAccessToken = Deno.env.get("MERCADO_ENVIOS_ACCESS_TOKEN");

    const url = new URL(enviosApiUrl);
    url.searchParams.set("zip_code", cep);
    url.searchParams.set("item_price", String(Number.isFinite(declaredValue) ? declaredValue : 0));
    url.searchParams.set("dimensions", dimensions);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (mercadoEnviosAccessToken) {
      headers.Authorization = `Bearer ${mercadoEnviosAccessToken}`;
    }

    const response = await fetch(url.toString(), { headers });
    const bodyText = await response.text();
    const body = bodyText ? JSON.parse(bodyText) : null;

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: "Falha ao consultar Mercado Envios",
        details: body,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const options: ShippingOption[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.options)
        ? body.options
        : [];

    if (!options.length) {
      return new Response(JSON.stringify({ error: "Sem opções de frete para o CEP informado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sorted = [...options].sort((a, b) => Number(a.list_cost ?? a.cost ?? Infinity) - Number(b.list_cost ?? b.cost ?? Infinity));
    const selected = sorted[0];

    const shippingCost = Number(selected.list_cost ?? selected.cost ?? 0);
    const shippingDays = Number(selected.estimated_delivery_time?.shipping ?? 0);

    return new Response(JSON.stringify({
      shippingCost,
      shippingDays,
      serviceName: selected.name || selected.display || "Mercado Envios",
      raw: selected,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mercado-envios-quote error", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
