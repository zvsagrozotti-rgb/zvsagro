// Armazenamento do módulo financeiro — compartilhado pela EQUIPE inteira,
// na mesma tabela "registros" usada por clientes/talhões/etc. (entidade
// prefixada com "fin_" pra não colidir). Antes ficava só no aparelho
// (AsyncStorage) e por isso receitas/despesas geradas por um membro da
// equipe não apareciam pros outros.
import * as Crypto from "expo-crypto";
import { supabase } from "../supabaseClient";
import { empresaIdAtual } from "../empresaOnline";

const ENT = (e) => "fin_" + e;

export function gerarId() {
  return Crypto.randomUUID();
}

export function agora() {
  return new Date().toISOString();
}

const TAMANHO_PAGINA = 1000; // limite padrão de linhas por resposta do PostgREST/Supabase

// IMPORTANTE: nunca silenciar erro aqui devolvendo [] — quem chama (inclusive
// salvarTudo, mais abaixo) usa o resultado pra decidir o que APAGAR. Uma lista
// incompleta por erro de rede, se tratada como "é isso mesmo que existe", já
// causou apagamento em massa de despesas/receitas reais. Erro tem que estourar
// pra a operação inteira parar, não virar uma lista vazia disfarçada de "ok".
export async function listar(entidade) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const todos = [];
  let pagina = 0;
  // Uma empresa com mais lançamentos de um tipo do que o limite por resposta
  // (ex.: +1000 despesas) precisava de várias páginas — sem isso, o restante
  // sumia silenciosamente da lista e dos totais, sem nenhum erro aparecer.
  while (true) {
    const inicio = pagina * TAMANHO_PAGINA;
    const { data, error } = await supabase
      .from("registros")
      .select("id, dados")
      .eq("entidade", ENT(entidade))
      .eq("empresa_id", empresaId)
      .range(inicio, inicio + TAMANHO_PAGINA - 1);
    if (error) throw error;
    todos.push(...(data || []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }
  return todos.map((r) => ({ ...r.dados, id: r.id }));
}

// Recebe a lista inteira já modificada (padrão usado pelas telas do financeiro:
// lê tudo, mexe no array em memória, salva tudo de volta) — compara com o que
// está no servidor pra saber o que apagar e o que gravar.
//
// Trava de segurança: se isso for apagar uma fatia grande do que já existe,
// para e avisa em vez de apagar — nenhuma operação legítima de hoje (criar,
// baixar, estornar, cancelar, editar, excluir-lógico) deveria remover mais do
// que uns poucos registros de uma vez. Foi exatamente a ausência dessa trava,
// somada a uma busca que falhou e devolveu lista incompleta, que apagou as
// despesas e receitas reais do Fabiano.
export async function salvarTudo(entidade, items) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Sem empresa vinculada a este login.");
  const { data: userRes } = await supabase.auth.getUser();
  const atuais = await listar(entidade);
  const idsNovos = new Set(items.map((x) => x.id));
  const paraExcluir = atuais.filter((x) => !idsNovos.has(x.id)).map((x) => x.id);
  const limite = Math.max(5, Math.ceil(atuais.length * 0.1));
  if (paraExcluir.length > limite) {
    throw new Error(
      "Operação cancelada por segurança: isso apagaria " + paraExcluir.length + " de " + atuais.length +
      " registro(s) de " + entidade + " de uma vez. Se for intencional, avise o suporte."
    );
  }
  if (paraExcluir.length) {
    const { error } = await supabase.from("registros").delete().in("id", paraExcluir);
    if (error) throw error;
  }
  for (const item of items) {
    const { id, ...dados } = item;
    const { error } = await supabase.from("registros").upsert({
      id, entidade: ENT(entidade), dados, empresa_id: empresaId, criado_por: userRes?.user?.id,
    });
    if (error) throw error;
  }
}

export async function obter(entidade, id) {
  const items = await listar(entidade);
  return items.find((x) => x.id === id) || null;
}

export async function inserir(entidade, item) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Sem empresa vinculada a este login.");
  const { data: userRes } = await supabase.auth.getUser();
  const novo = { id: gerarId(), criado_em: agora(), atualizado_em: agora(), ...item };
  const { id, ...dados } = novo;
  const { error } = await supabase
    .from("registros")
    .upsert({ id, entidade: ENT(entidade), dados, empresa_id: empresaId, criado_por: userRes?.user?.id });
  if (error) throw error;
  return novo;
}

export async function atualizar(entidade, id, patch) {
  const atual = await obter(entidade, id);
  if (!atual) return null;
  const empresaId = await empresaIdAtual();
  const { data: userRes } = await supabase.auth.getUser();
  const atualizado = { ...atual, ...patch, atualizado_em: agora() };
  const { id: _id, ...dados } = atualizado;
  const { error } = await supabase
    .from("registros")
    .upsert({ id, entidade: ENT(entidade), dados, empresa_id: empresaId, criado_por: userRes?.user?.id });
  if (error) throw error;
  return atualizado;
}

export async function remover(entidade, id) {
  await supabase.from("registros").delete().eq("id", id);
}
