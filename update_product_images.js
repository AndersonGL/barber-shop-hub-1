import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wjktlktslzfdelzavash.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa3Rsa3RzbHpmZGVsemF2YXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzM4NjksImV4cCI6MjA4Njk0OTg2OX0.TLbcQEvomeGR8padyfrW62OVVtPXgkeIBTYaWg-PvdE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Professional, unique images for each product type
const imagesByKeyword = [
  // Pomadas / Hair pomade / styling products
  {
    keywords: ['pomada', 'cera', 'gel', 'modelador', 'matte', 'brilho'],
    images: [
      'https://images.unsplash.com/photo-1512864084360-7c0d4d2c1a8e?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599751449628-598bc3d3f4a1?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Tesouras / Scissors
  {
    keywords: ['tesoura', 'scissors'],
    images: [
      'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1622296119508-d8ca5c4e4dad?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Pentes / Combs
  {
    keywords: ['pente', 'comb'],
    images: [
      'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617781052027-a95c28a7c22f?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Navalhas / Razors / Shaving
  {
    keywords: ['navalha', 'razor', 'shave', 'barba', 'lâmina', 'gillette'],
    images: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1621607505487-5fd6e5d6e26a?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Máquinas / Clippers
  {
    keywords: ['máquina', 'maquina', 'clipper', 'aparador', 'trimmer'],
    images: [
      'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Perfumes / Colônias
  {
    keywords: ['perfume', 'colônia', 'colonia', 'fragrância', 'loção', 'locao'],
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=500&auto=format&fit=crop&q=80',
    ]
  },
  // Toalhas / Towels
  {
    keywords: ['toalha', 'towel'],
    images: [
      'https://images.unsplash.com/photo-1645042484989-4d35fb4c3a52?w=500&auto=format&fit=crop&q=80',
    ]
  },
];

function findBestImage(productName, productCategory, usedImages) {
  const nameLower = productName.toLowerCase();
  const catLower = (productCategory || '').toLowerCase();

  for (const group of imagesByKeyword) {
    if (group.keywords.some(kw => nameLower.includes(kw) || catLower.includes(kw))) {
      const available = group.images.filter(img => !usedImages.has(img));
      if (available.length > 0) {
        return available[0];
      }
      // All used, pick first anyway (differentiate by rotation)
      return group.images[usedImages.size % group.images.length];
    }
  }

  // Fallback general barber images
  const fallbacks = [
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80',
  ];
  const available = fallbacks.filter(img => !usedImages.has(img));
  return available.length > 0 ? available[0] : fallbacks[0];
}

async function updateProductImages() {
  console.log("Logging in...");
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@barber.shop',
    password: 'password123',
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Fetching all products...");
  const { data: products, error } = await supabase.from('products').select('id, name, category, image_url');

  if (error) {
    console.error("Failed to fetch products:", error.message);
    return;
  }

  console.log(`Found ${products.length} products.`);

  const usedImages = new Set();
  
  for (const product of products) {
    const newImage = findBestImage(product.name, product.category, usedImages);
    usedImages.add(newImage);

    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: newImage })
      .eq('id', product.id);

    if (updateError) {
      console.error(`Failed to update ${product.name}:`, updateError.message);
    } else {
      console.log(`Updated: ${product.name} -> ${newImage}`);
    }
  }

  console.log("Done! All product images updated.");
}

updateProductImages();
