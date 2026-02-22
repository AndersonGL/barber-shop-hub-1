import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId, trackingCode } = await req.json();
    if (!orderId || !trackingCode) {
      return new Response(JSON.stringify({ error: 'orderId and trackingCode required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order with items and customer profile
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name))')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_name, email')
      .eq('user_id', order.user_id)
      .single();

    const customerEmail = profile?.email;
    const customerName = profile?.company_name || 'Cliente';

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: 'Customer has no email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const itemsHtml = (order.order_items || []).map((item: any) => `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0;">${item.products?.name || 'Produto'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: right;">R$ ${(item.price_at_purchase * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Georgia', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-top: 3px solid #c9a227; border-radius: 12px 12px 0 0; padding: 40px 40px 30px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 4px; color: #c9a227; text-transform: uppercase;">✦ Barber Supply ✦</p>
              <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: #fff; letter-spacing: 6px; text-transform: uppercase;">TRANS<span style="color: #c9a227;">BARBER</span></h1>
              <div style="width: 60px; height: 2px; background: linear-gradient(90deg, transparent, #c9a227, transparent); margin: 16px auto;"></div>
            </td>
          </tr>

          <!-- Shipping banner -->
          <tr>
            <td style="background-color: #111; padding: 30px 40px; text-align: center; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <div style="display: inline-block; background: rgba(201,162,39,0.12); border: 1px solid #c9a227; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px; margin-bottom: 16px;">🚚</div>
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #fff; letter-spacing: 3px; text-transform: uppercase;">Pedido Enviado!</h2>
              <p style="margin: 0; color: #888; font-size: 14px;">Olá ${customerName}, seu pedido está a caminho!</p>
            </td>
          </tr>

          <!-- Tracking code -->
          <tr>
            <td style="background-color: #111; padding: 0 40px 20px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <div style="background: rgba(201,162,39,0.1); border: 2px solid #c9a227; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 3px; color: #c9a227; text-transform: uppercase;">Código de Rastreio</p>
                <p style="margin: 0; font-size: 28px; color: #fff; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${trackingCode}</p>
                <p style="margin: 12px 0 0; font-size: 12px; color: #888;">Use este código para acompanhar a entrega nos Correios ou transportadora.</p>
              </div>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="background-color: #111; padding: 0 40px 20px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <h3 style="margin: 0 0 12px; font-size: 11px; letter-spacing: 3px; color: #c9a227; text-transform: uppercase;">Itens Enviados</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #222;">
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; letter-spacing: 1px; color: #888; text-transform: uppercase; font-weight: normal;">Produto</th>
                    <th style="padding: 10px 8px; text-align: center; font-size: 11px; letter-spacing: 1px; color: #888; text-transform: uppercase; font-weight: normal;">Qtd</th>
                    <th style="padding: 10px 8px; text-align: right; font-size: 11px; letter-spacing: 1px; color: #888; text-transform: uppercase; font-weight: normal;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="background: rgba(201,162,39,0.08); border-top: 1px solid #c9a227;">
                    <td colspan="2" style="padding: 14px 8px; color: #c9a227; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Total</td>
                    <td style="padding: 14px 8px; color: #c9a227; text-align: right; font-size: 18px; font-weight: bold;">R$ ${Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-bottom: 3px solid #c9a227; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #555;">Dúvidas sobre a entrega? Entre em contato conosco.</p>
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">TransBarber ✦ Supply Premium</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TransBarber <onboarding@resend.dev>',
        to: [customerEmail],
        subject: `🚚 Pedido Enviado — Rastreio: ${trackingCode}`,
        html: htmlBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend error:', errorData);
      throw new Error(`Resend API error: ${errorData}`);
    }

    const result = await emailResponse.json();

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
