import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import ProductCard from '@/components/ProductCard';
import type { Tables } from '@/integrations/supabase/types';

const Favorites = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    const { data: favs } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
    const ids = favs?.map(f => f.product_id) || [];
    setFavoriteIds(ids);
    if (ids.length > 0) {
      const { data: prods } = await supabase.from('products').select('*').in('id', ids);
      setProducts(prods || []);
    }
    setLoading(false);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    setFavoriteIds(prev => prev.filter(id => id !== productId));
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const addToCart = async (productId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from('cart_items').select('id, quantity').eq('user_id', user.id).eq('product_id', productId).maybeSingle();
    if (existing) {
      await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold font-display tracking-wider text-gradient-gold mb-6">FAVORITOS</h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-card rounded-lg h-72 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">Nenhum favorito ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} isFavorite={true} onToggleFavorite={toggleFavorite} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;
