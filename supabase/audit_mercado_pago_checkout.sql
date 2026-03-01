-- Auditoria rápida da integração Mercado Pago + webhook
-- Execute no SQL Editor do Supabase

-- 1) Últimos pedidos (visão geral)
SELECT
  id,
  user_id,
  status,
  shipping_status,
  payment_method,
  total_amount,
  shipping_cost,
  tracking_code,
  created_at,
  updated_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 20;

-- 2) Distribuição de status dos últimos 7 dias
SELECT
  status,
  shipping_status,
  COUNT(*) AS total
FROM public.orders
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY status, shipping_status
ORDER BY total DESC;

-- 3) Pedidos confirmados sem rastreio (inconsistência)
SELECT
  id,
  user_id,
  status,
  shipping_status,
  tracking_code,
  created_at
FROM public.orders
WHERE status = 'confirmed'
  AND (tracking_code IS NULL OR tracking_code = '')
ORDER BY created_at DESC;

-- 4) Pedidos cancelados que foram enviados (inconsistência)
SELECT
  id,
  user_id,
  status,
  shipping_status,
  created_at
FROM public.orders
WHERE status = 'cancelled'
  AND shipping_status IN ('processing', 'shipped', 'delivered')
ORDER BY created_at DESC;

-- 5) Pedidos pendentes antigos (podem indicar webhook não processado)
SELECT
  id,
  user_id,
  status,
  shipping_status,
  created_at,
  NOW() - created_at AS age
FROM public.orders
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC;

-- 6) Itens por pedido (sanidade de total)
SELECT
  o.id AS order_id,
  o.total_amount,
  o.shipping_cost,
  COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) AS items_total,
  (COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) + o.shipping_cost) AS expected_total,
  (o.total_amount - (COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0) + o.shipping_cost)) AS diff
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.total_amount, o.shipping_cost
ORDER BY o.created_at DESC
LIMIT 50;

-- 7) Carrinho residual de usuários com pedido confirmado recente
SELECT
  o.user_id,
  o.id AS order_id,
  o.status,
  o.created_at,
  COUNT(ci.id) AS cart_items_count
FROM public.orders o
LEFT JOIN public.cart_items ci ON ci.user_id = o.user_id
WHERE o.status = 'confirmed'
  AND o.created_at >= NOW() - INTERVAL '1 day'
GROUP BY o.user_id, o.id, o.status, o.created_at
HAVING COUNT(ci.id) > 0
ORDER BY o.created_at DESC;

-- 8) Filtro por cenário (troque os valores para validar caso específico)
-- Exemplo: últimos pedidos aprovados/confirmados
SELECT
  id,
  user_id,
  status,
  shipping_status,
  payment_method,
  tracking_code,
  created_at
FROM public.orders
WHERE status IN ('confirmed', 'pending', 'cancelled')
ORDER BY created_at DESC
LIMIT 30;
