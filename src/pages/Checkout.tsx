import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, CheckCircle, MapPin, Truck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

const paymentMethods = [
  { id: 'pix', label: 'PIX', icon: QrCode, description: 'Pagamento instantâneo' },
  { id: 'debit', label: 'Débito', icon: Banknote, description: 'Cartão de débito' },
  { id: 'credit_1x', label: 'Crédito 1x', icon: CreditCard, description: 'Sem juros' },
  { id: 'credit_12x', label: 'Crédito 12x', icon: CreditCard, description: 'Com juros' },
];

// Simulated shipping calculation based on CEP region
const calculateShippingByCep = (cep: string): { cost: number; days: number; region: string } => {
  const prefix = parseInt(cep.substring(0, 2), 10);
  // SP capital / Grande SP
  if (prefix >= 1 && prefix <= 9) return { cost: 12.90, days: 2, region: 'São Paulo - Capital' };
  // SP interior
  if (prefix >= 10 && prefix <= 19) return { cost: 18.90, days: 3, region: 'São Paulo - Interior' };
  // RJ
  if (prefix >= 20 && prefix <= 28) return { cost: 22.90, days: 4, region: 'Rio de Janeiro' };
  // ES
  if (prefix >= 29 && prefix <= 29) return { cost: 24.90, days: 4, region: 'Espírito Santo' };
  // MG
  if (prefix >= 30 && prefix <= 39) return { cost: 22.90, days: 4, region: 'Minas Gerais' };
  // BA / SE
  if (prefix >= 40 && prefix <= 49) return { cost: 32.90, days: 6, region: 'Bahia / Sergipe' };
  // PE / AL / PB / RN
  if (prefix >= 50 && prefix <= 59) return { cost: 35.90, days: 7, region: 'Nordeste' };
  // CE / PI / MA / PA / AP / AM / RR / AC / RO
  if (prefix >= 60 && prefix <= 69) return { cost: 38.90, days: 8, region: 'Norte / Nordeste' };
  // DF / GO / TO / MT / MS
  if (prefix >= 70 && prefix <= 79) return { cost: 28.90, days: 5, region: 'Centro-Oeste' };
  // PR / SC / RS
  if (prefix >= 80 && prefix <= 99) return { cost: 25.90, days: 5, region: 'Sul' };
  return { cost: 35.00, days: 7, region: 'Brasil' };
};

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{ cost: number; days: number; region: string } | null>(null);
  const [customerAddress, setCustomerAddress] = useState<{ cep: string; street: string; number: string; city: string; state: string; neighborhood: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchAddress();
    }
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase.from('cart_items').select('*, products(*)').eq('user_id', user.id);
    setItems((data as CartItemWithProduct[]) || []);
  };

  const fetchAddress = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('cep, street, number, city, state, neighborhood').eq('user_id', user.id).maybeSingle();
    if (data?.cep) {
      setCustomerAddress(data as any);
      const info = calculateShippingByCep(data.cep);
      setShippingInfo(info);
    }
  };

  const subtotal = items.reduce((sum, i) => sum + Number(i.products.price) * i.quantity, 0);
  const shipping = shippingInfo ? shippingInfo.cost : items.reduce((sum, i) => sum + Number(i.products.shipping_cost), 0);
  const total = subtotal + shipping;

  const handleCheckout = async () => {
    if (!user || !selectedPayment) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }
    setLoading(true);

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: user.id,
      total_amount: total,
      shipping_cost: shipping,
      payment_method: selectedPayment,
      status: 'confirmed',
      shipping_status: 'processing',
      tracking_code: `TB${Date.now().toString(36).toUpperCase()}`,
    }).select().single();

    if (orderError || !order) {
      toast.error('Erro ao criar pedido');
      setLoading(false);
      return;
    }

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: Number(item.products.price),
    }));
    await supabase.from('order_items').insert(orderItems);
    await supabase.from('cart_items').delete().eq('user_id', user.id);

    // Send order confirmation email
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token && user.email) {
        const emailItems = items.map(item => ({
          name: item.products.name,
          quantity: item.quantity,
          price: Number(item.products.price),
        }));

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: order.id,
            customerEmail: user.email,
            customerName: profile?.company_name || 'Cliente',
            items: emailItems,
            total,
            shipping,
            trackingCode: order.tracking_code,
            paymentMethod: selectedPayment,
          }),
        });
      }
    } catch (emailError) {
      // Email error is non-blocking — order is already confirmed
      console.error('Email sending failed:', emailError);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
          <CheckCircle className="h-20 w-20 text-primary mb-6" />
          <h1 className="text-3xl font-bold font-display tracking-wider text-gradient-gold mb-4">PEDIDO CONFIRMADO!</h1>
          <p className="text-muted-foreground mb-2">Seu pedido foi realizado com sucesso.</p>
          <p className="text-sm text-muted-foreground mb-6">Acompanhe o envio via TransBarber Express nos seus pedidos.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/orders')}>Ver Pedidos</Button>
            <Button className="bg-gradient-gold text-primary-foreground" onClick={() => navigate('/')}>Continuar Comprando</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <h1 className="text-2xl font-bold font-display tracking-wider text-gradient-gold mb-6">CHECKOUT</h1>

        <div className="space-y-4">
          {/* Delivery address */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Endereço de Entrega
            </h2>
            {customerAddress ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{customerAddress.street}, {customerAddress.number}</p>
                <p>{customerAddress.neighborhood} - {customerAddress.city}/{customerAddress.state}</p>
                <p>CEP: {customerAddress.cep?.replace(/(\d{5})(\d{3})/, '$1-$2')}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Endereço não cadastrado. <button onClick={() => navigate('/profile')} className="text-primary underline">Atualize seu perfil</button> para calcular o frete.
              </p>
            )}
          </div>

          {/* Shipping info */}
          {shippingInfo && (
            <div className="bg-card rounded-lg p-4 border border-primary/30 bg-primary/5">
              <h2 className="font-display font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Frete TransBarber Express
              </h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Região: {shippingInfo.region}</span>
                <span className="font-semibold">R$ {shippingInfo.cost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Prazo estimado: {shippingInfo.days} dias úteis</p>
            </div>
          )}

          {/* Order summary */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="font-display font-semibold mb-3">Resumo ({items.length} itens)</h2>
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{item.products.name} x{item.quantity}</span>
                <span>R$ {(Number(item.products.price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border mt-3 pt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span>R$ {shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span className="font-display">TOTAL</span>
              <span className="text-gradient-gold">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="font-display font-semibold mb-3">Forma de Pagamento</h2>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPayment(pm.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPayment === pm.id
                      ? 'border-primary bg-primary/10 shadow-gold'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <pm.icon className={`h-6 w-6 mb-2 ${selectedPayment === pm.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-display text-sm font-semibold">{pm.label}</p>
                  <p className="text-xs text-muted-foreground">{pm.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider"
            disabled={loading || !selectedPayment}
            onClick={handleCheckout}
          >
            {loading ? 'Processando...' : 'CONFIRMAR PEDIDO'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
