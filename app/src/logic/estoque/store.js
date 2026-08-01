// Armazenamento do módulo de estoque — mesmo padrão do fin/store.js
// (compartilhado pela equipe inteira, na tabela "registros", entidade
// prefixada pra não colidir com agro/financeiro). Só usa operações por
// registro (inserir/atualizar/remover) — nunca um "salvarTudo" que
// recalcula o que apagar comparando lista inteira, que foi a causa raiz
// de um apagamento em massa no módulo financeiro.
import * as Crypto from "expo-crypto";
import { supabase } from "../supabaseClient";
import { empresaIdAtual } from "../empresaOnline";

const ENT = (e) => "estoque_" + e;

export function gerarId() {
  return Crypto.randomUUID();
}

export function agora() {
  return new Date().toISOString();
}

const TAMANHO_PAGINA = 1000;

export async function listar(entidade) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const todos = [];
  let pagina = 0;
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
