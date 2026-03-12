import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { UserProfile } from './types';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('ia_trainer_session');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
      } catch (e) {
        localStorage.removeItem('ia_trainer_session');
      }
    }
    setLoading(false);
  }, []);

  const login = (userProfile: UserProfile) => {
    setProfile(userProfile);
    localStorage.setItem('ia_trainer_session', JSON.stringify(userProfile));
  };

  const logout = () => {
    setProfile(null);
    localStorage.removeItem('ia_trainer_session');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!profile ? <Login onLogin={login} /> : <Navigate to="/" replace />} 
        />
        
        <Route 
          path="/" 
          element={
            profile ? (
              profile.role === 'admin' ? (
                <AdminDashboard profile={profile} onLogout={logout} />
              ) : (
                <ClientDashboard profile={profile} onLogout={logout} />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
