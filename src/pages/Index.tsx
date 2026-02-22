import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Truck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import heroImage from '@/assets/hero-banner.jpg';

const CATEGORIES = ['Todos', 'Pomadas', 'Tesouras', 'Pentes', 'Navalhas', 'Barba'];

const Index = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    if (user && !isAdmin) {
      fetchFavorites();
      fetchCartCount();
    }
  }, [user, isAdmin]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
    setFavorites(data?.map(f => f.product_id) || []);
  };

  const fetchCartCount = async () => {
    if (!user) return;
    const { count } = await supabase.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    setCartCount(count || 0);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;
    if (favorites.includes(productId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
      setFavorites(prev => prev.filter(id => id !== productId));
      toast.success('Removido dos favoritos');
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
      setFavorites(prev => [...prev, productId]);
      toast.success('Adicionado aos favoritos');
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) return;
    const product = products.find(p => p.id === productId);
    if (product && product.stock === 0) {
      toast.error('Produto esgotado!');
      return;
    }
    const { data: existing } = await supabase.from('cart_items').select('id, quantity').eq('user_id', user.id).eq('product_id', productId).maybeSingle();
    if (existing) {
      await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 });
    }
    setCartCount(prev => prev + 1);
    toast.success('Produto adicionado ao carrinho!');
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartCount={cartCount} />

      {/* Hero */}
      <section className="relative h-64 md:h-80 overflow-hidden">
        <img src={heroImage} alt="Shopping Barber" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-bold font-display tracking-wider text-gradient-gold mb-2">
            SHOPPING BARBER
          </h1>
          <p className="text-foreground/80 max-w-md">
            Produtos profissionais direto da fábrica para sua barbearia
          </p>
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Truck className="h-4 w-4 text-primary" />
            <span>Entrega via <strong className="text-primary">TransBarber Express</strong> — Integração fictícia</span>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="container mx-auto px-4 -mt-6 relative z-10">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            className="pl-10 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="container mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-gold'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-primary bg-card'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">Nenhum produto encontrado</p>
            {isAdmin && <p className="text-sm mt-2">Vá ao painel admin para adicionar produtos.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onAddToCart={addToCart}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
