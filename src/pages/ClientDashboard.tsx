import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Workout, Diet, Payment, Message } from '../types';
import { 
  Dumbbell, Apple, CreditCard, MessageSquare, TrendingUp, 
  ChevronRight, Clock, Flame, LogOut, Loader2, Camera, CheckCircle, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RadioPlayer from '../components/RadioPlayer';
import FitnessCard from '../components/FitnessCard';
import PrimaryButton from '../components/PrimaryButton';
import MobileNavbar from '../components/MobileNavbar';

interface Props {
  profile: UserProfile | null;
  onLogout: () => void;
}

export default function ClientDashboard({ profile: initialProfile, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [activeTab, setActiveTab] = useState('home');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const evolutionData = [
    { name: 'Jan', peso: 80, carga: 40 },
    { name: 'Fev', peso: 78, carga: 45 },
    { name: 'Mar', peso: 77, carga: 50 },
    { name: 'Abr', peso: 76, carga: 55 },
  ];

  const daysOfWeek = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile?.id]);

  const fetchData = async () => {
    if (!profile) return;
    
    try {
      // Fetch Workouts
      const { data: workoutData } = await supabase
        .from('client_workouts')
        .select('*')
        .eq('user_id', profile.id);
      if (workoutData) setWorkouts(workoutData);

      // Fetch Diets
      const { data: dietData } = await supabase
        .from('client_diets')
        .select('*')
        .eq('user_id', profile.id);
      if (dietData) setDiets(dietData);

      // Fetch Messages
      const { data: messageData } = await supabase
        .from('client_messages')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (messageData) setMessages(messageData);

      // Fetch Payments
      const { data: paymentData } = await supabase
        .from('client_payments')
        .select('*, plans(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (paymentData) setPayments(paymentData);
    } catch (e) {
      console.error('Error fetching client data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const newMetadata = { ...profile.metadata, avatar_url: base64String };
        
        const { error } = await supabase
          .from('app_users')
          .update({ metadata: newMetadata })
          .eq('id', profile.id);

        if (error) throw error;
        
        setProfile({ ...profile, metadata: newMetadata });
        alert('Foto atualizada com sucesso!');
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      alert(`Erro ao atualizar foto: ${error.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => onLogout();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const avatarSrc = profile?.metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.login}`;
  const todayWorkout = workouts.length > 0 ? workouts[0] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-40">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="relative w-14 h-14 rounded-full bg-surface border-2 border-[#ff3b3b] flex items-center justify-center overflow-hidden cursor-pointer group shadow-[0_0_15px_rgba(255,59,59,0.3)]"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingAvatar ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <>
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-bold">Bem-vindo de volta</p>
            <h2 className="text-2xl font-black text-white">{profile?.full_name?.split(' ')[0] || 'Atleta'}</h2>
          </div>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-surface border border-white/5 flex items-center justify-center text-white/50 hover:text-[#ff3b3b] hover:bg-[#ff3b3b]/10 transition-all">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 space-y-8 overflow-y-auto no-scrollbar pb-10">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={<Flame className="text-[#ff3b3b]" />} label="Calorias" value="1,240" unit="kcal" />
                <StatCard icon={<Clock className="text-[#ff3b3b]" />} label="Tempo" value="45" unit="min" />
              </div>

              {/* Current Workout Card */}
              <FitnessCard className="relative overflow-hidden group border-[#ff3b3b]/20">
                <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 group-hover:rotate-12">
                  <Dumbbell className="w-48 h-48 text-[#ff3b3b]" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[#ff3b3b] text-xs font-black uppercase tracking-widest mb-2">Treino de Hoje</h3>
                  <h4 className="text-3xl font-black text-white mb-4 leading-tight">{todayWorkout ? todayWorkout.workout_name : 'Nenhum treino hoje'}</h4>
                  <div className="flex items-center gap-6 text-sm text-white/70 mb-8">
                    <span className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg"><Dumbbell className="w-4 h-4 text-[#ff3b3b]" /> {todayWorkout?.exercises?.length || 0} Exercícios</span>
                    <span className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg"><Clock className="w-4 h-4 text-[#ff3b3b]" /> 60 min</span>
                  </div>
                  <PrimaryButton 
                    onClick={() => {
                      if (todayWorkout) {
                        setActiveWorkout(todayWorkout);
                        setActiveTab('active_workout');
                      } else {
                        alert('Nenhum treino disponível para hoje.');
                      }
                    }}
                  >
                    INICIAR TREINO
                  </PrimaryButton>
                </div>
              </FitnessCard>
            </motion.div>
          )}

          {activeTab === 'workouts' && (
            <motion.div 
              key="workouts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="text-2xl font-black mb-6 text-white uppercase tracking-wide">Meus Treinos</h3>
              {daysOfWeek.map((day, i) => {
                const workoutForDay = workouts[i % workouts.length];
                return (
                  <FitnessCard 
                    key={day} 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => {
                      if (workoutForDay) {
                        setActiveWorkout(workoutForDay);
                        setActiveTab('active_workout');
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#ff3b3b]/10 flex items-center justify-center font-black text-[#ff3b3b] text-lg">
                        {day[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{day}</h4>
                        <p className="text-sm text-white/50">{workoutForDay ? workoutForDay.workout_name : 'Descanso'}</p>
                      </div>
                    </div>
                    <ChevronRight className="text-white/20" />
                  </FitnessCard>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'active_workout' && activeWorkout && (
            <motion.div 
              key="active_workout"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => setActiveTab('workouts')}
                  className="w-12 h-12 rounded-full bg-surface border border-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
                <h3 className="text-3xl font-black text-white">{activeWorkout.workout_name}</h3>
              </div>
              
              {activeWorkout.description && (
                <p className="text-white/60 text-base leading-relaxed bg-surface p-4 rounded-2xl border border-white/5">{activeWorkout.description}</p>
              )}

              <div className="space-y-4 mt-8">
                <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Exercícios</h4>
                {activeWorkout.exercises?.map((ex: any, idx: number) => (
                  <FitnessCard key={idx} className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-lg text-white">{ex.name}</h4>
                      <button className="text-white/20 hover:text-[#ff3b3b] transition-colors">
                        <CheckCircle className="w-7 h-7" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm text-white/70">
                      <div className="bg-black/40 p-3 rounded-xl text-center border border-white/5">
                        <span className="block text-[10px] text-[#ff3b3b] font-bold uppercase tracking-wider mb-1">Séries</span>
                        <span className="font-black text-lg text-white">{ex.sets}</span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-xl text-center border border-white/5">
                        <span className="block text-[10px] text-[#ff3b3b] font-bold uppercase tracking-wider mb-1">Reps</span>
                        <span className="font-black text-lg text-white">{ex.reps}</span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-xl text-center border border-white/5">
                        <span className="block text-[10px] text-[#ff3b3b] font-bold uppercase tracking-wider mb-1">Descanso</span>
                        <span className="font-black text-lg text-white">{ex.rest_time}</span>
                      </div>
                    </div>
                  </FitnessCard>
                ))}
              </div>
              
              <PrimaryButton 
                className="mt-8"
                onClick={() => {
                  alert('Treino finalizado com sucesso!');
                  setActiveTab('home');
                }}
              >
                FINALIZAR TREINO
              </PrimaryButton>
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div 
              key="progress"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black mb-6 text-white uppercase tracking-wide">Meu Progresso</h3>
              
              <FitnessCard>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold flex items-center gap-2 text-white"><TrendingUp className="text-[#ff3b3b] w-5 h-5" /> Evolução de Carga</h3>
                  <select className="bg-black/50 text-xs text-white/70 outline-none border border-white/10 rounded-lg px-2 py-1">
                    <option>Últimos 4 meses</option>
                  </select>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={evolutionData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="#ffffff50" fontSize={12} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#151515', border: '1px solid #ffffff10', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#ff3b3b', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="carga" stroke="#ff3b3b" strokeWidth={4} dot={{ fill: '#151515', stroke: '#ff3b3b', strokeWidth: 2, r: 5 }} activeDot={{ r: 8, fill: '#ff3b3b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </FitnessCard>

              <div className="grid grid-cols-2 gap-4">
                <FitnessCard className="text-center p-6">
                  <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Peso Atual</h4>
                  <p className="text-3xl font-black text-white">76 <span className="text-sm text-[#ff3b3b]">kg</span></p>
                </FitnessCard>
                <FitnessCard className="text-center p-6">
                  <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Meta</h4>
                  <p className="text-3xl font-black text-white">80 <span className="text-sm text-[#ff3b3b]">kg</span></p>
                </FitnessCard>
              </div>
            </motion.div>
          )}

          {activeTab === 'diets' && (
            <motion.div 
              key="diets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h3 className="text-2xl font-black mb-6 text-white uppercase tracking-wide">Minha Alimentação</h3>
              {diets.length === 0 ? (
                <div className="text-center text-white/50 py-16 bg-surface rounded-3xl border border-white/5">
                  <Apple className="w-16 h-16 mx-auto mb-4 opacity-20 text-[#ff3b3b]" />
                  <p className="font-medium">Nenhuma dieta cadastrada ainda.</p>
                </div>
              ) : (
                diets.map(diet => (
                  <FitnessCard key={diet.id} className="mb-4">
                    <h4 className="font-black text-xl mb-2 text-white">{diet.name || diet.diet_name}</h4>
                    {diet.description && <p className="text-sm text-white/60 mb-6">{diet.description}</p>}
                    
                    <div className="space-y-3">
                      {diet.meals?.map((meal: any, idx: number) => (
                        <div key={idx} className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-white">{meal.time || `Refeição ${idx + 1}`}</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#ff3b3b] bg-[#ff3b3b]/10 px-2 py-1 rounded-md">{meal.name}</span>
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed">{meal.items || meal.description}</p>
                        </div>
                      ))}
                    </div>
                  </FitnessCard>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-black mb-6 text-white uppercase tracking-wide">Meu Perfil</h3>
              
              <FitnessCard className="flex flex-col items-center text-center p-8">
                <div className="w-24 h-24 rounded-full bg-surface border-4 border-[#ff3b3b] overflow-hidden mb-4 shadow-[0_0_20px_rgba(255,59,59,0.3)]">
                  <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-2xl font-black text-white">{profile?.full_name || 'Atleta'}</h2>
                <p className="text-[#ff3b3b] font-medium mt-1">{profile?.email}</p>
              </FitnessCard>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 px-2">Configurações</h4>
                
                <FitnessCard className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">Dados Pessoais</h4>
                  </div>
                  <ChevronRight className="text-white/20" />
                </FitnessCard>

                <FitnessCard className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">Assinatura e Pagamentos</h4>
                  </div>
                  <ChevronRight className="text-white/20" />
                </FitnessCard>

                <FitnessCard className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">Mensagens do Treinador</h4>
                    {messages.length > 0 && <p className="text-xs text-[#ff3b3b] mt-1">{messages.length} mensagens</p>}
                  </div>
                  <ChevronRight className="text-white/20" />
                </FitnessCard>
              </div>

              <PrimaryButton 
                onClick={handleLogout}
                className="bg-transparent border-2 border-[#ff3b3b] text-[#ff3b3b] hover:bg-[#ff3b3b]/10 shadow-none mt-8"
                icon={<LogOut className="w-5 h-5" />}
              >
                Sair do Aplicativo
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Radio Player */}
      <RadioPlayer />

      {/* Mobile Navbar */}
      <MobileNavbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

function StatCard({ icon, label, value, unit }: { icon: any, label: string, value: string, unit: string }) {
  return (
    <FitnessCard className="p-5 flex flex-col gap-3">
      <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-black leading-none text-white">{value} <span className="text-sm font-bold text-[#ff3b3b]">{unit}</span></p>
      </div>
    </FitnessCard>
  );
}
