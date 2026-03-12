-- SCRIPT SQL COMPLETO PARA SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase para garantir que
-- todas as tabelas (pastas) e funções necessárias estão criadas corretamente.

-- 1. EXTENSÃO PARA UUID E HASHING
create extension if not exists "pgcrypto";

-- 2. TABELA DE USUÁRIOS
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  login text unique not null,
  password_hash text not null,
  role text not null default 'client',
  full_name text,
  metadata jsonb default '{}'::jsonb,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TRIGGER PARA MANTER UPDATED_AT
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_set_updated_at on public.app_users;
create trigger trg_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

-- 4. ÍNDICES 
create index if not exists idx_app_users_role on public.app_users (role);
create index if not exists idx_app_users_login_lower on public.app_users (lower(login));

-- 5. FUNÇÃO PARA CRIAR USUÁRIO COM SENHA HASHED
create or replace function public.create_app_user(
  p_login text,
  p_plain_password text,
  p_role text default 'client',
  p_full_name text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid as $$
declare
  v_hash text;
  v_id uuid;
begin
  if p_role is null then p_role := 'client'; end if;
  v_hash := crypt(p_plain_password, gen_salt('bf', 8));
  insert into public.app_users (login, password_hash, role, full_name, metadata)
  values (lower(p_login), v_hash, p_role, p_full_name, p_metadata)
  returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

-- 6. FUNÇÃO PARA VALIDAR SENHA
create or replace function public.verify_app_user_password(
  p_login text,
  p_plain_password text
) returns boolean as $$
declare
  v_hash text;
begin
  select password_hash into v_hash from public.app_users where lower(login) = lower(p_login);
  if v_hash is null then return false; end if;
  return v_hash = crypt(p_plain_password, v_hash);
end;
$$ language plpgsql stable;

-- 7. PASTA VIRTUAL DO CLIENTE
create table if not exists public.user_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  folder_name text,
  created_at timestamptz default now()
);

-- 8. TREINOS DO CLIENTE
create table if not exists public.client_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  workout_name text,
  description text,
  exercises jsonb,
  created_at timestamptz default now()
);

-- 9. DIETAS DO CLIENTE
create table if not exists public.client_diets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  diet_name text,
  description text,
  meals jsonb,
  created_at timestamptz default now()
);

-- 10. PROGRESSO DO CLIENTE
create table if not exists public.client_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  weight numeric,
  notes text,
  created_at timestamptz default now()
);

-- 11. MENSAGENS CLIENTE/ADMIN
create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  message text,
  sender_role text default 'admin', -- Adicionado para identificar mensagens do admin
  created_at timestamptz default now()
);
-- Adiciona a coluna se a tabela já existir e a coluna não (apenas precaução, o postgresql 12+ tem IF NOT EXISTS para colunas, mas vamos usar um bloco condicional opcional, ou falhar se existir)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.client_messages ADD COLUMN sender_role text DEFAULT 'admin';
  EXCEPTION
    WHEN duplicate_column THEN KEEP;
  END;
END $$;

-- 12. PLANOS
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  duration_months integer default 1,
  features jsonb,
  created_at timestamptz default now()
);

-- 13. PAGAMENTOS
create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  amount numeric,
  status text,
  created_at timestamptz default now()
);

-- 14. CONFIGURAÇÕES DA IA
create table if not exists public.config_ai (
  id uuid primary key default gen_random_uuid(),
  gemini_api_key text not null,
  model text default 'gemini-3.1-pro-preview',
  created_at timestamptz default now()
);

-- 15. CONFIGURAÇÕES DO APP
create table if not exists public.config_app (
  id uuid primary key default gen_random_uuid(),
  gym_name text default 'IA TRAINER',
  primary_color text default '#00FF00',
  created_at timestamptz default now()
);

-- 16. RÁDIOS DE TREINO (Tabela Nova Adicionada para o RadioPlayer)
create table if not exists public.training_radios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  genre text,
  stream_url text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Inserir algumas rádios padrão para teste, caso a tabela esteja vazia (opcional)
insert into public.training_radios (name, genre, stream_url, active)
select 'Gym Hardstyle', 'hardstyle', 'https://streams.ilovemusic.de/iloveradio17.mp3', true
where not exists (select 1 from public.training_radios where name = 'Gym Hardstyle');

insert into public.training_radios (name, genre, stream_url, active)
select 'Electronic Workout', 'edm', 'https://stream.technobase.fm/tunein-dsl.pls', true
where not exists (select 1 from public.training_radios where name = 'Electronic Workout');

-- 17. TRIGGER PARA CRIAR PASTA AUTOMÁTICA
create or replace function create_default_user_folders()
returns trigger
language plpgsql
as $$
begin
  insert into public.user_folders (user_id, folder_name)
  values
  (new.id,'treinos'),
  (new.id,'progresso'),
  (new.id,'mensagens'),
  (new.id,'pagamentos'),
  (new.id,'configuracoes');
  return new;
end;
$$;

drop trigger if exists create_user_folders_trigger on public.app_users;
create trigger create_user_folders_trigger
after insert on public.app_users
for each row
execute function create_default_user_folders();

-- 18. ADMIN INICIAL
insert into public.app_users (login, password_hash, role, full_name)
values ('admin@academia.com', '2486', 'admin', 'Administrador')
on conflict (login) do nothing;

-- 19. DESATIVAR RLS PARA TESTES RÁPIDOS (OU ADICIONAR POLÍTICAS)
alter table public.app_users disable row level security;
alter table public.client_workouts disable row level security;
alter table public.client_diets disable row level security;
alter table public.user_folders disable row level security;
alter table public.client_progress disable row level security;
alter table public.client_messages disable row level security;
alter table public.client_payments disable row level security;
alter table public.plans disable row level security;
alter table public.config_ai disable row level security;
alter table public.config_app disable row level security;
alter table public.training_radios disable row level security;

-- 20. BUCKET DE STORAGE (Imagens de Perfil)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Public Access to Avatars" on storage.objects
for select using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars" on storage.objects
for insert with check (bucket_id = 'avatars');

create policy "Authenticated users can update avatars" on storage.objects
for update using (bucket_id = 'avatars');

-- Script Concluído.
