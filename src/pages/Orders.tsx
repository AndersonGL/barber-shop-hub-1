import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

type OrderWithItems = {
  id: string;
  created_at: string;
  status: string;
  shipping_status: string;
  total_amount: number;
  payment_method: string;
  tracking_code: string | null;
  order_items: {
    id: string;
    quantity: number;
    price_at_purchase: number;
    products: { name: string; image_url: string | null } | null;
  }[];
};

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pendente',   color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-400',     icon: Package },
  shipped:   { label: 'Enviado',    color: 'bg-primary/20 text-primary',        icon: Truck },
  delivered: { label: 'Entregue',   color: 'bg-green-500/20 text-green-400',    icon: CheckCircle },
};

const STEPS = [
  { key: 'confirmed',  label: 'Confirmado',   icon: Package },
  { key: 'processing', label: 'Em preparo',   icon: Clock },
  { key: 'shipped',    label: 'Enviado',      icon: Truck },
  { key: 'delivered',  label: 'Entregue',     icon: CheckCircle },
];

const stepIndex = (status: string) => {
  if (status === 'delivered') return 3;
  if (status === 'shipped')   return 2;
  if (status === 'processing' || status === 'confirmed') return 1;
  return 0;
};

const paymentLabels: Record<string, string> = {
  pix:       'PIX',
  debit:     'Débito',
  credit_1x: 'Crédito 1x',
  credit_2x: 'Crédito 2x',
};

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, price_at_purchase, products(name, image_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithItems[]) || []);
    setLoading(false);
  };

  const confirmDelivery = async (orderId: string) => {
    if (!confirm('Confirmar que você recebeu o pedido?')) return;
    const { data, error } = await supabase.rpc('confirm_delivery', {
      _order_id: orderId,
    });
    if (error) {
      toast.error(`Erro ao confirmar: ${error.message}`);
      return;
    }
    if (!data) {
      toast.error('Não foi possível confirmar o recebimento.');
      return;
    }
    toast.success('Recebimento confirmado! Obrigado.');
    fetchOrders();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold font-display tracking-wider text-gradient-gold mb-6">MEUS PEDIDOS</h1>

        {loading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="bg-card rounded-lg h-40 animate-pulse" />)}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted" />
            <p>Nenhum pedido ainda</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map(order => {
              const st = statusMap[order.shipping_status] || statusMap[order.status] || statusMap.confirmed;
              const StatusIcon = st.icon;
              const currentStep = stepIndex(order.shipping_status || order.status);

              return (
                <div key={order.id} className="bg-card rounded-xl border border-border animate-fade-in overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <Badge className={st.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {st.label}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center justify-between relative">
                      {/* Line behind icons */}
                      <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-border mx-8" />
                      <div
                        className="absolute left-0 top-3.5 h-0.5 bg-primary transition-all duration-500 mx-8"
                        style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                      />
                      {STEPS.map((step, i) => {
                        const StepIcon = step.icon;
                        const done = i <= currentStep;
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1 z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              done ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'
                            }`}>
                              <StepIcon className="h-3.5 w-3.5" />
                            </div>
                            <span className={`text-[10px] font-medium text-center leading-tight max-w-[52px] ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Items */}
                  {order.order_items?.length > 0 && (
                    <div className="px-5 py-3 border-t border-border">
                      <p className="text-xs text-muted-foreground font-semibold mb-2 uppercase tracking-wide">Itens</p>
                      <div className="space-y-2">
                        {order.order_items.map(item => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.products?.image_url ? (
                              <img src={item.products.image_url} alt={item.products.name} className="w-9 h-9 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.products?.name || 'Produto'}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.quantity}x • R$ {Number(item.price_at_purchase).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tracking code */}
                  {order.tracking_code && (
                    <div className="mx-5 mb-4 mt-1 bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Código de Rastreio</p>
                        <p className="font-mono text-sm font-bold text-foreground">{order.tracking_code}</p>
                      </div>
                    </div>
                  )}

                  {/* Confirm receipt button */}
                  {order.shipping_status === 'shipped' && (
                    <div className="mx-5 mb-4">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-display tracking-wide"
                        onClick={() => confirmDelivery(order.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        CONFIRMAR RECEBIMENTO
                      </Button>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 bg-secondary/30 border-t border-border">
                    <p className="text-xs text-muted-foreground">{paymentLabels[order.payment_method] || order.payment_method}</p>
                    <p className="font-display font-bold text-gradient-gold">R$ {Number(order.total_amount).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;
