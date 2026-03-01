// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APPROVED_STATUSES = new Set(["approved"]);
const PENDING_STATUSES = new Set(["in_process", "pending", "authorized"]);
const FAILED_STATUSES = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

const withJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get("MERCADO_PAGO_WEBHOOK_TOKEN");
    const requestUrl = new URL(req.url);
    const tokenFromQuery = requestUrl.searchParams.get("token");

    if (webhookToken && tokenFromQuery !== webhookToken) {
      return withJson({ error: "Unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => ({}));

    const topic =
      payload?.type ||
      payload?.topic ||
      payload?.action?.split(".")?.[0] ||
      requestUrl.searchParams.get("type") ||
      requestUrl.searchParams.get("topic");

    const paymentId =
      payload?.data?.id ||
      payload?.id ||
      requestUrl.searchParams.get("data.id") ||
      requestUrl.searchParams.get("id");

    if (topic !== "payment" || !paymentId) {
      return withJson({ ok: true, ignored: true, reason: "not-payment-notification" });
    }

    const mercadoPagoAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mercadoPagoAccessToken) {
      return withJson({ error: "MERCADO_PAGO_ACCESS_TOKEN não configurado" }, 500);
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mercadoPagoAccessToken}`,
        "Content-Type": "application/json",
      },
    });

    const paymentText = await paymentResponse.text();
    const payment = paymentText ? JSON.parse(paymentText) : null;

    if (!paymentResponse.ok || !payment) {
      return withJson({
        error: "Falha ao consultar pagamento no Mercado Pago",
        details: payment,
      }, 502);
    }

    const externalReference = payment.external_reference;
    if (!externalReference) {
      return withJson({ ok: true, ignored: true, reason: "missing-external-reference" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, shipping_status, tracking_code, payment_method, shipping_cost")
      .eq("id", externalReference)
      .maybeSingle();

    if (orderError || !order) {
      return withJson({ error: "Pedido não encontrado para external_reference", details: orderError?.message }, 404);
    }

    const paymentStatus = String(payment.status || "").toLowerCase();

    if (APPROVED_STATUSES.has(paymentStatus)) {
      const updateData: Record<string, unknown> = {
        status: "confirmed",
        shipping_status: order.shipping_status === "pending" ? "processing" : order.shipping_status || "processing",
      };

      if (!order.tracking_code) {
        updateData.tracking_code = `TB${Date.now().toString(36).toUpperCase()}`;
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update(updateData)
        .eq("id", order.id);

      if (updateError) {
        return withJson({ error: "Falha ao atualizar pedido aprovado", details: updateError.message }, 500);
      }

      await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", order.user_id);

      return withJson({
        ok: true,
        orderId: order.id,
        paymentId,
        paymentStatus,
        action: "order-confirmed",
      });
    }

    if (PENDING_STATUSES.has(paymentStatus)) {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "pending", shipping_status: "pending" })
        .eq("id", order.id)
        .neq("status", "confirmed");

      if (updateError) {
        return withJson({ error: "Falha ao atualizar pedido pendente", details: updateError.message }, 500);
      }

      return withJson({ ok: true, orderId: order.id, paymentId, paymentStatus, action: "order-pending" });
    }

    if (FAILED_STATUSES.has(paymentStatus)) {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled", shipping_status: "pending" })
        .eq("id", order.id)
        .neq("status", "confirmed");

      if (updateError) {
        return withJson({ error: "Falha ao atualizar pedido cancelado", details: updateError.message }, 500);
      }

      return withJson({ ok: true, orderId: order.id, paymentId, paymentStatus, action: "order-cancelled" });
    }

    return withJson({ ok: true, orderId: order.id, paymentId, paymentStatus, action: "no-op" });
  } catch (error) {
    console.error("mercado-pago-webhook error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return withJson({ error: message }, 500);
  }
});
