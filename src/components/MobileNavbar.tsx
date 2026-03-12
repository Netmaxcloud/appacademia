import { Home, Dumbbell, TrendingUp, Apple, User } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function MobileNavbar({ activeTab, setActiveTab }: MobileNavbarProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'workouts', icon: Dumbbell, label: 'Treinos' },
    { id: 'progress', icon: TrendingUp, label: 'Progresso' },
    { id: 'diets', icon: Apple, label: 'Alimentação' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-2 z-40 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative flex flex-col items-center justify-center w-16 h-full gap-1"
          >
            <div className={`relative p-2 rounded-xl transition-colors ${isActive ? 'text-[#ff3b3b]' : 'text-white/40 hover:text-white/60'}`}>
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#ff3b3b]/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </div>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#ff3b3b]' : 'text-white/40'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
