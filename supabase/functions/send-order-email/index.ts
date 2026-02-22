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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { orderId, customerEmail, customerName, items, total, shipping, trackingCode, paymentMethod } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Admin email: use env var or fallback to hardcoded
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'gouveialignelli@gmail.com';

    const paymentLabels: Record<string, string> = {
      pix: 'PIX',
      debit: 'Cartão de Débito',
      credit_1x: 'Cartão de Crédito (1x)',
      credit_12x: 'Cartão de Crédito (12x)',
    };

    const itemsHtml = items.map((item: { name: string; quantity: number; price: number }) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0;">${item.name}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: right;">R$ ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    // ─── Customer email HTML ─────────────────────────────────────────────────
    const customerHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido Confirmado - TransBarber</title>
</head>
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

          <!-- Success banner -->
          <tr>
            <td style="background-color: #111; padding: 30px 40px; text-align: center; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <div style="display: inline-block; background: rgba(201,162,39,0.12); border: 1px solid #c9a227; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px; margin-bottom: 16px;">✓</div>
              <h2 style="margin: 0 0 8px; font-size: 22px; color: #fff; letter-spacing: 3px; text-transform: uppercase;">Pedido Confirmado!</h2>
              <p style="margin: 0; color: #888; font-size: 14px;">Obrigado pela sua compra, ${customerName}!</p>
            </td>
          </tr>

          <!-- Order info -->
          <tr>
            <td style="background-color: #111; padding: 0 40px 20px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #2a2a2a;">
                    <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">Código do Pedido</p>
                    <p style="margin: 4px 0 0; font-size: 18px; color: #fff; font-weight: bold; letter-spacing: 2px;">#${trackingCode}</p>
                  </td>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #2a2a2a; text-align: right;">
                    <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">Pagamento</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #e0e0e0;">${paymentLabels[paymentMethod] || paymentMethod}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items table -->
          <tr>
            <td style="background-color: #111; padding: 0 40px 20px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <h3 style="margin: 0 0 12px; font-size: 11px; letter-spacing: 3px; color: #c9a227; text-transform: uppercase;">Itens do Pedido</h3>
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
                  <tr style="background: #222;">
                    <td colspan="2" style="padding: 12px 8px; color: #888; font-size: 13px;">Frete</td>
                    <td style="padding: 12px 8px; color: #e0e0e0; text-align: right; font-size: 13px;">R$ ${Number(shipping).toFixed(2)}</td>
                  </tr>
                  <tr style="background: rgba(201,162,39,0.08); border-top: 1px solid #c9a227;">
                    <td colspan="2" style="padding: 14px 8px; color: #c9a227; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Total</td>
                    <td style="padding: 14px 8px; color: #c9a227; text-align: right; font-size: 18px; font-weight: bold;">R$ ${Number(total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Status info -->
          <tr>
            <td style="background-color: #111; padding: 0 40px 30px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <div style="background: rgba(201,162,39,0.08); border: 1px solid rgba(201,162,39,0.3); border-radius: 8px; padding: 16px 20px;">
                <p style="margin: 0 0 6px; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">🚚 Status do Envio</p>
                <p style="margin: 0; color: #e0e0e0; font-size: 14px;">Seu pedido está sendo processado. Você receberá um email com o código de rastreio assim que for enviado. Acompanhe também em <strong style="color: #c9a227;">Meus Pedidos</strong> no app.</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-bottom: 3px solid #c9a227; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #555;">Dúvidas? Entre em contato conosco.</p>
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">TransBarber ✦ Supply Premium</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ─── Admin email HTML ────────────────────────────────────────────────────
    const adminItemsHtml = items.map((item: { name: string; quantity: number; price: number }) => `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0;">${item.name}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #2a2a2a; color: #e0e0e0; text-align: right;">R$ ${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const adminHtml = `
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
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-top: 3px solid #c9a227; border-radius: 12px 12px 0 0; padding: 30px 40px 20px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 4px; color: #c9a227; text-transform: uppercase;">✦ Admin ✦</p>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #fff; letter-spacing: 4px; text-transform: uppercase;">NOVO PEDIDO RECEBIDO</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #111; padding: 30px 40px; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #2a2a2a;">
                    <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">Cliente</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #fff; font-weight: bold;">${customerName}</p>
                    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">${customerEmail}</p>
                  </td>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #2a2a2a; text-align: right;">
                    <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">Pedido #</p>
                    <p style="margin: 4px 0 0; font-size: 16px; color: #fff; font-weight: bold; font-family: monospace;">${trackingCode}</p>
                    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">${paymentLabels[paymentMethod] || paymentMethod}</p>
                  </td>
                </tr>
              </table>

              <h3 style="margin: 0 0 10px; font-size: 11px; letter-spacing: 3px; color: #c9a227; text-transform: uppercase;">Itens</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #222;">
                    <th style="padding: 10px 8px; text-align: left; font-size: 11px; color: #888; font-weight: normal;">Produto</th>
                    <th style="padding: 10px 8px; text-align: center; font-size: 11px; color: #888; font-weight: normal;">Qtd</th>
                    <th style="padding: 10px 8px; text-align: right; font-size: 11px; color: #888; font-weight: normal;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${adminItemsHtml}
                  <tr style="background: rgba(201,162,39,0.08);">
                    <td colspan="2" style="padding: 12px 8px; color: #c9a227; font-size: 14px; font-weight: bold;">TOTAL</td>
                    <td style="padding: 12px 8px; color: #c9a227; text-align: right; font-size: 18px; font-weight: bold;">R$ ${Number(total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div style="background: rgba(201,162,39,0.08); border: 1px solid rgba(201,162,39,0.3); border-radius: 8px; padding: 14px 18px; text-align: center;">
                <p style="margin: 0; color: #c9a227; font-size: 13px;">Acesse o painel admin para processar e enviar este pedido.</p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-bottom: 3px solid #c9a227; border-radius: 0 0 12px 12px; padding: 18px 40px; text-align: center; border-left: 1px solid #2a2a2a; border-right: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 11px; letter-spacing: 2px; color: #c9a227; text-transform: uppercase;">TransBarber ✦ Admin</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ─── Send customer email ─────────────────────────────────────────────────
    const customerEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TransBarber <onboarding@resend.dev>',
        to: [customerEmail],
        subject: `✅ Pedido #${trackingCode} confirmado — TransBarber`,
        html: customerHtml,
      }),
    });

    if (!customerEmailRes.ok) {
      const errorData = await customerEmailRes.text();
      console.error('Resend customer email error:', errorData);
    }

    // ─── Send admin notification email ───────────────────────────────────────
    const adminEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TransBarber <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject: `🛒 Novo Pedido #${trackingCode} — ${customerName} — R$ ${Number(total).toFixed(2)}`,
        html: adminHtml,
      }),
    });

    if (!adminEmailRes.ok) {
      const errorData = await adminEmailRes.text();
      console.error('Resend admin email error:', errorData);
    }

    const result = await customerEmailRes.json().catch(() => ({}));

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
