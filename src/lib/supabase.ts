import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SUPABASE SCHEMA (SQL):
 * 
 * -- EXTENSÃO PARA UUID E HASHING
 * create extension if not exists "pgcrypto";
 * 
 * -- TABELA DE USUÁRIOS
 * create table if not exists public.app_users (
 *   id uuid primary key default gen_random_uuid(),
 *   login text unique not null,
 *   password_hash text not null,
 *   role text not null default 'client',
 *   full_name text,
 *   metadata jsonb default '{}'::jsonb,
 *   preferences jsonb default '{}'::jsonb,
 *   created_at timestamptz not null default now(),
 *   updated_at timestamptz not null default now()
 * );
 * 
 * -- TRIGGER PARA MANTER UPDATED_AT
 * create or replace function public.set_updated_at()
 * returns trigger as $$
 * begin
 *   new.updated_at = now();
 *   return new;
 * end;
 * $$ language plpgsql security definer;
 * 
 * drop trigger if exists trg_set_updated_at on public.app_users;
 * create trigger trg_set_updated_at
 * before update on public.app_users
 * for each row execute function public.set_updated_at();
 * 
 * -- ÍNDICES E CONSTRAINTS
 * create index if not exists idx_app_users_role on public.app_users (role);
 * create index if not exists idx_app_users_login_lower on public.app_users (lower(login));
 * 
 * -- FUNÇÃO PARA CRIAR USUÁRIO COM SENHA HASHED
 * create or replace function public.create_app_user(
 *   p_login text,
 *   p_plain_password text,
 *   p_role text default 'client',
 *   p_full_name text default null,
 *   p_metadata jsonb default '{}'::jsonb
 * ) returns uuid as $$
 * declare
 *   v_hash text;
 *   v_id uuid;
 * begin
 *   if p_role is null then p_role := 'client'; end if;
 *   v_hash := crypt(p_plain_password, gen_salt('bf', 8));
 *   insert into public.app_users (login, password_hash, role, full_name, metadata)
 *   values (lower(p_login), v_hash, p_role, p_full_name, p_metadata)
 *   returning id into v_id;
 *   return v_id;
 * end;
 * $$ language plpgsql security definer;
 * 
 * -- FUNÇÃO PARA VALIDAR SENHA
 * create or replace function public.verify_app_user_password(
 *   p_login text,
 *   p_plain_password text
 * ) returns boolean as $$
 * declare
 *   v_hash text;
 * begin
 *   select password_hash into v_hash from public.app_users where lower(login) = lower(p_login);
 *   if v_hash is null then return false; end if;
 *   return v_hash = crypt(p_plain_password, v_hash);
 * end;
 * $$ language plpgsql stable;
 * 
 * -- PASTA VIRTUAL DO CLIENTE
 * create table if not exists public.user_folders (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   folder_name text,
 *   created_at timestamptz default now()
 * );
 * 
 * -- TREINOS DO CLIENTE
 * create table if not exists public.client_workouts (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   workout_name text,
 *   description text,
 *   exercises jsonb,
 *   created_at timestamptz default now()
 * );
 * 
 * -- DIETAS DO CLIENTE
 * create table if not exists public.client_diets (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   diet_name text,
 *   description text,
 *   meals jsonb,
 *   created_at timestamptz default now()
 * );
 * 
 * -- PROGRESSO DO CLIENTE
 * create table if not exists public.client_progress (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   weight numeric,
 *   notes text,
 *   created_at timestamptz default now()
 * );
 * 
 * -- MENSAGENS ADMIN -> CLIENTE
 * create table if not exists public.client_messages (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   message text,
 *   created_at timestamptz default now()
 * );
 * 
 * -- PLANOS
 * create table if not exists public.plans (
 *   id uuid primary key default gen_random_uuid(),
 *   name text not null,
 *   price numeric not null,
 *   duration_months integer default 1,
 *   features jsonb,
 *   created_at timestamptz default now()
 * );
 * 
 * -- PAGAMENTOS
 * create table if not exists public.client_payments (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid references public.app_users(id) on delete cascade,
 *   plan_id uuid references public.plans(id) on delete set null,
 *   amount numeric,
 *   status text,
 *   created_at timestamptz default now()
 * );
 * 
 * -- CONFIGURAÇÕES DA IA
 * create table if not exists public.config_ai (
 *   id uuid primary key default gen_random_uuid(),
 *   gemini_api_key text not null,
 *   model text default 'gemini-3.1-pro-preview',
 *   created_at timestamptz default now()
 * );
 * 
 * -- CONFIGURAÇÕES DO APP
 * create table if not exists public.config_app (
 *   id uuid primary key default gen_random_uuid(),
 *   gym_name text default 'IA TRAINER',
 *   primary_color text default '#00FF00',
 *   created_at timestamptz default now()
 * );
 * 
 * -- TRIGGER PARA CRIAR PASTA AUTOMÁTICA
 * create or replace function create_default_user_folders()
 * returns trigger
 * language plpgsql
 * as $$
 * begin
 *   insert into public.user_folders (user_id, folder_name)
 *   values
 *   (new.id,'treinos'),
 *   (new.id,'progresso'),
 *   (new.id,'mensagens'),
 *   (new.id,'pagamentos'),
 *   (new.id,'configuracoes');
 *   return new;
 * end;
 * $$;
 * 
 * create trigger create_user_folders_trigger
 * after insert on public.app_users
 * for each row
 * execute function create_default_user_folders();
 * 
 * -- Inserir admin inicial
 * insert into public.app_users (login, password_hash, role, full_name)
 * values ('admin@academia.com', '2486', 'admin', 'Administrador')
 * on conflict (login) do nothing;
 * 
 * -- DESATIVAR RLS PARA TESTES (OU ADICIONAR POLÍTICAS)
 * alter table public.app_users disable row level security;
 * alter table public.client_workouts disable row level security;
 * alter table public.client_diets disable row level security;
 * alter table public.user_folders disable row level security;
 * alter table public.client_progress disable row level security;
 * alter table public.client_messages disable row level security;
 * alter table public.client_payments disable row level security;
 * alter table public.plans disable row level security;
 * alter table public.config_ai disable row level security;
 * alter table public.config_app disable row level security;
 */
