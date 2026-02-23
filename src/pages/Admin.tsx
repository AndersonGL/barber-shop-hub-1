import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Package,
  Truck,
  Send,
  CheckCircle,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Admin = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"products"> | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Shipping dialog
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [sendingShipping, setSendingShipping] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name))")
      .order("created_at", { ascending: false });

    // Fetch profiles for each unique user
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((o) => o.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, company_name, email")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      data.forEach((o: any) => {
        o.profile = profileMap.get(o.user_id) || null;
      });
    }
    setOrders(data || []);
    setOrdersLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", category: "", stock: "" });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Tables<"products">) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      category: p.category || "",
      stock: String(p.stock),
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    setSaving(true);

    let image_url = editing?.image_url || null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile);
      if (uploadError) {
        toast.error("Erro ao enviar imagem");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category || null,
      stock: parseInt(form.stock) || 0,
      image_url,
    };

    if (editing) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Produto atualizado!");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) toast.error("Erro ao criar produto");
      else toast.success("Produto criado!");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto excluído");
    fetchProducts();
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;

    const { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);

    if (itemsError) {
      toast.error(`Erro ao excluir itens do pedido: ${itemsError.message}`);
      return;
    }

    const { error: orderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (orderError) {
      toast.error(`Erro ao excluir pedido: ${orderError.message}`);
      return;
    }

    toast.success("Pedido excluído com sucesso!");
    fetchOrders();
  };

  const handleMarkAsDelivered = async (id: string) => {
    if (!confirm("Marcar pedido como entregue?")) return;
    const { error } = await supabase
      .from("orders")
      .update({ shipping_status: "delivered" })
      .eq("id", id);
    if (error) {
      toast.error(`Erro ao atualizar pedido: ${error.message}`);
      return;
    }
    toast.success("Pedido marcado como entregue!");
    fetchOrders();
  };

  const openShippingDialog = (order: any) => {
    setSelectedOrder(order);
    setTrackingCode(order.tracking_code || "");
    setShippingDialogOpen(true);
  };

  const handleMarkAsShipped = async () => {
    if (!selectedOrder || !trackingCode.trim()) {
      toast.error("Informe o código de rastreio");
      return;
    }
    setSendingShipping(true);

    const { error } = await supabase
      .from("orders")
      .update({
        shipping_status: "shipped",
        tracking_code: trackingCode.trim(),
      })
      .eq("id", selectedOrder.id);

    if (error) {
      toast.error("Erro ao atualizar pedido");
      setSendingShipping(false);
      return;
    }

    // Send shipping email
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-shipping-email`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            trackingCode: trackingCode.trim(),
          }),
        },
      );
      toast.success("Pedido marcado como enviado e email enviado!");
    } catch {
      toast.success("Pedido atualizado, mas falha ao enviar email.");
    }

    setSendingShipping(false);
    setShippingDialogOpen(false);
    fetchOrders();
  };

  const statusLabels: Record<string, string> = {
    processing: "Processando",
    shipped: "Enviado",
    delivered: "Entregue",
  };

  const statusColors: Record<string, string> = {
    processing: "text-yellow-500",
    shipped: "text-blue-400",
    delivered: "text-green-400",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold font-display tracking-wider text-gradient-gold mb-6">
          PAINEL ADMIN
        </h1>

        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="flex justify-end mb-4">
              <Button
                className="bg-gradient-gold text-primary-foreground font-display"
                onClick={openNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-lg h-20 animate-pulse"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted" />
                <p>Nenhum produto cadastrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 bg-card rounded-lg p-4 border border-border animate-fade-in"
                  >
                    <div className="w-16 h-16 rounded overflow-hidden bg-secondary flex-shrink-0">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">
                        {p.name}
                      </h3>
                      <p className="text-sm text-primary font-bold">
                        R$ {Number(p.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estoque: {p.stock} | {p.active ? "Ativo" : "Inativo"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card rounded-lg h-20 animate-pulse"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Truck className="h-16 w-16 mx-auto mb-4 text-muted" />
                <p>Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-card rounded-lg p-4 border border-border animate-fade-in"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-semibold text-sm">
                            #{order.id.slice(0, 8)}
                          </h3>
                          <span
                            className={`text-xs font-semibold ${statusColors[order.shipping_status] || "text-muted-foreground"}`}
                          >
                            {statusLabels[order.shipping_status] ||
                              order.shipping_status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {order.profile?.company_name || "Cliente"} •{" "}
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}{" "}
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-sm text-primary font-bold mt-1">
                          R$ {Number(order.total_amount).toFixed(2)}
                        </p>
                        {order.tracking_code && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Rastreio:{" "}
                            <span className="font-mono text-foreground">
                              {order.tracking_code}
                            </span>
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {(order.order_items || [])
                            .map((item: any) => item.products?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {order.shipping_status !== "shipped" &&
                          order.shipping_status !== "delivered" && (
                            <Button
                              size="sm"
                              className="bg-gradient-gold text-primary-foreground"
                              onClick={() => openShippingDialog(order)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Enviar
                            </Button>
                          )}


                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-gradient-gold">
                {editing ? "EDITAR PRODUTO" : "NOVO PRODUTO"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Pomada Modeladora"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Descrição do produto..."
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="Pomadas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stock: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem</Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imageFile ? imageFile.name : "Escolher imagem"}
                </Button>
              </div>
              <Button
                className="w-full bg-gradient-gold text-primary-foreground font-display"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Salvando..." : "SALVAR"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Shipping Dialog */}
        <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-gradient-gold">
                MARCAR COMO ENVIADO
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pedido{" "}
                <span className="font-mono text-foreground">
                  #{selectedOrder?.id.slice(0, 8)}
                </span>{" "}
                — {selectedOrder?.profile?.company_name || "Cliente"}
              </p>
              <div className="space-y-2">
                <Label>Código de Rastreio *</Label>
                <Input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ex: BR123456789BR"
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Um email de notificação será enviado ao cliente com o código de
                rastreio.
              </p>
              <Button
                className="w-full bg-gradient-gold text-primary-foreground font-display"
                onClick={handleMarkAsShipped}
                disabled={sendingShipping}
              >
                <Truck className="h-4 w-4 mr-2" />
                {sendingShipping ? "Enviando..." : "CONFIRMAR ENVIO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;
