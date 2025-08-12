
-- Função para normalizar telefone brasileiro para formato local (DDD + número), sem +55
create or replace function public.normalize_br_phone_local11(s text)
returns text
language plpgsql
as $$
declare
  d text;
begin
  if s is null then
    return null;
  end if;

  -- remove tudo que não for dígito
  d := regexp_replace(s, '\D', '', 'g');

  -- remove prefixo 55 se houver
  if position('55' in d) = 1 then
    d := substr(d, 3);
  end if;

  -- se veio maior que 11, mantém os 11 últimos dígitos
  if length(d) > 11 then
    d := right(d, 11);
  end if;

  if d = '' then
    return null;
  end if;

  return d;
end;
$$;

-- Trigger function para normalizar moradores.telefone
create or replace function public.tg_norm_moradores_phone()
returns trigger
language plpgsql
as $$
begin
  if new.telefone is not null then
    new.telefone := public.normalize_br_phone_local11(new.telefone);
  end if;
  return new;
end;
$$;

-- Drop e recria o trigger
drop trigger if exists trg_norm_moradores_phone on public.moradores;

create trigger trg_norm_moradores_phone
before insert or update of telefone on public.moradores
for each row
execute function public.tg_norm_moradores_phone();

-- Backfill: atualiza telefones existentes para o padrão local de 11 dígitos
update public.moradores
set telefone = public.normalize_br_phone_local11(telefone)
where telefone is not null;

-- Índice para acelerar a busca pelo telefone
create index if not exists idx_moradores_telefone on public.moradores using btree (telefone);
