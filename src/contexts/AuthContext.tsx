import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type Profile = {
  cnpj: string;
  company_name: string;
  phone: string | null;
  email: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, isAdmin: false, profile: null, loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [roleResult, profileResult] = await Promise.all([
      supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
      supabase
        .from('profiles')
        .select('cnpj, company_name, phone, email, cep, street, number, complement, neighborhood, city, state')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
    setIsAdmin(roleResult.data === true);
    setProfile(profileResult.data);
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('cnpj, company_name, phone, email, cep, street, number, complement, neighborhood, city, state')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  useEffect(() => {
    // onAuthStateChange já dispara com a sessão inicial (evento INITIAL_SESSION),
    // então não precisamos do getSession() separado — evita race condition no F5.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setTimeout(() => fetchUserData(currentUser.id), 0);
      } else {
        setIsAdmin(false);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
