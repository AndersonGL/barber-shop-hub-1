import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wjktlktslzfdelzavash.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa3Rsa3RzbHpmZGVsemF2YXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzM4NjksImV4cCI6MjA4Njk0OTg2OX0.TLbcQEvomeGR8padyfrW62OVVtPXgkeIBTYaWg-PvdE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const products = [
  {
    name: 'Pomada Modeladora (Matte)',
    description: 'Alta fixação e efeito seco para penteados modernos.',
    price: 45.00,
    category: 'Pomadas',
    stock: 50,
    shipping_cost: 15.00,
    image_url: 'https://images.unsplash.com/photo-1626312429447-e116082463e7?w=500&auto=format&fit=crop&q=60' // Example
  },
  {
    name: 'Tesoura Profissional 6.0',
    description: 'Aço japonês 440C, corte preciso e durável.',
    price: 120.00,
    category: 'Equipamentos',
    stock: 10,
    shipping_cost: 0,
    image_url: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500&auto=format&fit=crop&q=60'
  },
  {
    name: 'Pente de Carbono',
    description: 'Antiestático e resistente ao calor.',
    price: 25.00,
    category: 'Acessórios',
    stock: 100,
    shipping_cost: 10.00,
    image_url: 'https://images.unsplash.com/photo-1632515053158-9d41d996cb07?w=500&auto=format&fit=crop&q=60'
  },
  {
    name: 'Navalha de Aço Inoxidável',
    description: 'Ideal para acabamentos e barbas desenhadas.',
    price: 85.00,
    category: 'Equipamentos',
    stock: 20,
    shipping_cost: 12.00,
    image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=60'
  }
];

async function seedProducts() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@barber.shop',
    password: 'password123',
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Login successful. Adding products...");

  for (const product of products) {
    const { error } = await supabase.from('products').insert(product);
    if (error) {
      console.error(`Failed to add ${product.name}:`, error.message);
    } else {
      console.log(`Added: ${product.name}`);
    }
  }
  
  console.log("Seeding complete.");
}

seedProducts();
