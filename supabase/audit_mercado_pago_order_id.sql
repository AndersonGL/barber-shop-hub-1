-- Auditoria detalhada por order_id (Mercado Pago + webhook)
-- Uso: substitua o valor em target_order_id pelo UUID do pedido

WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_order_id
)

-- 1) Pedido principal
SELECT
  o.id,
  o.user_id,
  o.status,
  o.shipping_status,
  o.payment_method,
  o.total_amount,
  o.shipping_cost,
  o.tracking_code,
  o.created_at,
  o.updated_at
FROM public.orders o
JOIN params p ON o.id = p.target_order_id;

-- 2) Itens do pedido
WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_order_id
)
SELECT
  oi.id,
  oi.order_id,
  oi.product_id,
  pr.name AS product_name,
  oi.quantity,
  oi.price_at_purchase,
  (oi.quantity * oi.price_at_purchase) AS line_total,
  oi.created_at
FROM public.order_items oi
LEFT JOIN public.products pr ON pr.id = oi.product_id
JOIN params p ON oi.order_id = p.target_order_id
ORDER BY oi.created_at ASC;

-- 3) Conferência financeira (itens + frete vs total)
WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_order_id
)
SELECT
  o.id AS order_id,
  o.total_amount,
  o.shipping_cost,
  COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) AS items_total,
  (COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) + o.shipping_cost) AS expected_total,
  (o.total_amount - (COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) + o.shipping_cost)) AS diff
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
JOIN params p ON o.id = p.target_order_id
GROUP BY o.id, o.total_amount, o.shipping_cost;

-- 4) Carrinho do usuário dono do pedido (resíduo)
WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_order_id
), order_owner AS (
  SELECT o.user_id
  FROM public.orders o
  JOIN params p ON o.id = p.target_order_id
)
SELECT
  ci.id,
  ci.user_id,
  ci.product_id,
  p.name AS product_name,
  ci.quantity,
  ci.created_at
FROM public.cart_items ci
LEFT JOIN public.products p ON p.id = ci.product_id
JOIN order_owner oo ON oo.user_id = ci.user_id
ORDER BY ci.created_at DESC;

-- 5) Diagnóstico rápido do cenário esperado
-- approved esperado: status=confirmed, shipping_status=processing e tracking_code preenchido
-- pending esperado:  status=pending
-- rejected esperado: status=cancelled
WITH params AS (
  SELECT '00000000-0000-0000-0000-000000000000'::uuid AS target_order_id
)
SELECT
  o.id,
  o.status,
  o.shipping_status,
  o.tracking_code,
  CASE
    WHEN o.status = 'confirmed' AND o.shipping_status = 'processing' AND COALESCE(o.tracking_code, '') <> ''
      THEN 'OK: fluxo approved consistente'
    WHEN o.status = 'pending'
      THEN 'OK: fluxo pending consistente'
    WHEN o.status = 'cancelled'
      THEN 'OK: fluxo rejected consistente'
    ELSE 'ATENÇÃO: revisar webhook/retorno'
  END AS diagnostic
FROM public.orders o
JOIN params p ON o.id = p.target_order_id;
