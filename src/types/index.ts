export type UserRole = 'admin' | 'client';

export interface UserProfile {
  id: string;
  login: string;
  password_hash?: string;
  role: UserRole;
  full_name?: string;
  email?: string;
  age?: number;
  weight?: number;
  height?: number;
  objective?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  metadata?: any;
  created_at?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_name: string;
  name?: string; // Alias for workout_name
  description?: string;
  exercises: Exercise[];
  created_at?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  rest_time: string;
}

export interface Progress {
  id: string;
  user_id: string;
  weight: number;
  notes?: string;
  created_at?: string;
}

export interface Message {
  id: string;
  user_id: string;
  message: string;
  created_at?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  features: string[];
  created_at?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  plan_id?: string;
  amount: number;
  status: string;
  created_at?: string;
}

export interface Diet {
  id: string;
  user_id: string;
  name: string;
  meals: any[];
  created_at?: string;
}

export interface AIConfig {
  id: string;
  gemini_api_key: string;
  model: string;
}
