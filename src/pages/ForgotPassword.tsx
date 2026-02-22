import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Scissors } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error('Erro ao enviar email de recuperação');
    } else {
      setSent(true);
      toast.success('Email de recuperação enviado!');
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
          <p className="text-muted-foreground">Recuperar senha</p>
        </div>

        {sent ? (
          <div className="bg-card p-8 rounded-lg border border-gold shadow-gold text-center space-y-4">
            <p className="text-foreground">Email de recuperação enviado para <strong>{email}</strong></p>
            <p className="text-muted-foreground text-sm">Verifique sua caixa de entrada e siga as instruções.</p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">Voltar ao login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-6 bg-card p-8 rounded-lg border border-gold shadow-gold">
            <div className="space-y-2">
              <Label htmlFor="email">Email cadastrado</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full bg-gradient-gold text-primary-foreground font-display tracking-wider" disabled={loading}>
              {loading ? 'Enviando...' : 'ENVIAR LINK'}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Voltar ao login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
