import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, QrCode, Banknote, CheckCircle, MapPin, Truck } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type CartItemWithProduct = Tables<'cart_items'> & { products: Tables<'products'> };

type ShippingInfo = {
  cost: number;
  days: number;
  serviceName: string;
  carrierName: string;
};

const paymentMethods = [
  { id: 'pix', label: 'PIX', icon: QrCode, description: 'Pagamento instantâneo via Mercado Pago' },
  { id: 'debit', label: 'Débito', icon: Banknote, description: 'Cartão de débito via Mercado Pago' },
  { id: 'credit_1x', label: 'Crédito 1x', icon: CreditCard, description: 'Cartão de crédito à vista' },
  { id: 'credit_12x', label: 'Crédito 12x', icon: CreditCard, description: 'Cartão de crédito parcelado' },
];

const calculateShippingFallback = (cep: string): ShippingInfo => {
  const prefix = parseInt(cep.substring(0, 2), 10);
  if (prefix >= 1 && prefix <= 9) return { cost: 12.9, days: 2, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 10 && prefix <= 19) return { cost: 18.9, days: 3, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 20 && prefix <= 28) return { cost: 22.9, days: 4, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 29 && prefix <= 29) return { cost: 24.9, days: 4, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 30 && prefix <= 39) return { cost: 22.9, days: 4, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 40 && prefix <= 49) return { cost: 32.9, days: 6, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 50 && prefix <= 59) return { cost: 35.9, days: 7, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 60 && prefix <= 69) return { cost: 38.9, days: 8, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 70 && prefix <= 79) return { cost: 28.9, days: 5, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  if (prefix >= 80 && prefix <= 99) return { cost: 25.9, days: 5, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
  return { cost: 35, days: 7, serviceName: 'Mercado Envios', carrierName: 'Mercado Envios' };
};

const Checkout = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItemWithProduct[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [customerAddress, setCustomerAddress] = useState<{
    cep: string;
    street: string;
    number: string;
    city: string;
    state: string;
    neighborhood: string;
  } | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.products.price) * item.quantity, 0),
    [items],
  );
  const shipping = shippingInfo ? shippingInfo.cost : 0;
  const total = subtotal + shipping;

  useEffect(() => {
    if (!user) return;
    fetchCart();
    fetchAddress();
  }, [user]);

  useEffect(() => {
    if (!customerAddress?.cep) return;
    quoteShipping(customerAddress.cep);
  }, [customerAddress?.cep, subtotal]);

  useEffect(() => {
    if (!user) return;
    handleMercadoPagoReturn();
  }, [user]);

  const getToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token || null;
  };

  const invokeEdgeFunction = async (name: string, body: Record<string, unknown>) => {
    const token = await getToken();
    if (!token) throw new Error('Sessão inválida');

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const baseUrl = projectId
      ? `https://${projectId}.supabase.co`
      : supabaseUrl;

    if (!baseUrl) {
      throw new Error('Configuração inválida: VITE_SUPABASE_PROJECT_ID/VITE_SUPABASE_URL ausente.');
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error(`Falha de conexão com a função ${name}. Verifique deploy/permissão no Supabase.`);
    }

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Função ${name} não encontrada no Supabase (deploy pendente).`);
      }

      throw new Error(data?.error || `Erro na função ${name}`);
    }

    return data;
  };

  const fetchCart = async () => {
    if (!user) return;
    const { data } = await supabase.from('cart_items').select('*, products(*)').eq('user_id', user.id);
    setItems((data as CartItemWithProduct[]) || []);
  };

  const fetchAddress = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('cep, street, number, city, state, neighborhood')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.cep) {
      setCustomerAddress(data as any);
    }
  };

  const quoteShipping = async (cep: string) => {
    setShippingLoading(true);

    try {
      const data = await invokeEdgeFunction('mercado-envios-quote', {
        cep,
        declaredValue: Number(subtotal.toFixed(2)),
      });

      setShippingInfo({
        cost: Number(data.shippingCost || 0),
        days: Number(data.shippingDays || 0),
        serviceName: data.serviceName || 'Mercado Envios',
        carrierName: data.carrierName || data.serviceName || 'Mercado Envios',
      });
    } catch (error) {
      console.error('Falha ao consultar Mercado Envios:', error);
      const fallback = calculateShippingFallback(cep);
      setShippingInfo(fallback);
      toast.warning('Mercado Envios indisponível no momento. Frete estimado aplicado.');
    } finally {
      setShippingLoading(false);
    }
  };

  const sendOrderConfirmationEmail = async (
    orderId: string,
    paymentMethod: string,
    trackingCode: string,
    shippingCost: number,
  ) => {
    if (!user?.email) return;

    try {
      const token = await getToken();
      if (!token) return;

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, price_at_purchase, products(name)')
        .eq('order_id', orderId);

      const itemsForEmail = (orderItems || []).map((item: any) => ({
        name: item.products?.name || 'Produto',
        quantity: item.quantity,
        price: Number(item.price_at_purchase),
      }));

      const totalAmount = itemsForEmail.reduce((sum, item) => sum + item.price * item.quantity, 0) + shippingCost;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      await fetch(`https://${projectId}.supabase.co/functions/v1/send-order-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          customerEmail: user.email,
          customerName: profile?.company_name || 'Cliente',
          items: itemsForEmail,
          total: totalAmount,
          shipping: shippingCost,
          trackingCode,
          paymentMethod,
        }),
      });
    } catch (error) {
      console.error('Falha ao enviar email de confirmação:', error);
    }
  };

  const handleMercadoPagoReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const orderId = params.get('order_id');

    if (!paymentStatus || !orderId || returnProcessing) return;

    setReturnProcessing(true);

    try {
      if (paymentStatus === 'approved') {
        const trackingCode = `TB${Date.now().toString(36).toUpperCase()}`;

        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'confirmed',
            shipping_status: 'processing',
            tracking_code: trackingCode,
          })
          .eq('id', orderId)
          .eq('user_id', user?.id || '')
          .select('id, payment_method, shipping_cost')
          .single();

        if (updateError || !updatedOrder) {
          throw new Error('Não foi possível confirmar o pedido após pagamento aprovado.');
        }

        await supabase.from('cart_items').delete().eq('user_id', user?.id || '');

        await sendOrderConfirmationEmail(
          updatedOrder.id,
          updatedOrder.payment_method,
          trackingCode,
          Number(updatedOrder.shipping_cost),
        );

        await fetchCart();
        setSuccess(true);
        toast.success('Pagamento aprovado! Pedido confirmado com sucesso.');
      } else if (paymentStatus === 'pending') {
        toast.message('Pagamento pendente. Assim que aprovado, seu pedido será atualizado.');
      } else {
        toast.error('Pagamento não aprovado. Tente novamente com outro meio de pagamento.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar retorno do pagamento.');
    } finally {
      window.history.replaceState({}, document.title, '/checkout');
      setReturnProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!user || !selectedPayment) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    if (!customerAddress?.cep) {
      toast.error('Cadastre um endereço antes de continuar');
      return;
    }

    if (!shippingInfo) {
      toast.error('Aguarde o cálculo de frete para continuar');
      return;
    }

    if (!items.length) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    setLoading(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          shipping_cost: shipping,
          payment_method: selectedPayment,
          status: 'pending',
          shipping_status: 'pending',
          tracking_code: null,
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error('Erro ao criar pedido');
      }

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: Number(item.products.price),
      }));

      const { error: orderItemsError } = await supabase.from('order_items').insert(orderItems);
      if (orderItemsError) {
        throw new Error('Erro ao criar itens do pedido');
      }

      const preferenceData = await invokeEdgeFunction('mercado-pago-create-preference', {
        orderId: order.id,
        items: items.map((item) => ({
          title: item.products.name,
          quantity: item.quantity,
          unit_price: Number(item.products.price),
          currency_id: 'BRL',
        })),
        shippingCost: shipping,
        payerEmail: user.email,
        paymentMethod: selectedPayment,
      });

      const redirectUrl = preferenceData.initPoint || preferenceData.sandboxInitPoint;
      if (!redirectUrl) {
        throw new Error('Mercado Pago não retornou URL de pagamento');
      }

      window.location.href = redirectUrl;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar pagamento');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center animate-fade-in">
          <CheckCircle className="h-20 w-20 text-primary mb-6" />
          <h1 className="text-3xl font-bold font-display tracking-wider text-gradient-gold mb-4">PAGAMENTO APROVADO!</h1>
          <p className="text-muted-foreground mb-2">Seu pedido foi confirmado com sucesso.</p>
          <p className="text-sm text-muted-foreground mb-6">Você pode acompanhar o envio em Meus Pedidos.</p>
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

          {shippingInfo && (
            <div className="bg-card rounded-lg p-4 border border-primary/30 bg-primary/5">
              <h2 className="font-display font-semibold mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" /> Frete via Mercado Envios
              </h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transportadora: {shippingInfo.carrierName}</span>
                <span className="font-semibold">R$ {shippingInfo.cost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Prazo estimado: {shippingInfo.days || 0} dias úteis</p>
            </div>
          )}

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
              <span>{shippingLoading ? 'Calculando...' : `R$ ${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span className="font-display">TOTAL</span>
              <span className="text-gradient-gold">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="font-display font-semibold mb-3">Forma de Pagamento (Mercado Pago)</h2>
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
            disabled={loading || returnProcessing || !selectedPayment || shippingLoading || !shippingInfo}
            onClick={handleCheckout}
          >
            {loading ? 'Redirecionando para Mercado Pago...' : 'PAGAR COM MERCADO PAGO'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
