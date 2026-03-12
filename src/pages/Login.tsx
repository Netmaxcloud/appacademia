import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Dumbbell, Loader2, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import FitnessCard from '../components/FitnessCard';
import PrimaryButton from '../components/PrimaryButton';

interface Props {
  onLogin: (profile: any) => void;
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('admin@academia.com');
  const [password, setPassword] = useState('2486');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Fixed Admin Login
      if (username === 'admin@academia.com' && password === '2486') {
        const adminProfile = {
          id: 'admin-id',
          login: 'admin@academia.com',
          role: 'admin' as const,
          full_name: 'Administrador'
        };
        onLogin(adminProfile);
        return;
      }

      // Client Login
      let isAuthenticated = false;
      let userRecord = null;

      // Try the new secure RPC method first
      const { data: isValid, error: rpcError } = await supabase.rpc('verify_app_user_password', {
        p_login: username,
        p_plain_password: password
      });

      if (!rpcError && isValid === true) {
        isAuthenticated = true;
        const { data } = await supabase.from('app_users').select('*').eq('login', username).single();
        userRecord = data;
      } else {
        // Fallback to old method if RPC doesn't exist yet or failed
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('login', username)
          .eq('password_hash', password)
          .single();
        
        if (!error && data) {
          isAuthenticated = true;
          userRecord = data;
        }
      }

      if (!isAuthenticated || !userRecord) {
        throw new Error('Login ou senha incorretos.');
      }

      onLogin(userRecord);
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#151515] border-2 border-[#ff3b3b] rounded-3xl mb-6 shadow-[0_0_30px_rgba(255,59,59,0.3)] transform rotate-3">
            <Dumbbell className="w-10 h-10 text-[#ff3b3b] -rotate-3" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase">
            IA <span className="text-[#ff3b3b]">TRAINER</span>
          </h1>
          <p className="text-white/50 mt-3 font-medium tracking-wide uppercase text-sm">Sua evolução potencializada por IA</p>
        </div>

        <FitnessCard className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2 ml-1">Apelido</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#ff3b3b] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                  placeholder="Seu apelido"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-[#ff3b3b] focus:ring-1 focus:ring-[#ff3b3b] outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-[#ff3b3b]/10 border border-[#ff3b3b]/20 rounded-2xl text-[#ff3b3b] text-sm text-center font-medium">
                {error}
              </div>
            )}

            <PrimaryButton
              type="submit"
              disabled={loading}
              className="mt-4"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Entrar no App'}
            </PrimaryButton>
          </form>
        </FitnessCard>

        <p className="text-center text-white/30 text-xs mt-8 font-medium uppercase tracking-widest">
          © 2026 IA Trainer. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
