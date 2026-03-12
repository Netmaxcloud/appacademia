import React from 'react';

interface FitnessCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  key?: React.Key;
}

export default function FitnessCard({ children, className = '', onClick, ...props }: FitnessCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#151515] border border-white/5 rounded-3xl p-5 shadow-lg ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
