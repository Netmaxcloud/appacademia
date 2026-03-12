import React from 'react';
import { motion } from 'motion/react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export default function PrimaryButton({ children, icon, fullWidth = true, className = '', ...props }: PrimaryButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      className={`bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_4px_20px_rgba(255,59,59,0.3)] ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}
