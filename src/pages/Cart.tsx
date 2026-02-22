import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Package, Tag, Truck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchCart();
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id);
    setItems((data as CartItemWithProduct[]) || []);
    setLoading(false);
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from('cart_items').update({ quantity: qty }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeItem = async (id: string) => {
    setRemovingId(id);
    await supabase.from('cart_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setRemovingId(null);
    toast.success('Item removido do carrinho');
  };

  const subtotal = items.reduce((sum, i) => sum + Number(i.products.price) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartCount={items.length} />
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display tracking-wider text-gradient-gold">CARRINHO</h1>
            {!loading && items.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-card rounded-xl h-28 animate-pulse" />)}
            </div>
            <div className="bg-card rounded-xl h-64 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-display font-semibold mb-2">Carrinho vazio</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs">
              Você ainda não adicionou nenhum produto. Explore nossa loja e encontre o que precisa.
            </p>
            <Button
              className="bg-gradient-gold text-primary-foreground font-display tracking-wider gap-2"
              onClick={() => navigate('/')}
            >
              VER PRODUTOS
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_340px] gap-6 items-start">

            {/* Items list */}
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex gap-4 bg-card rounded-xl border border-border p-4 transition-all duration-300 animate-fade-in ${removingId === item.id ? 'opacity-40 scale-95' : 'hover:border-primary/30 hover:shadow-sm'}`}
                >
                  {/* Product image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {item.products.image_url ? (
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {item.products.category && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/80 bg-primary/10 px-2 py-0.5 rounded mb-1">
                        <Tag className="h-2.5 w-2.5" />
                        {item.products.category}
                      </span>
                    )}
                    <h3 className="font-display font-semibold text-sm sm:text-base leading-tight break-words line-clamp-2">
                      {item.products.name}
                    </h3>
                    <p className="text-base font-bold text-primary mt-1">
                      R$ {Number(item.products.price).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Subtotal: <span className="text-foreground font-semibold">R$ {(Number(item.products.price) * item.quantity).toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0">
                    {/* Qty control */}
                    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-card transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-md hover:bg-destructive/10"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Continue shopping */}
              <button
                onClick={() => navigate('/')}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors py-3 flex items-center justify-center gap-2 border border-dashed border-border rounded-xl hover:border-primary/40"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Continuar comprando
              </button>
            </div>

            {/* Order summary */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="font-display font-semibold text-sm tracking-wide uppercase">Resumo do Pedido</h2>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Per-item breakdown */}
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                      <span className="truncate max-w-[160px]">{item.products.name} ×{item.quantity}</span>
                      <span className="font-medium text-foreground flex-shrink-0 ml-2">
                        R$ {(Number(item.products.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      Frete
                    </span>
                    <span className="text-xs text-muted-foreground italic">Calculado no checkout</span>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-display font-bold tracking-wide">TOTAL</span>
                    <span className="text-xl font-bold text-gradient-gold">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 text-right">+ frete calculado no próximo passo</p>
                </div>

                <Button
                  className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider mt-2 gap-2 h-12 text-sm"
                  onClick={() => navigate('/checkout')}
                >
                  FINALIZAR COMPRA
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Trust badges */}
              <div className="px-5 py-3 bg-secondary/30 border-t border-border">
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">🔒 Pagamento seguro</span>
                  <span className="flex items-center gap-1">🚚 Entrega garantida</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
