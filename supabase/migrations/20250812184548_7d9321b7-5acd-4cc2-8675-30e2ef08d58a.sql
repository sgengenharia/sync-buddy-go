
-- Extensão para UUID
create extension if not exists pgcrypto;

-- 1) Funções auxiliares de segurança e atualização
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Função: obter o id do usuário (tabela usuarios) a partir do email do JWT
create or replace function public.get_current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.usuarios u
  where u.email = (auth.jwt() ->> 'email')
  limit 1
$$;

-- Função: verificar se é admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios
    where email = (auth.jwt() ->> 'email')
      and tipo_acesso = 'admin'
  )
$$;

-- Função: verificar acesso a condomínio
create or replace function public.has_condo_access(_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin(), false)
         or exists (
           select 1
           from public.usuarios_condominio uc
           where uc.usuario_id = public.get_current_usuario_id()
             and uc.condominio_id = _condominio_id
         )
$$;

-- Função: verificar acesso a um espaço
create or replace function public.has_access_to_espaco(_espaco_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin(), false)
         or exists (
           select 1
           from public.espacos e
           where e.id = _espaco_id
             and public.has_condo_access(e.condominio_id)
         )
$$;

-- Função: verificar acesso a um chamado CRM
create or replace function public.has_access_to_chamado(_chamado_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin(), false)
         or exists (
           select 1
           from public.chamados_crm c
           where c.id = _chamado_id
             and public.has_condo_access(c.condominio_id)
         )
$$;

-- 2) Tabelas base e relacionamentos

-- usuarios
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  tipo_acesso text not null check (tipo_acesso in ('sindico','zelador','portaria','admin')),
  nome_exibicao text,
  telefone text,
  created_at timestamptz not null default now()
);
alter table public.usuarios enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Usuarios view self'
  ) then
    create policy "Usuarios view self"
      on public.usuarios
      for select
      to authenticated
      using (email = (auth.jwt() ->> 'email'));
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='usuarios' and policyname='Admins full on usuarios'
  ) then
    create policy "Admins full on usuarios"
      on public.usuarios
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- condominios
create table if not exists public.condominios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  telefone text,
  cnpj text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  sindico_responsavel uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.condominios enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='condominios' and policyname='Condominios read for authenticated') then
    create policy "Condominios read for authenticated"
      on public.condominios
      for select
      to authenticated
      using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='condominios' and policyname='Admins manage condominios') then
    create policy "Admins manage condominios"
      on public.condominios
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- usuarios_condominio
create table if not exists public.usuarios_condominio (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  paginas_liberadas text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (usuario_id, condominio_id)
);
create index if not exists idx_usuarios_condominio_cond_user on public.usuarios_condominio(condominio_id, usuario_id);
alter table public.usuarios_condominio enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='usuarios_condominio' and policyname='Usuarios-condominio select own or admin') then
    create policy "Usuarios-condominio select own or admin"
      on public.usuarios_condominio
      for select
      to authenticated
      using (public.is_admin() or usuario_id = public.get_current_usuario_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='usuarios_condominio' and policyname='Admins manage usuarios_condominio') then
    create policy "Admins manage usuarios_condominio"
      on public.usuarios_condominio
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

-- moradores
create table if not exists public.moradores (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  unidade text not null,
  bloco text,
  telefone text not null,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  permissoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_moradores_condominio_status on public.moradores(condominio_id, status);
create index if not exists idx_moradores_condominio_unidade on public.moradores(condominio_id, unidade);
alter table public.moradores enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='moradores' and policyname='Moradores read by condo or admin') then
    create policy "Moradores read by condo or admin"
      on public.moradores
      for select
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='moradores' and policyname='Moradores write by condo or admin') then
    create policy "Moradores write by condo or admin"
      on public.moradores
      for insert
      to authenticated
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Moradores update by condo or admin"
      on public.moradores
      for update
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id))
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Moradores delete by admin"
      on public.moradores
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- whatsapp_integrations
create table if not exists public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  provider text not null check (provider in ('meta','zapi')),
  phone_number_id text,
  zapi_instance_id text,
  display_name text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (condominio_id)
);
drop trigger if exists trg_wi_set_updated_at on public.whatsapp_integrations;
create trigger trg_wi_set_updated_at
before update on public.whatsapp_integrations
for each row execute function public.set_updated_at();

alter table public.whatsapp_integrations enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_integrations' and policyname='WA integrations by condo or admin - select') then
    create policy "WA integrations by condo or admin - select"
      on public.whatsapp_integrations
      for select
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_integrations' and policyname='WA integrations by condo or admin - write') then
    create policy "WA integrations by condo or admin - write"
      on public.whatsapp_integrations
      for insert
      to authenticated
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "WA integrations update"
      on public.whatsapp_integrations
      for update
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id))
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "WA integrations delete (admin)"
      on public.whatsapp_integrations
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- whatsapp_messages
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  morador_id uuid references public.moradores(id) on delete set null,
  body jsonb,
  raw jsonb,
  timestamp timestamptz not null default now(),
  direction text not null check (direction in ('inbound','outbound')),
  status text
);
create index if not exists idx_whatsapp_messages_cond_time on public.whatsapp_messages(condominio_id, timestamp desc);
create index if not exists idx_whatsapp_messages_morador on public.whatsapp_messages(morador_id);
alter table public.whatsapp_messages enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_messages' and policyname='WA messages select by condo or admin') then
    create policy "WA messages select by condo or admin"
      on public.whatsapp_messages
      for select
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_messages' and policyname='WA messages insert by condo or admin') then
    create policy "WA messages insert by condo or admin"
      on public.whatsapp_messages
      for insert
      to authenticated
      with check (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_messages' and policyname='WA messages update/delete admin') then
    create policy "WA messages update admin"
      on public.whatsapp_messages
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
    create policy "WA messages delete admin"
      on public.whatsapp_messages
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- espacos
create table if not exists public.espacos (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  nome text not null,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  valor_diaria numeric(12,2) default 0,
  capacidade integer default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_espacos_condominio_status on public.espacos(condominio_id, status);
alter table public.espacos enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='espacos' and policyname='Espacos read by condo or admin') then
    create policy "Espacos read by condo or admin"
      on public.espacos
      for select
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='espacos' and policyname='Espacos write by condo or admin') then
    create policy "Espacos write by condo or admin"
      on public.espacos
      for insert
      to authenticated
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Espacos update by condo or admin"
      on public.espacos
      for update
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id))
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Espacos delete admin"
      on public.espacos
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- reservas
create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  espaco_id uuid not null references public.espacos(id) on delete cascade,
  morador_id uuid not null references public.moradores(id) on delete restrict,
  data_reserva date not null,
  status text not null default 'pendente' check (status in ('pendente','aprovada','cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  unique (espaco_id, data_reserva)
);
create index if not exists idx_reservas_espaco_data on public.reservas(espaco_id, data_reserva);
alter table public.reservas enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reservas' and policyname='Reservas read by espaco access') then
    create policy "Reservas read by espaco access"
      on public.reservas
      for select
      to authenticated
      using (public.has_access_to_espaco(espaco_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reservas' and policyname='Reservas write by espaco access') then
    create policy "Reservas write by espaco access"
      on public.reservas
      for insert
      to authenticated
      with check (public.has_access_to_espaco(espaco_id));
    create policy "Reservas update by espaco access"
      on public.reservas
      for update
      to authenticated
      using (public.has_access_to_espaco(espaco_id))
      with check (public.has_access_to_espaco(espaco_id));
    create policy "Reservas delete admin"
      on public.reservas
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- chamados_crm
create table if not exists public.chamados_crm (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominios(id) on delete cascade,
  morador_id uuid references public.moradores(id) on delete set null,
  tipo text not null,
  urgencia text not null,
  telefone_contato text,
  status text not null default 'novo' check (status in ('novo','em_andamento','aguardando','resolvido')),
  descricao text not null,
  data_criacao timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tags text[] not null default '{}'
);
create index if not exists idx_chamados_condominio_status on public.chamados_crm(condominio_id, status);
create index if not exists idx_chamados_data on public.chamados_crm(data_criacao desc);
drop trigger if exists trg_chamados_set_updated_at on public.chamados_crm;
create trigger trg_chamados_set_updated_at
before update on public.chamados_crm
for each row execute function public.set_updated_at();

alter table public.chamados_crm enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chamados_crm' and policyname='Chamados read by condo or admin') then
    create policy "Chamados read by condo or admin"
      on public.chamados_crm
      for select
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chamados_crm' and policyname='Chamados write by condo or admin') then
    create policy "Chamados write by condo or admin"
      on public.chamados_crm
      for insert
      to authenticated
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Chamados update by condo or admin"
      on public.chamados_crm
      for update
      to authenticated
      using (public.is_admin() or public.has_condo_access(condominio_id))
      with check (public.is_admin() or public.has_condo_access(condominio_id));
    create policy "Chamados delete admin"
      on public.chamados_crm
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- atividades_crm
create table if not exists public.atividades_crm (
  id uuid primary key default gen_random_uuid(),
  chamado_id uuid not null references public.chamados_crm(id) on delete cascade,
  tipo text not null,
  conteudo text,
  metadata jsonb not null default '{}'::jsonb,
  autor_usuario_id uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_ativ_set_updated_at on public.atividades_crm;
create trigger trg_ativ_set_updated_at
before update on public.atividades_crm
for each row execute function public.set_updated_at();

alter table public.atividades_crm enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='atividades_crm' and policyname='Atividades select by chamado access') then
    create policy "Atividades select by chamado access"
      on public.atividades_crm
      for select
      to authenticated
      using (public.has_access_to_chamado(chamado_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='atividades_crm' and policyname='Atividades insert by chamado access') then
    create policy "Atividades insert by chamado access"
      on public.atividades_crm
      for insert
      to authenticated
      with check (public.has_access_to_chamado(chamado_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='atividades_crm' and policyname='Atividades update/delete admin') then
    create policy "Atividades update admin"
      on public.atividades_crm
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
    create policy "Atividades delete admin"
      on public.atividades_crm
      for delete
      to authenticated
      using (public.is_admin());
  end if;
end $$;

-- tentativas_login (precisa funcionar ANTES do login)
create table if not exists public.tentativas_login (
  email text primary key,
  quantidade integer not null default 0,
  ultimo_reset timestamptz
);
alter table public.tentativas_login enable row level security;
do $$
begin
  -- Permitir leitura e escrita pública (anon e authenticated) apenas nesta tabela
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tentativas_login' and policyname='Tentativas login select public') then
    create policy "Tentativas login select public"
      on public.tentativas_login
      for select
      to public
      using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tentativas_login' and policyname='Tentativas login upsert public') then
    create policy "Tentativas login upsert public"
      on public.tentativas_login
      for insert
      to public
      with check (true);
    create policy "Tentativas login update public"
      on public.tentativas_login
      for update
      to public
      using (true)
      with check (true);
  end if;
end $$;

-- 3) Realtime: adicionar tabelas à publicação e REPLICA IDENTITY
alter table public.whatsapp_messages replica identity full;
alter table public.whatsapp_integrations replica identity full;
alter table public.chamados_crm replica identity full;
alter table public.atividades_crm replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='whatsapp_messages') then
    execute 'alter publication supabase_realtime add table public.whatsapp_messages';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='whatsapp_integrations') then
    execute 'alter publication supabase_realtime add table public.whatsapp_integrations';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chamados_crm') then
    execute 'alter publication supabase_realtime add table public.chamados_crm';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='atividades_crm') then
    execute 'alter publication supabase_realtime add table public.atividades_crm';
  end if;
end $$;

-- 4) Seed do usuário admin na tabela usuarios (necessário para o app reconhecer o papel)
insert into public.usuarios (email, tipo_acesso, nome_exibicao, telefone)
values ('comercial@sgeng.com.br', 'admin', 'Suporte SGEng', null)
on conflict (email) do update set tipo_acesso = excluded.tipo_acesso;
