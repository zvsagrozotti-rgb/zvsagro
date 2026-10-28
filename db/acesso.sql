-- FrotaFácil - quem enxerga o quê (rodar depois de schema.sql e equipe.sql).
--
-- Dono (administrador): vê e altera tudo da empresa.
-- Membro (funcionário): só enxerga e mexe no que é dele, achado pelo e-mail de login cadastrado no
-- cadastro de Funcionários:
--   - o próprio cadastro de funcionário;
--   - os próprios cupons, fotos de cupom e abastecimentos gerados por cupom (lança e corrige; abastecimento leva funcionarioId);
--   - os próprios adiantamentos (só leitura: quem lança saldo é o dono);
--   - leitura (só consulta) de veículos, abastecimentos de toda a frota, histórico de uso dos veículos e perfil da empresa.

-- id do funcionário ligado ao e-mail de quem está logado (null se não houver).
create or replace function public.meu_funcionario_id() returns text
language sql stable security definer set search_path = public as $$
  select r.id::text from public.registros r
  where r.entidade = 'funcionarios'
    and r.empresa_id = (select empresa_id from public.membros where user_id = auth.uid())
    and lower(coalesce(r.dados ->> 'email', '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

-- a foto tem o mesmo id do cupom: confere se o cupom é do funcionário logado.
create or replace function public.cupom_e_meu(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.registros c
    where c.id = p_id and c.entidade = 'cupons'
      and c.dados ->> 'funcionarioId' = public.meu_funcionario_id()
  )
$$;

drop policy if exists "crud_registros_da_propria_empresa" on public.registros;
drop policy if exists "dono_tudo" on public.registros;
drop policy if exists "membro_le" on public.registros;
drop policy if exists "membro_insere" on public.registros;
drop policy if exists "membro_altera" on public.registros;
drop policy if exists "membro_apaga" on public.registros;

create policy "dono_tudo" on public.registros for all
  using (empresa_id = public.minha_empresa_id() and public.sou_dono())
  with check (empresa_id = public.minha_empresa_id() and public.sou_dono());

create policy "membro_le" on public.registros for select
  using (empresa_id = public.minha_empresa_id() and (
    entidade in ('veiculos', 'abastecimentos', 'usos', 'empresa_perfil')
    or (entidade = 'funcionarios' and id::text = public.meu_funcionario_id())
    or (entidade in ('cupons', 'adiantamentos') and dados ->> 'funcionarioId' = public.meu_funcionario_id())
    or (entidade = 'cupom_fotos' and public.cupom_e_meu(id))
  ));

create policy "membro_insere" on public.registros for insert
  with check (empresa_id = public.minha_empresa_id() and (
    (entidade in ('cupons', 'abastecimentos') and dados ->> 'funcionarioId' = public.meu_funcionario_id())
    or (entidade = 'cupom_fotos' and public.cupom_e_meu(id))
  ));

create policy "membro_altera" on public.registros for update
  using (empresa_id = public.minha_empresa_id() and (
    (entidade in ('cupons', 'abastecimentos') and dados ->> 'funcionarioId' = public.meu_funcionario_id())
    or (entidade = 'cupom_fotos' and public.cupom_e_meu(id))
  ))
  with check (empresa_id = public.minha_empresa_id() and (
    (entidade in ('cupons', 'abastecimentos') and dados ->> 'funcionarioId' = public.meu_funcionario_id())
    or (entidade = 'cupom_fotos' and public.cupom_e_meu(id))
  ));

create policy "membro_apaga" on public.registros for delete
  using (empresa_id = public.minha_empresa_id() and (
    (entidade in ('cupons', 'abastecimentos') and dados ->> 'funcionarioId' = public.meu_funcionario_id())
    or (entidade = 'cupom_fotos' and public.cupom_e_meu(id))
  ));
