import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length !== 6) {
      toast.error('A senha deve ter exatamente 6 dígitos');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error('Erro ao redefinir senha');
    } else {
      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scissors className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold font-display tracking-wider text-gradient-gold">SHOPPING BARBER</h1>
          </div>
          <p className="text-muted-foreground">Redefinir senha</p>
        </div>
        <form onSubmit={handleReset} className="space-y-6 bg-card p-8 rounded-lg border border-gold shadow-gold">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha (6 dígitos)</Label>
            <Input id="password" type="password" placeholder="••••••" maxLength={6} value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova senha</Label>
            <Input id="confirm" type="password" placeholder="••••••" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
          </div>
          <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider" disabled={loading}>
            {loading ? 'Salvando...' : 'REDEFINIR SENHA'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
