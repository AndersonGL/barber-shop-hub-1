import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
};

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name || '',
        cnpj: profile.cnpj ? formatCNPJ(profile.cnpj) : '',
        phone: profile.phone || '',
        email: profile.email || '',
        cep: profile.cep ? formatCEP(profile.cep) : '',
        street: profile.street || '',
        number: profile.number || '',
        complement: profile.complement || '',
        neighborhood: profile.neighborhood || '',
        city: profile.city || '',
        state: profile.state || '',
      });
    }
  }, [profile]);

  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setForm(prev => ({ ...prev, cep: formatted }));
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }));
        }
      } catch {}
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const cnpjDigits = form.cnpj.replace(/\D/g, '');
    // Only validate CNPJ if the user actually typed something
    if (cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
      toast({ title: 'Erro', description: 'CNPJ deve ter 14 dígitos.', variant: 'destructive' });
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          company_name: form.company_name || '',
          cnpj: cnpjDigits || '',
          phone: form.phone || null,
          email: form.email || null,
          cep: form.cep.replace(/\D/g, '') || null,
          street: form.street || null,
          number: form.number || null,
          complement: form.complement || null,
          neighborhood: form.neighborhood || null,
          city: form.city || null,
          state: form.state || null,
        },
        { onConflict: 'user_id' }
      );

    setLoading(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      await refreshProfile();
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso!' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Empresa *</Label>
                <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: formatCNPJ(e.target.value) }))} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-foreground mb-3">Endereço de Entrega</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={form.cep} onChange={e => handleCepChange(e.target.value)} placeholder="00000-000" />
                </div>
                <div className="space-y-2">
                  <Label>Rua</Label>
                  <Input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.complement} onChange={e => setForm(p => ({ ...p, complement: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} maxLength={2} />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full mt-4">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
