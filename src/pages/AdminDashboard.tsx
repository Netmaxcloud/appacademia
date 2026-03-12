import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Workout, Diet, Payment, Message, AIConfig, Plan } from '../types';
import { 
  Users, Dumbbell, Apple, CreditCard, MessageSquare, Settings, 
  Plus, Search, LogOut, Brain, Mic, Send, Trash2, Edit2, 
  CheckCircle, XCircle, ChevronRight, Loader2, Download, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SYSTEM_INSTRUCTION } from '../lib/gemini';
import jsPDF from 'jspdf';
import FitnessCard from '../components/FitnessCard';

interface Props {
  profile: UserProfile | null;
  onLogout: () => void;
}

export default function AdminDashboard({ profile, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState('clients');
  const [selectedClient, setSelectedClient] = useState<UserProfile | null>(null);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);

  // Form states
  const [newClient, setNewClient] = useState({ 
    login: '', 
    password_hash: '', 
    full_name: '', 
    role: 'client' as const 
  });

  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    name: '',
    price: 0,
    duration_months: 1,
    features: []
  });

  const [editingClient, setEditingClient] = useState<UserProfile | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [clientWorkouts, setClientWorkouts] = useState<Workout[]>([]);
  const [clientDiets, setClientDiets] = useState<Diet[]>([]);
  const [clientPayments, setClientPayments] = useState<Payment[]>([]);
  const [clientMessages, setClientMessages] = useState<Message[]>([]);
  const [appConfig, setAppConfig] = useState(() => {
    const saved = localStorage.getItem('appConfig');
    return saved ? JSON.parse(saved) : {
      gym_name: 'IA TRAINER',
      primary_color: '#00FF00'
    };
  });
  const [newMessageText, setNewMessageText] = useState('');
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [newWorkout, setNewWorkout] = useState<Partial<Workout>>({
    workout_name: '',
    description: '',
    exercises: []
  });

  useEffect(() => {
    fetchClients();
    fetchPlans();
    fetchAIConfig();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientData(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.from('plans').select('*');
      if (error) {
        console.error('Error fetching plans:', error);
      } else if (data) {
        setPlans(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching plans:', err);
    }
  };

  const fetchClientData = async (clientId: string) => {
    setLoading(true);
    try {
      const [workoutsRes, dietsRes, paymentsRes, messagesRes] = await Promise.all([
        supabase.from('client_workouts').select('*').eq('user_id', clientId),
        supabase.from('client_diets').select('*').eq('user_id', clientId),
        supabase.from('client_payments').select('*').eq('user_id', clientId),
        supabase.from('client_messages').select('*').eq('user_id', clientId).order('created_at', { ascending: true })
      ]);

      if (workoutsRes.data) setClientWorkouts(workoutsRes.data);
      if (dietsRes.data) setClientDiets(dietsRes.data);
      if (paymentsRes.data) setClientPayments(paymentsRes.data);
      if (messagesRes.data) setClientMessages(messagesRes.data);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('role', 'client');
      
      if (error) {
        console.error('Error fetching clients:', error);
        alert(`Erro ao carregar clientes: ${error.message}. Verifique se a tabela 'app_users' foi criada no Supabase.`);
        return;
      }
      
      if (data) setClients(data);
    } catch (err: any) {
      console.error('Unexpected error fetching clients:', err);
      alert(`Erro inesperado ao carregar clientes: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIConfig = async () => {
    // Tenta carregar do localStorage primeiro
    const localConfig = localStorage.getItem('aiConfig');
    if (localConfig) {
      try {
        setAiConfig(JSON.parse(localConfig));
      } catch (e) {
        console.error('Erro ao ler config local', e);
      }
    }

    try {
      const { data, error } = await supabase
        .from('config_ai')
        .select('*')
        .single();
      if (!error && data) {
        setAiConfig(data);
        localStorage.setItem('aiConfig', JSON.stringify(data));
      }
    } catch (e) {
      // Ignora erro se a tabela não existir
    }
  };

  const recognitionRef = React.useRef<any>(null);
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta reconhecimento de voz.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;
    
    let finalTranscript = '';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        processVoiceCommand(finalTranscript.trim());
      }
    };
    
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
    };
    
    recognition.start();
  };

  const processVoiceCommand = async (transcript: string) => {
    if (!aiConfig?.gemini_api_key) {
      alert('Configure a chave da API do Gemini nas Configurações primeiro.');
      return;
    }

    try {
      setLoading(true);
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: aiConfig.gemini_api_key });

      const response = await ai.models.generateContent({
        model: aiConfig.model || 'gemini-3.1-pro-preview',
        contents: `O usuário disse: "${transcript}". 
        Analise o comando e retorne uma ação estruturada em JSON.
        Ações possíveis: 
        - create_client (parâmetros: full_name, login, password)
        - create_workout (parâmetros: client_name, workout_name, description, exercises: [{name, sets, reps, rest_time}])
        - create_diet (parâmetros: client_name, diet_name, meals: [{time, name, foods}])
        - send_message (parâmetros: client_name, message)
        - add_plan (parâmetros: client_name, plan_name)
        - create_plan (parâmetros: name, price, duration_months, features: [string])
        
        Retorne APENAS o JSON no formato: { "action": "nome_da_acao", "parameters": { ... } }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      await executeAIAction(result.action, result.parameters);
    } catch (error: any) {
      console.error('Erro ao processar comando de voz:', error);
      alert('Erro ao processar comando de voz: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const executeAIAction = async (action: string, params: any) => {
    try {
      switch (action) {
        case 'create_client': {
          const { full_name, login, password } = params;
          
          // Tenta usar a função segura primeiro
          const { error: rpcError } = await supabase.rpc('create_app_user', {
            p_login: login,
            p_plain_password: password,
            p_role: 'client',
            p_full_name: full_name,
            p_metadata: {}
          });

          if (rpcError) {
            console.warn('Fallback para insert direto (RPC falhou):', rpcError);
            const { error } = await supabase.from('app_users').insert([{
              full_name, login, password_hash: password, role: 'client'
            }]);
            if (error) throw error;
          }
          
          alert(`Cliente ${full_name} criado com sucesso!`);
          fetchClients();
          break;
        }
        case 'create_workout': {
          const { client_name, workout_name, description, exercises } = params;
          const client = clients.find(c => c.full_name?.toLowerCase().includes(client_name.toLowerCase()) || c.login?.toLowerCase().includes(client_name.toLowerCase()));
          if (!client) throw new Error(`Cliente ${client_name} não encontrado.`);
          
          const { error } = await supabase.from('client_workouts').insert([{
            user_id: client.id,
            workout_name,
            description,
            exercises
          }]);
          if (error) throw error;
          alert(`Treino ${workout_name} criado para ${client.full_name}!`);
          if (selectedClient?.id === client.id) fetchClientData(client.id);
          break;
        }
        case 'create_diet': {
          const { client_name, diet_name, meals } = params;
          const client = clients.find(c => c.full_name?.toLowerCase().includes(client_name.toLowerCase()) || c.login?.toLowerCase().includes(client_name.toLowerCase()));
          if (!client) throw new Error(`Cliente ${client_name} não encontrado.`);
          
          const { error } = await supabase.from('client_diets').insert([{
            user_id: client.id,
            diet_name: diet_name,
            meals
          }]);
          if (error) throw error;
          alert(`Dieta ${diet_name} criada para ${client.full_name}!`);
          if (selectedClient?.id === client.id) fetchClientData(client.id);
          break;
        }
        case 'send_message': {
          const { client_name, message } = params;
          const client = clients.find(c => c.full_name?.toLowerCase().includes(client_name.toLowerCase()) || c.login?.toLowerCase().includes(client_name.toLowerCase()));
          if (!client) throw new Error(`Cliente ${client_name} não encontrado.`);
          
          const { error } = await supabase.from('client_messages').insert([{
            user_id: client.id,
            message,
            sender_role: 'admin'
          }]);
          if (error) throw error;
          alert(`Mensagem enviada para ${client.full_name}!`);
          if (selectedClient?.id === client.id) fetchClientData(client.id);
          break;
        }
        case 'add_plan': {
          const { client_name, plan_name } = params;
          const client = clients.find(c => c.full_name?.toLowerCase().includes(client_name.toLowerCase()) || c.login?.toLowerCase().includes(client_name.toLowerCase()));
          if (!client) throw new Error(`Cliente ${client_name} não encontrado.`);
          
          const plan = plans.find(p => p.name.toLowerCase().includes(plan_name.toLowerCase()));
          if (!plan) throw new Error(`Plano ${plan_name} não encontrado.`);
          
          const { error } = await supabase.from('client_payments').insert([{
            user_id: client.id,
            plan_id: plan.id,
            amount: plan.price,
            status: 'pago'
          }]);
          if (error) throw error;
          alert(`Plano ${plan.name} adicionado para ${client.full_name}!`);
          if (selectedClient?.id === client.id) fetchClientData(client.id);
          break;
        }
        case 'create_plan': {
          const { name, price, duration_months, features } = params;
          const { error } = await supabase.from('plans').insert([{
            name,
            price,
            duration_months: duration_months || 1,
            features: features || []
          }]);
          if (error) throw error;
          alert(`Plano ${name} criado com sucesso!`);
          fetchPlans();
          break;
        }
        default:
          alert(`Ação não reconhecida: ${action}`);
      }
    } catch (error: any) {
      console.error('Erro ao executar ação da IA:', error);
      alert(`Erro ao executar ação: ${error.message}`);
    }
  };

  const handleLogout = () => onLogout();

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleCreateClient triggered');
    
    if (!newClient.login || !newClient.password_hash || !newClient.full_name) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setCreating(true);
    
    try {
      // Test connection first
      const { error: pingError } = await supabase.from('app_users').select('id').limit(1);
      if (pingError) {
        throw new Error(`Erro de conexão com o banco: ${pingError.message}. Verifique se as tabelas foram criadas.`);
      }

      // Tenta usar a função segura primeiro
      const { error: rpcError } = await supabase.rpc('create_app_user', {
        p_login: newClient.login.trim(),
        p_plain_password: newClient.password_hash,
        p_role: 'client',
        p_full_name: newClient.full_name.trim(),
        p_metadata: {}
      });

      if (rpcError) {
        console.warn('RPC create_app_user failed or not found, falling back to direct insert', rpcError);
        const clientData = {
          login: newClient.login.trim(),
          password_hash: newClient.password_hash,
          full_name: newClient.full_name.trim(),
          role: 'client'
        };
        
        console.log('Sending to Supabase:', clientData);
        
        const { data, error } = await supabase
          .from('app_users')
          .insert([clientData])
          .select();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        console.log('Success response:', data);
      }
      
      alert('Cliente criado com sucesso!');
      setShowAddClient(false);
      setNewClient({ login: '', password_hash: '', full_name: '', role: 'client' });
      await fetchClients();
    } catch (error: any) {
      console.error('Full error object:', error);
      alert(`Erro ao criar cliente: ${error.message || 'Erro desconhecido'}.`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: editingClient.full_name,
          login: editingClient.login
        })
        .eq('id', editingClient.id);

      if (error) throw error;
      alert('Cliente atualizado!');
      setShowEditClient(false);
      fetchClients();
    } catch (error: any) {
      alert(`Erro ao atualizar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const handleCreateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !newWorkout.workout_name) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_workouts')
        .insert([{
          user_id: selectedClient.id,
          workout_name: newWorkout.workout_name,
          description: newWorkout.description,
          exercises: newWorkout.exercises
        }]);

      if (error) throw error;
      alert('Treino criado!');
      setShowAddWorkout(false);
      setNewWorkout({ workout_name: '', description: '', exercises: [] });
      fetchClientData(selectedClient.id);
    } catch (error: any) {
      alert(`Erro ao criar treino: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAIConfig = async () => {
    if (!aiConfig) return;
    
    // Salva no localStorage sempre
    localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
    
    try {
      const payload: any = { ...aiConfig };
      if (!payload.id) delete payload.id; // Evita erro de UUID vazio
      
      const { error } = await supabase
        .from('config_ai')
        .upsert(payload);
        
      if (error) {
        console.warn('Erro ao salvar no Supabase (tabela pode não existir):', error);
        alert('Configurações de IA salvas localmente no seu navegador!');
      } else {
        alert('Configurações de IA salvas com sucesso!');
      }
    } catch (error: any) {
      console.warn('Erro ao salvar no Supabase:', error);
      alert('Configurações de IA salvas localmente no seu navegador!');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name || newPlan.price === undefined) {
      alert('Por favor, preencha o nome e o preço do plano.');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('plans').insert([{
        name: newPlan.name,
        price: newPlan.price,
        duration_months: newPlan.duration_months || 1,
        features: newPlan.features || []
      }]);
      if (error) throw error;
      alert('Plano criado com sucesso!');
      setShowAddPlan(false);
      setNewPlan({ name: '', price: 0, duration_months: 1, features: [] });
      fetchPlans();
    } catch (error: any) {
      console.error('Erro ao criar plano:', error);
      alert(`Erro ao criar plano: ${error.message}. Verifique se a tabela 'plans' foi criada no Supabase.`);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    if (!editingPlan.name || editingPlan.price === undefined) {
      alert('Por favor, preencha o nome e o preço do plano.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('plans')
        .update({
          name: editingPlan.name,
          price: editingPlan.price,
          duration_months: editingPlan.duration_months || 1,
          features: editingPlan.features || []
        })
        .eq('id', editingPlan.id);
      if (error) throw error;
      alert('Plano atualizado!');
      setShowEditPlan(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Erro ao atualizar plano:', error);
      alert(`Erro ao atualizar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      fetchPlans();
    } catch (error: any) {
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const handleCreatePayment = async (amount: number, planId?: string) => {
    if (!selectedClient) return;
    try {
      // Tenta inserir com plan_id
      const payload: any = {
        user_id: selectedClient.id,
        amount,
        status: 'pago'
      };
      if (planId) {
        payload.plan_id = planId;
      }

      const { error } = await supabase
        .from('client_payments')
        .insert([payload]);
        
      if (error) {
        // Se der erro de coluna não encontrada (plan_id), tenta sem ela
        if (error.message.includes('plan_id')) {
          console.warn('Coluna plan_id não encontrada, inserindo sem ela. Atualize o banco de dados.');
          const { error: fallbackError } = await supabase
            .from('client_payments')
            .insert([{
              user_id: selectedClient.id,
              amount,
              status: 'pago'
            }]);
          if (fallbackError) throw fallbackError;
        } else {
          throw error;
        }
      }
      
      alert('Pagamento registrado!');
      fetchClientData(selectedClient.id);
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      alert(`Erro ao registrar pagamento: ${error.message}`);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedClient || !newMessageText.trim()) return;
    try {
      const { error } = await supabase
        .from('client_messages')
        .insert([{
          user_id: selectedClient.id,
          message: newMessageText.trim(),
          sender_role: 'admin'
        }]);
      if (error) throw error;
      setNewMessageText('');
      fetchClientData(selectedClient.id);
    } catch (error: any) {
      alert(`Erro ao enviar: ${error.message}`);
    }
  };

  const handleSaveAppConfig = async () => {
    localStorage.setItem('appConfig', JSON.stringify(appConfig));
    alert('Configurações do aplicativo salvas localmente!');
  };

  const filteredClients = clients.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.login?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-white/5 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Dumbbell className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">{appConfig.gym_name}</span>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem icon={<Users />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={<Dumbbell />} label="Treinos" active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} />
          <SidebarItem icon={<Apple />} label="Dietas" active={activeTab === 'diets'} onClick={() => setActiveTab('diets')} />
          <SidebarItem icon={<List />} label="Planos" active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} />
          <SidebarItem icon={<CreditCard />} label="Pagamentos" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
          <SidebarItem icon={<MessageSquare />} label="Mensagens" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} />
          <SidebarItem icon={<Settings />} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 text-white/50 hover:text-primary transition-colors p-3 rounded-xl hover:bg-white/5">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-background/50 backdrop-blur-xl z-10">
          <h2 className="text-2xl font-bold capitalize">
            {activeTab === 'clients' ? 'Gerenciar Clientes' : 
             activeTab === 'workouts' ? 'Gerenciar Treinos' : 
             activeTab === 'diets' ? 'Gerenciar Dietas' : 
             activeTab === 'plans' ? 'Gerenciar Planos' : 
             activeTab === 'payments' ? 'Pagamentos e Mensalidades' : 
             activeTab === 'messages' ? 'Central de Mensagens' : 
             activeTab === 'settings' ? 'Configurações' : activeTab}
          </h2>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleListening}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 hover:bg-white/10'}`}
                title="Comando de Voz"
              >
                <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-white/50'}`} />
              </button>
              <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:border-primary outline-none transition-all w-64"
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
              <img src={profile?.metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.login}`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'clients' && (
              <motion.div 
                key="clients"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <p className="text-white/50">{filteredClients.length} clientes cadastrados</p>
                    <button 
                      onClick={fetchClients} 
                      className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/30 hover:text-white"
                      title="Atualizar lista"
                    >
                      <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <button onClick={() => setShowAddClient(true)} className="btn-primary py-2 px-4 text-sm">
                    <Plus className="w-4 h-4" /> Novo Cliente
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredClients.map((client: UserProfile) => (
                    <ClientCard 
                      key={client.id} 
                      client={client} 
                      onEdit={(c) => {
                        setEditingClient(c);
                        setShowEditClient(true);
                      }}
                      onAction={(tab, client) => {
                        setActiveTab(tab);
                        setSelectedClient(client);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'workouts' && (
              <motion.div key="workouts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Gerenciar Treinos</h3>
                  <div className="flex gap-2">
                    <select 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                      onChange={(e) => {
                        const client = clients.find(c => c.id === e.target.value);
                        setSelectedClient(client || null);
                      }}
                      value={selectedClient?.id || ''}
                    >
                      <option value="">Todos os Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    {selectedClient && (
                      <button 
                        onClick={() => setShowAddWorkout(true)}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Novo Treino
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedClient ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clientWorkouts.length > 0 ? (
                      clientWorkouts.map(workout => (
                        <div key={workout.id} className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg hover:border-primary/30 transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-bold text-lg">{workout.workout_name}</h4>
                              <p className="text-xs text-white/30">{workout.description}</p>
                            </div>
                            <button className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-red-500 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {workout.exercises.map((ex, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 border-b border-white/5">
                                <span>{ex.name}</span>
                                <span className="text-white/50">{ex.sets}x{ex.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-2 bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                        Nenhum treino cadastrado para este cliente.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                    Selecione um cliente para ver ou gerenciar treinos.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'diets' && (
              <motion.div key="diets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Gerenciar Dietas</h3>
                  <div className="flex gap-2">
                    <select 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                      onChange={(e) => {
                        const client = clients.find(c => c.id === e.target.value);
                        setSelectedClient(client || null);
                      }}
                      value={selectedClient?.id || ''}
                    >
                      <option value="">Todos os Clientes</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    {selectedClient && (
                      <button className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Nova Dieta
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedClient ? (
                  <div className="grid grid-cols-1 gap-4">
                    {clientDiets.length > 0 ? (
                      clientDiets.map(diet => (
                        <div key={diet.id} className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg">
                          <h4 className="font-bold text-lg mb-4">{diet.name}</h4>
                          <div className="space-y-4">
                            {diet.meals.map((meal: any, idx: number) => (
                              <div key={idx} className="bg-white/5 p-3 rounded-xl">
                                <p className="font-bold text-sm text-primary">{meal.time} - {meal.name}</p>
                                <p className="text-xs text-white/50">{meal.foods.join(', ')}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                        Nenhuma dieta cadastrada para este cliente.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                    Selecione um cliente para ver ou gerenciar dietas.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'plans' && (
              <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Gerenciar Planos</h3>
                  <button 
                    onClick={() => setShowAddPlan(true)}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Novo Plano
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.length > 0 ? (
                    plans.map(plan => (
                      <div key={plan.id} className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg hover:border-primary/30 transition-all flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-xl text-primary">{plan.name}</h4>
                            <p className="text-2xl font-black mt-2">R$ {plan.price.toFixed(2)}</p>
                            <p className="text-xs text-white/50">{plan.duration_months} {plan.duration_months === 1 ? 'mês' : 'meses'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingPlan(plan);
                                setShowEditPlan(true);
                              }}
                              className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex-1">
                          <p className="text-xs font-bold text-white/50 uppercase mb-2">Recursos:</p>
                          <ul className="space-y-2">
                            {plan.features?.map((feature, idx) => (
                              <li key={idx} className="text-sm flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-primary" /> {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                      Nenhum plano cadastrado.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">Histórico de Pagamentos</h3>
                  <div className="flex gap-2">
                    <select 
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                      onChange={(e) => {
                        const client = clients.find(c => c.id === e.target.value);
                        setSelectedClient(client || null);
                      }}
                      value={selectedClient?.id || ''}
                    >
                      <option value="">Selecione um Cliente</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    {selectedClient && (
                      <button 
                        onClick={() => {
                          const amount = prompt('Valor do pagamento:');
                          if (amount) {
                            const planId = prompt('ID do Plano (opcional):');
                            handleCreatePayment(parseFloat(amount), planId || undefined);
                          }
                        }}
                        className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Registrar Pagamento
                      </button>
                    )}
                  </div>
                </div>
                
                {selectedClient ? (
                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-white/5 text-xs uppercase text-white/50">
                        <tr>
                          <th className="p-4">Plano</th>
                          <th className="p-4">Valor</th>
                          <th className="p-4">Data</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {clientPayments.length > 0 ? (
                          clientPayments.map(payment => (
                            <tr key={payment.id} className="border-t border-white/5">
                              <td className="p-4">
                                {payment.plan_id ? plans.find(p => p.id === payment.plan_id)?.name || 'Plano Excluído' : 'Pagamento Avulso'}
                              </td>
                              <td className="p-4">R$ {payment.amount.toFixed(2)}</td>
                              <td className="p-4">{new Date(payment.created_at!).toLocaleDateString()}</td>
                              <td className="p-4">
                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t border-white/5">
                            <td colSpan={4} className="p-10 text-center text-white/30">
                              Nenhum pagamento registrado para este cliente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-10 shadow-lg text-center text-white/30">
                    Selecione um cliente para ver o histórico de pagamentos.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'messages' && (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h3 className="text-xl font-bold">Central de Mensagens</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                  <div className="bg-[#151515] border border-white/5 rounded-3xl p-4 shadow-lg overflow-y-auto space-y-2">
                    {clients.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedClient(c)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedClient?.id === c.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                          <img src={c.metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.login}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{c.full_name}</p>
                          <p className="text-[10px] text-white/30">Clique para conversar</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="md:col-span-2 bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg flex flex-col">
                    {selectedClient ? (
                      <>
                        <div className="p-4 border-b border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                            <img src={selectedClient.metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedClient.login}`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <span className="font-bold">{selectedClient.full_name}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {clientMessages.length > 0 ? (
                            clientMessages.map(msg => (
                              <div key={msg.id} className={`flex ${(msg as any).sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${(msg as any).sender_role === 'admin' ? 'bg-primary text-white rounded-tr-none' : 'bg-white/10 text-white rounded-tl-none'}`}>
                                  {msg.message}
                                  <p className="text-[8px] opacity-50 mt-1 text-right">
                                    {new Date(msg.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-white/20">
                              Nenhuma mensagem ainda. Comece a conversa!
                            </div>
                          )}
                        </div>
                        <div className="p-4 border-t border-white/5 flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Digite sua mensagem..." 
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-primary" 
                          />
                          <button 
                            onClick={handleSendMessage}
                            className="p-2 bg-primary rounded-xl hover:scale-105 active:scale-95 transition-all"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-white/20">
                        Selecione uma conversa para começar
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl space-y-8"
              >
                <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Settings className="text-primary" /> Configurações do Aplicativo
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/50 mb-2">Nome da Academia</label>
                      <input 
                        type="text" 
                        value={appConfig.gym_name}
                        onChange={(e) => setAppConfig({...appConfig, gym_name: e.target.value})}
                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2">Cor Primária</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={appConfig.primary_color}
                          onChange={(e) => setAppConfig({...appConfig, primary_color: e.target.value})}
                          className="w-12 h-12 bg-transparent border-none outline-none cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={appConfig.primary_color}
                          onChange={(e) => setAppConfig({...appConfig, primary_color: e.target.value})}
                          className="flex-1 bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <button onClick={handleSaveAppConfig} className="btn-primary w-full">Salvar App Config</button>
                  </div>
                </div>

                <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Brain className="text-primary" /> Configuração de IA (Gemini)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/50 mb-2">API Key Gemini</label>
                      <input 
                        type="password" 
                        value={aiConfig?.gemini_api_key || ''}
                        onChange={(e) => setAiConfig(prev => prev ? {...prev, gemini_api_key: e.target.value} : {id: '', gemini_api_key: e.target.value, model: 'gemini-1.5-flash'})}
                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                        placeholder="Insira sua API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2">Modelo</label>
                      <select 
                        value={aiConfig?.model || 'gemini-3.1-pro-preview'}
                        onChange={(e) => setAiConfig(prev => prev ? {...prev, model: e.target.value} : {id: '', gemini_api_key: '', model: e.target.value})}
                        className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary"
                      >
                        <option value="gemini-3-flash-preview">Gemini 3 Flash (Rápido)</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Inteligente)</option>
                      </select>
                    </div>
                    <button onClick={handleSaveAIConfig} className="btn-primary w-full">Salvar Configurações de IA</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden h-20 bg-surface border-t border-white/5 flex items-center justify-around px-4">
          <MobileNavItem icon={<Users />} active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <MobileNavItem icon={<Dumbbell />} active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} />
          <MobileNavItem icon={<Plus className="w-8 h-8 text-white" />} active={false} onClick={() => setShowAddClient(true)} isCenter />
          <MobileNavItem icon={<Apple />} active={activeTab === 'diets'} onClick={() => setActiveTab('diets')} />
          <MobileNavItem icon={<Settings />} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </main>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showAddClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddClient(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-[#151515] border border-white/5 rounded-3xl p-8 shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-6">Novo Cliente</h3>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Nome Completo" 
                  value={newClient.full_name}
                  onChange={(e) => setNewClient({...newClient, full_name: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Login (Apelido)" 
                  value={newClient.login}
                  onChange={(e) => setNewClient({...newClient, login: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <input 
                  type="password" 
                  placeholder="Senha" 
                  value={newClient.password_hash}
                  onChange={(e) => setNewClient({...newClient, password_hash: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setShowAddClient(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" disabled={creating} className="flex-1 btn-primary">
                    {creating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Criar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {showEditClient && editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowEditClient(false)} 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }} 
              className="relative w-full max-w-md bg-[#151515] border border-white/5 rounded-3xl p-8 shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-6">Editar Cliente</h3>
              <form onSubmit={handleUpdateClient} className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editingClient.full_name || ''} 
                    onChange={(e) => setEditingClient({...editingClient, full_name: e.target.value})} 
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 ml-1">Login</label>
                  <input 
                    type="text" 
                    value={editingClient.login || ''} 
                    onChange={(e) => setEditingClient({...editingClient, login: e.target.value})} 
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setShowEditClient(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 btn-primary">Salvar</button>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    handleDeleteClient(editingClient.id);
                    setShowEditClient(false);
                  }} 
                  className="w-full py-3 text-red-500 text-sm hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <Trash2 className="w-4 h-4" /> Excluir Cliente
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Workout Modal */}
      <AnimatePresence>
        {showAddWorkout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddWorkout(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-[#151515] border border-white/5 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Novo Treino para {selectedClient?.full_name}</h3>
              <form onSubmit={handleCreateWorkout} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nome do Treino (ex: Treino A)" 
                    value={newWorkout.workout_name}
                    onChange={(e) => setNewWorkout({...newWorkout, workout_name: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="Descrição curta" 
                    value={newWorkout.description}
                    onChange={(e) => setNewWorkout({...newWorkout, description: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-white/50">Exercícios</h4>
                    <button 
                      type="button"
                      onClick={() => setNewWorkout({
                        ...newWorkout, 
                        exercises: [...(newWorkout.exercises || []), { name: '', sets: 3, reps: '12', rest_time: '60s' }]
                      })}
                      className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Exercício
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-2 no-scrollbar">
                    {newWorkout.exercises?.map((ex, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="col-span-5">
                          <input 
                            type="text" 
                            placeholder="Exercício" 
                            value={ex.name}
                            onChange={(e) => {
                              const updated = [...(newWorkout.exercises || [])];
                              updated[idx].name = e.target.value;
                              setNewWorkout({...newWorkout, exercises: updated});
                            }}
                            className="w-full bg-transparent border-none outline-none text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="number" 
                            placeholder="Séries" 
                            value={ex.sets}
                            onChange={(e) => {
                              const updated = [...(newWorkout.exercises || [])];
                              updated[idx].sets = parseInt(e.target.value);
                              setNewWorkout({...newWorkout, exercises: updated});
                            }}
                            className="w-full bg-transparent border-none outline-none text-sm text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="text" 
                            placeholder="Reps" 
                            value={ex.reps}
                            onChange={(e) => {
                              const updated = [...(newWorkout.exercises || [])];
                              updated[idx].reps = e.target.value;
                              setNewWorkout({...newWorkout, exercises: updated});
                            }}
                            className="w-full bg-transparent border-none outline-none text-sm text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input 
                            type="text" 
                            placeholder="Desc" 
                            value={ex.rest_time}
                            onChange={(e) => {
                              const updated = [...(newWorkout.exercises || [])];
                              updated[idx].rest_time = e.target.value;
                              setNewWorkout({...newWorkout, exercises: updated});
                            }}
                            className="w-full bg-transparent border-none outline-none text-sm text-center"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button 
                            type="button"
                            onClick={() => {
                              const updated = [...(newWorkout.exercises || [])];
                              updated.splice(idx, 1);
                              setNewWorkout({...newWorkout, exercises: updated});
                            }}
                            className="text-red-500/50 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setShowAddWorkout(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar Treino'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Plan Modal */}
      <AnimatePresence>
        {showAddPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddPlan(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-[#151515] border border-white/5 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Novo Plano</h3>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Nome do Plano" 
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Preço (R$)" 
                  value={newPlan.price || ''}
                  onChange={(e) => setNewPlan({...newPlan, price: parseFloat(e.target.value)})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Duração (meses)" 
                  value={newPlan.duration_months || ''}
                  onChange={(e) => setNewPlan({...newPlan, duration_months: parseInt(e.target.value)})}
                  className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  required 
                />
                <div>
                  <label className="text-xs text-white/50 ml-1">Recursos (separados por vírgula)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Acesso 24h, Suporte, App" 
                    value={newPlan.features?.join(', ') || ''}
                    onChange={(e) => setNewPlan({...newPlan, features: e.target.value.split(',').map(f => f.trim())})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setShowAddPlan(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" disabled={creating} className="flex-1 btn-primary">
                    {creating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Criar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Plan Modal */}
      <AnimatePresence>
        {showEditPlan && editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditPlan(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-[#151515] border border-white/5 rounded-3xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Editar Plano</h3>
              <form onSubmit={handleUpdatePlan} className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 ml-1">Nome do Plano</label>
                  <input 
                    type="text" 
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 ml-1">Preço (R$)</label>
                  <input 
                    type="number" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 ml-1">Duração (meses)</label>
                  <input 
                    type="number" 
                    value={editingPlan.duration_months}
                    onChange={(e) => setEditingPlan({...editingPlan, duration_months: parseInt(e.target.value)})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 ml-1">Recursos (separados por vírgula)</label>
                  <input 
                    type="text" 
                    value={editingPlan.features?.join(', ') || ''}
                    onChange={(e) => setEditingPlan({...editingPlan, features: e.target.value.split(',').map(f => f.trim())})}
                    className="w-full bg-background border border-white/10 rounded-xl p-3 outline-none focus:border-primary" 
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setShowEditPlan(false)} className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Cancelar</button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
    >
      {active ? icon : <span className="text-white/30">{icon}</span>}
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, active, onClick, isCenter }: { icon: any, active: boolean, onClick: () => void, isCenter?: boolean }) {
  if (isCenter) {
    return (
      <button onClick={onClick} className="w-14 h-14 bg-primary rounded-full flex items-center justify-center -mt-10 shadow-xl shadow-primary/30 border-4 border-background active:scale-90 transition-all">
        {icon}
      </button>
    );
  }
  return (
    <button onClick={onClick} className={`p-2 rounded-xl transition-all ${active ? 'text-primary' : 'text-white/30'}`}>
      {icon}
    </button>
  );
}

const ClientCard: React.FC<{ 
  client: UserProfile, 
  onEdit: (c: UserProfile) => void,
  onAction: (tab: string, client: UserProfile) => void
}> = ({ client, onEdit, onAction }) => {
  return (
    <div className="bg-[#151515] border border-white/5 rounded-3xl p-6 shadow-lg hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
            <img src={client.metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.login}`} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-tight">{client.full_name || 'Sem Nome'}</h4>
            <div className="flex flex-col">
              <p className="text-xs text-white/30">@{client.login}</p>
              <p className="text-[9px] text-white/20 font-mono mt-1">ID: {client.id}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
            Ativo
          </div>
          <button 
            onClick={() => onEdit(client)}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all text-white/50 hover:text-white"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Status</p>
          <p className="text-sm font-semibold">Ativo</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Role</p>
          <p className="text-sm font-semibold capitalize">{client.role}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onAction('workouts', client)}
          className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
        >
          <Dumbbell className="w-3 h-3" /> Treino
        </button>
        <button 
          onClick={() => onAction('diets', client)}
          className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
        >
          <Apple className="w-3 h-3" /> Dieta
        </button>
        <button 
          onClick={() => onAction('messages', client)}
          className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
        >
          <MessageSquare className="w-3 h-3" /> Chat
        </button>
        <button 
          onClick={() => onAction('payments', client)}
          className="w-10 bg-white/5 hover:bg-primary hover:text-white py-2 rounded-lg transition-all flex items-center justify-center"
        >
          <CreditCard className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
