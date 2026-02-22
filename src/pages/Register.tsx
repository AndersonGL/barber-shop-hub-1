import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

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

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCepChange = async (value: string) => {
    const formatted = formatCEP(value);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
        } else {
          toast.error('CEP não encontrado');
        }
      } catch {
        toast.error('Erro ao buscar CEP');
      }
      setLoadingCep(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }
    if (password.length !== 6) {
      toast.error('A senha deve ter exatamente 6 dígitos');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: data.user.id,
        cnpj: cnpjDigits,
        company_name: companyName,
        phone,
        email,
        cep: cep.replace(/\D/g, ''),
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      });

      if (profileError) {
        toast.error('Erro ao criar perfil: ' + profileError.message);
      } else {
        toast.success('Conta criada! Verifique seu email para confirmar.');
        navigate('/login');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-display tracking-wider text-gradient-gold">
              SHOPPING BARBER
            </h1>
          </div>
          <p className="text-muted-foreground">Cadastre sua barbearia</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 bg-card p-8 rounded-lg border border-gold shadow-gold">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Barbearia</Label>
            <Input id="companyName" placeholder="Barbearia Premium" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ (obrigatório)</Label>
            <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Endereço de Entrega</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" placeholder="00000-000" value={cep} onChange={(e) => handleCepChange(e.target.value)} required disabled={loadingCep} />
            {loadingCep && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="street">Rua</Label>
              <Input id="street" placeholder="Rua / Avenida" value={street} onChange={(e) => setStreet(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Nº</Label>
              <Input id="number" placeholder="123" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input id="complement" placeholder="Apto, bloco, sala..." value={complement} onChange={(e) => setComplement(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" placeholder="Bairro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" placeholder="UF" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (6 dígitos)</Label>
            <Input id="password" type="password" placeholder="••••••" maxLength={6} value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••" maxLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider" disabled={loading}>
            {loading ? 'Criando...' : 'CRIAR CONTA'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary hover:text-gold-light transition-colors">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
