-- FrotaFácil - equipe (convites). Rodar uma vez no SQL Editor depois do schema.sql.
--
-- Papéis em membros.papel: 'dono' (quem criou a empresa, administra tudo) e 'membro' (funcionário).
-- Fluxo: o dono convida um e-mail em Minha Equipe. Quando a pessoa criar a conta com esse e-mail, o
-- gatilho já a coloca na empresa do dono. Se ela já tem conta, aceita o convite na mesma tela.

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email text not null,
  status text not null default 'pendente',
  criado_em timestamptz not null default now(),
  unique (empresa_id, email)
);
alter table public.convites enable row level security;

-- Funções auxiliares (security definer evita recursão nas políticas de membros).
create or replace function public.minha_empresa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.membros where user_id = auth.uid()
$$;

create or replace function public.sou_dono() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membros where user_id = auth.uid() and papel in ('dono', 'administrador'))
$$;

-- Todo mundo da empresa enxerga os colegas.
drop policy if exists "ver_proprio_membro" on public.membros;
drop policy if exists "ver_membros_da_empresa" on public.membros;
create policy "ver_membros_da_empresa" on public.membros for select
  using (empresa_id = public.minha_empresa_id());

-- Convites: o dono vê/cria/apaga os da empresa; o convidado vê os que são para o e-mail dele.
drop policy if exists "convites_ver" on public.convites;
drop policy if exists "convites_criar" on public.convites;
drop policy if exists "convites_apagar" on public.convites;
create policy "convites_ver" on public.convites for select
  using ((empresa_id = public.minha_empresa_id() and public.sou_dono())
         or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "convites_criar" on public.convites for insert
  with check (empresa_id = public.minha_empresa_id() and public.sou_dono());
create policy "convites_apagar" on public.convites for delete
  using (empresa_id = public.minha_empresa_id() and public.sou_dono());

-- O convidado precisa ler o nome da empresa que o convidou.
drop policy if exists "ver_empresa_que_convidou" on public.empresas;
create policy "ver_empresa_que_convidou" on public.empresas for select
  using (id in (select empresa_id from public.convites
                where status = 'pendente' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))));

-- Cadastro: se havia convite pendente para o e-mail, entra na empresa do convite; senão cria a própria (como dono).
create or replace function public.lidar_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nova_empresa_id uuid;
  conv record;
begin
  select * into conv from public.convites
    where lower(email) = lower(new.email) and status = 'pendente' order by criado_em limit 1;
  if found then
    insert into public.membros (user_id, empresa_id, email, papel) values (new.id, conv.empresa_id, new.email, 'membro');
    update public.convites set status = 'aceito' where id = conv.id;
  else
    insert into public.empresas (nome) values (split_part(new.email, '@', 1)) returning id into nova_empresa_id;
    insert into public.membros (user_id, empresa_id, email, papel) values (new.id, nova_empresa_id, new.email, 'dono');
  end if;
  return new;
end;
$$;

-- Quem já tinha conta aceita o convite e passa a ver os dados da empresa do dono.
create or replace function public.aceitar_convite(p_convite_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare conv record;
begin
  select * into conv from public.convites
    where id = p_convite_id and status = 'pendente' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  if not found then raise exception 'Convite não encontrado ou já usado.'; end if;
  update public.membros set empresa_id = conv.empresa_id, papel = 'membro' where user_id = auth.uid();
  update public.convites set status = 'aceito' where id = conv.id;
end;
$$;
grant execute on function public.aceitar_convite(uuid) to authenticated;

-- Só o dono remove alguém; a pessoa não perde a conta, ganha uma empresa própria vazia.
create or replace function public.remover_membro(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare nova uuid; alvo_email text;
begin
  if not public.sou_dono() then raise exception 'Só o dono da empresa pode remover membros.'; end if;
  if p_user_id = auth.uid() then raise exception 'Você não pode remover a si mesmo.'; end if;
  select email into alvo_email from public.membros where user_id = p_user_id and empresa_id = public.minha_empresa_id();
  if not found then raise exception 'Essa pessoa não é da sua equipe.'; end if;
  insert into public.empresas (nome) values (split_part(alvo_email, '@', 1)) returning id into nova;
  update public.membros set empresa_id = nova, papel = 'dono' where user_id = p_user_id;
end;
$$;
grant execute on function public.remover_membro(uuid) to authenticated;

-- Quem já se cadastrou antes desta migração como 'administrador' vira 'dono'.
update public.membros set papel = 'dono' where papel = 'administrador';
