// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

const excludedTypesByMethod: Record<string, string[]> = {
  pix: ["credit_card", "debit_card", "ticket", "atm", "prepaid_card"],
  debit: ["credit_card", "ticket", "atm", "prepaid_card", "pix"],
  credit_1x: ["debit_card", "ticket", "atm", "prepaid_card", "pix"],
  credit_12x: ["debit_card", "ticket", "atm", "prepaid_card", "pix"],
};

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

    const {
      orderId,
      items,
      shippingCost,
      payerEmail,
      paymentMethod,
    } = await req.json() as {
      orderId: string;
      items: CheckoutItem[];
      shippingCost: number;
      payerEmail: string;
      paymentMethod: string;
    };

    if (!orderId || !Array.isArray(items) || !items.length || !payerEmail || !paymentMethod) {
      return new Response(JSON.stringify({ error: "Dados inválidos para criar preferência" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      return new Response(JSON.stringify({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
    const notificationUrlFromEnv = Deno.env.get("MERCADO_PAGO_WEBHOOK_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const webhookToken = Deno.env.get("MERCADO_PAGO_WEBHOOK_TOKEN");

    const baseNotificationUrl = notificationUrlFromEnv || (supabaseUrl ? `${supabaseUrl}/functions/v1/mercado-pago-webhook` : undefined);

    const notificationUrl = baseNotificationUrl
      ? (() => {
          const url = new URL(baseNotificationUrl);
          if (webhookToken) {
            url.searchParams.set("token", webhookToken);
          }
          return url.toString();
        })()
      : undefined;

    const payload: Record<string, unknown> = {
      external_reference: orderId,
      items: [
        ...items.map((item) => ({
          title: item.title,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          currency_id: item.currency_id || "BRL",
        })),
        {
          title: "Frete",
          quantity: 1,
          unit_price: Number(shippingCost || 0),
          currency_id: "BRL",
        },
      ],
      payer: { email: payerEmail },
      back_urls: {
        success: `${frontendUrl}/checkout?payment_status=approved&order_id=${orderId}`,
        failure: `${frontendUrl}/checkout?payment_status=rejected&order_id=${orderId}`,
        pending: `${frontendUrl}/checkout?payment_status=pending&order_id=${orderId}`,
      },
      auto_return: "approved",
      binary_mode: false,
      metadata: {
        order_id: orderId,
        source: "transbarber-web",
      },
      payment_methods: {
        excluded_payment_types: (excludedTypesByMethod[paymentMethod] || []).map((id) => ({ id })),
        installments: paymentMethod === "credit_1x" ? 1 : paymentMethod === "credit_12x" ? 12 : undefined,
      },
    };

    if (notificationUrl) {
      payload.notification_url = notificationUrl;
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const responseBody = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: "Falha ao criar preferência no Mercado Pago",
        details: responseBody,
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      preferenceId: responseBody?.id,
      initPoint: responseBody?.init_point,
      sandboxInitPoint: responseBody?.sandbox_init_point,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("mercado-pago-create-preference error", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
