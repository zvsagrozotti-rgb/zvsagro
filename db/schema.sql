-- VZS Agro — schema inicial (Supabase / PostgreSQL)
--
-- Rodar uma vez no SQL Editor do projeto Supabase "vzsagro" (organização
-- zvsagrozotti-rgb). Depois, em Project Settings -> API, copiar a "Project
-- URL" e a "anon public key" para app/src/logic/supabaseClient.js.
--
-- Arquitetura (mesma já validada em produção no AegroFin Online / AegroFarm):
--   - "empresas" = o tenant (espaço de dados de uma empresa).
--   - "membros" liga cada login (auth.users) a UMA empresa, com um papel.
--   - "registros" é uma tabela genérica (id, entidade, dados jsonb) que
--     guarda TODOS os cadastros (clientes, veículos, abastecimentos,
--     contas/lançamentos financeiros...) — cada "entidade" é só uma
--     etiqueta de texto, evitando migração de schema a cada campo novo.

create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text,
  criado_em timestamptz not null default now()
);

create table if not exists public.membros (
  user_id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email text,
  papel text not null default 'administrador',
  criado_em timestamptz not null default now()
);
create index if not exists membros_empresa_idx on public.membros(empresa_id);

create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  dados jsonb not null default '{}'::jsonb,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  criado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists registros_empresa_entidade_idx on public.registros(empresa_id, entidade);

-- Ao criar conta (auth.users), cria a empresa e vincula o usuário como
-- administrador automaticamente — ninguém usa o app sem ter uma empresa.
create or replace function public.lidar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_empresa_id uuid;
begin
  insert into public.empresas (nome) values (split_part(new.email, '@', 1))
  returning id into nova_empresa_id;

  insert into public.membros (user_id, empresa_id, email, papel)
  values (new.id, nova_empresa_id, new.email, 'administrador');

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.lidar_novo_usuario();

-- Realtime: permite o app saber ao vivo quando outro aparelho/usuário muda
-- um registro (ver src/logic/store.js -> assinar()).
alter publication supabase_realtime add table public.registros;

-- RLS: cada empresa só enxerga os próprios dados. Sem exceção.
alter table public.empresas enable row level security;
alter table public.membros enable row level security;
alter table public.registros enable row level security;

create policy "ver_propria_empresa" on public.empresas for select
  using (id in (select empresa_id from public.membros where user_id = auth.uid()));

create policy "ver_proprio_membro" on public.membros for select
  using (user_id = auth.uid());

create policy "crud_registros_da_propria_empresa" on public.registros for all
  using (empresa_id in (select empresa_id from public.membros where user_id = auth.uid()))
  with check (empresa_id in (select empresa_id from public.membros where user_id = auth.uid()));

-- Autoatendimento: a pessoa exclui a própria conta (usado em ContaScreen).
-- Bloqueia se houver outros membros na mesma empresa (precisam ser removidos
-- da equipe primeiro) para não apagar os dados de quem ainda usa o sistema.
create or replace function public.excluir_minha_conta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_outros_membros int;
begin
  select empresa_id into v_empresa_id from public.membros where user_id = auth.uid();
  if v_empresa_id is null then
    raise exception 'Nenhuma empresa vinculada a este usuário.';
  end if;

  select count(*) into v_outros_membros from public.membros
    where empresa_id = v_empresa_id and user_id <> auth.uid();
  if v_outros_membros > 0 then
    raise exception 'Remova os outros membros da equipe antes de excluir sua conta.';
  end if;

  delete from public.registros where empresa_id = v_empresa_id;
  delete from public.membros where user_id = auth.uid();
  delete from public.empresas where id = v_empresa_id;
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.excluir_minha_conta() to authenticated;
