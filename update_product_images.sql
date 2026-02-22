-- Cole este SQL no Supabase SQL Editor e clique em Run
-- Atribui 1 foto única e profissional para cada produto, sem repetição

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM public.products
),
image_map AS (
  SELECT * FROM (VALUES
    (1,  'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&auto=format&fit=crop&q=80'),  -- pomada pote preto
    (2,  'https://images.unsplash.com/photo-1590439471364-192aa70c0b53?w=600&auto=format&fit=crop&q=80'),  -- tesoura barbeiro
    (3,  'https://images.unsplash.com/photo-1614744784804-a6f1e7c218da?w=600&auto=format&fit=crop&q=80'),  -- navalha aço
    (4,  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&auto=format&fit=crop&q=80'),  -- máquina de corte
    (5,  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=600&auto=format&fit=crop&q=80'),  -- pente madeira
    (6,  'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80'),  -- frasco de perfume âmbar
    (7,  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=600&auto=format&fit=crop&q=80'),  -- pomada modeladora branca
    (8,  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&auto=format&fit=crop&q=80'),  -- tesoura profissional
    (9,  'https://images.unsplash.com/photo-1621607505487-5fd6e5d6e26a?w=600&auto=format&fit=crop&q=80'),  -- navalha de barba
    (10, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop&q=80'),  -- máquina clipper
    (11, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&auto=format&fit=crop&q=80'),  -- pente e escova
    (12, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80')   -- produto de barba geral
  ) AS t(rn, url)
)
UPDATE public.products p
SET image_url = im.url
FROM ranked r
JOIN image_map im ON r.rn = im.rn
WHERE p.id = r.id;

-- Confirma resultado
SELECT name, image_url FROM public.products ORDER BY created_at ASC;
