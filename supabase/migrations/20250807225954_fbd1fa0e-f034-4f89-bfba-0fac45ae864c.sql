
-- 1) Tabela de integrações por condomínio (mapear phone_number_id)
create table if not exists public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  phone_number_id text not null,
  display_name text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garante 1 integração por condomínio
create unique index if not exists whatsapp_integrations_condo_uidx
  on public.whatsapp_integrations (condominio_id);

-- Trigger de updated_at
drop trigger if exists trg_whatsapp_integrations_updated_at on public.whatsapp_integrations;
create trigger trg_whatsapp_integrations_updated_at
before update on public.whatsapp_integrations
for each row execute function public.update_updated_at_column();

alter table public.whatsapp_integrations enable row level security;

-- Acesso total para service_role (webhook)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_integrations'
      and policyname = 'Service role full access - whatsapp_integrations'
  ) then
    create policy "Service role full access - whatsapp_integrations"
      on public.whatsapp_integrations
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Admins ou síndico do condomínio podem gerenciar integrações
do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_integrations'
      and policyname = 'Admins e síndicos podem ver integrações'
  ) then
    create policy "Admins e síndicos podem ver integrações"
      on public.whatsapp_integrations
      for select
      using (is_admin() or is_sindico_of_condo(condominio_id));
  end if;

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_integrations'
      and policyname = 'Admins e síndicos podem inserir integrações'
  ) then
    create policy "Admins e síndicos podem inserir integrações"
      on public.whatsapp_integrations
      for insert
      with check (is_admin() or is_sindico_of_condo(condominio_id));
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_integrations'
      and policyname = 'Admins e síndicos podem atualizar integrações'
  ) then
    create policy "Admins e síndicos podem atualizar integrações"
      on public.whatsapp_integrations
      for update
      using (is_admin() or is_sindico_of_condo(condominio_id))
      with check (is_admin() or is_sindico_of_condo(condominio_id));
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_integrations'
      and policyname = 'Admins e síndicos podem deletar integrações'
  ) then
    create policy "Admins e síndicos podem deletar integrações"
      on public.whatsapp_integrations
      for delete
      using (is_admin() or is_sindico_of_condo(condominio_id));
  end if;
end$$;

-- 2) Tabela de sessões do chatbot por morador/condomínio
create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  morador_id uuid not null,
  state text not null default 'idle',
  context jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists whatsapp_sessions_condo_morador_idx
  on public.whatsapp_sessions (condominio_id, morador_id);

create index if not exists whatsapp_sessions_updated_at_idx
  on public.whatsapp_sessions (updated_at desc);

-- Trigger de updated_at
drop trigger if exists trg_whatsapp_sessions_updated_at on public.whatsapp_sessions;
create trigger trg_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row execute function public.update_updated_at_column();

alter table public.whatsapp_sessions enable row level security;

-- Acesso total para service_role (webhook)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_sessions'
      and policyname = 'Service role full access - whatsapp_sessions'
  ) then
    create policy "Service role full access - whatsapp_sessions"
      on public.whatsapp_sessions
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- SELECT por admins/síndicos/usuários vinculados ao condomínio
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_sessions'
      and policyname = 'Usuários podem ver sessões dos seus condomínios'
  ) then
    create policy "Usuários podem ver sessões dos seus condomínios"
      on public.whatsapp_sessions
      for select
      using (
        (condominio_id in (
          select c.id
          from (public.condominios c
            join public.usuarios u on (c.sindico_responsavel = u.id))
          where u.email = (auth.jwt() ->> 'email')
        ))
        or (condominio_id in (
          select uc.condominio_id
          from (public.usuarios_condominio uc
            join public.usuarios u on (uc.usuario_id = u.id))
          where u.email = (auth.jwt() ->> 'email')
        ))
        or exists (
          select 1 from public.usuarios
          where usuarios.email = (auth.jwt() ->> 'email')
            and usuarios.tipo_acesso = 'admin'::tipo_acesso
        )
      );
  end if;
end$$;

-- 3) Tabela de mensagens WhatsApp
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null,
  morador_id uuid not null,
  direction text not null check (direction in ('inbound','outbound')),
  provider_message_id text,
  body text,
  type text not null default 'text',
  status text,
  timestamp timestamptz not null default now(),
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Índices úteis
create index if not exists whatsapp_messages_condo_ts_idx
  on public.whatsapp_messages (condominio_id, timestamp desc);

create index if not exists whatsapp_messages_morador_ts_idx
  on public.whatsapp_messages (morador_id, timestamp desc);

alter table public.whatsapp_messages enable row level security;

-- Acesso total para service_role (webhook)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_messages'
      and policyname = 'Service role full access - whatsapp_messages'
  ) then
    create policy "Service role full access - whatsapp_messages"
      on public.whatsapp_messages
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- SELECT por admins/síndicos/usuários vinculados ao condomínio
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'whatsapp_messages'
      and policyname = 'Usuários podem ver mensagens dos seus condomínios'
  ) then
    create policy "Usuários podem ver mensagens dos seus condomínios"
      on public.whatsapp_messages
      for select
      using (
        (condominio_id in (
          select c.id
          from (public.condominios c
            join public.usuarios u on (c.sindico_responsavel = u.id))
          where u.email = (auth.jwt() ->> 'email')
        ))
        or (condominio_id in (
          select uc.condominio_id
          from (public.usuarios_condominio uc
            join public.usuarios u on (uc.usuario_id = u.id))
          where u.email = (auth.jwt() ->> 'email')
        ))
        or exists (
          select 1 from public.usuarios
          where usuarios.email = (auth.jwt() ->> 'email')
            and usuarios.tipo_acesso = 'admin'::tipo_acesso
        )
      );
  end if;
end$$;
