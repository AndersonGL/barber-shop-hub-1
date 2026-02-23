import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length !== 6) {
      toast.error('A senha deve ter exatamente 6 dígitos');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Email ou senha incorretos');
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold font-display tracking-wider text-gradient-gold">
              CAVALHEIRO GENTLEMAN CLUB
            </h1>
          </div>
          <p className="text-muted-foreground">Produtos profissionais para sua barbearia</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-card p-8 rounded-lg border border-gold shadow-gold">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (6 dígitos)</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              maxLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider" disabled={loading}>
            {loading ? 'Entrando...' : 'ENTRAR'}
          </Button>
          <div className="flex justify-between text-sm">
            <Link to="/register" className="text-primary hover:text-gold-light transition-colors">
              Criar conta
            </Link>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
              Esqueceu a senha?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
