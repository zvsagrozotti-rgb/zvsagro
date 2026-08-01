// Armazenamento online (Supabase) — mesma "forma" de uso do store.js local
// (listar/salvar/remover), mas guardando num banco compartilhado entre
// aparelhos. `assinar` avisa a tela quando outro aparelho mudar algo.
import { supabase } from "./supabaseClient";
import { empresaIdAtual } from "./empresaOnline";

function paraItem(registro) {
  return { ...registro.dados, id: registro.id, atualizadoEm: registro.atualizado_em };
}

export async function listar(entidade) {
  const { data, error } = await supabase
    .from("registros")
    .select("id, dados, atualizado_em")
    .eq("entidade", entidade)
    .order("atualizado_em", { ascending: false });
  if (error) { console.warn("listar", entidade, error); return []; }
  return (data || []).map(paraItem);
}

export async function salvar(entidade, item) {
  const { id, atualizadoEm, ...dados } = item;
  if (id) {
    const { data, error } = await supabase
      .from("registros")
      .update({ dados })
      .eq("id", id)
      .select("id, dados, atualizado_em")
      .single();
    if (error) throw error;
    return paraItem(data);
  }
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Empresa não encontrada.");
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("registros")
    .insert({ entidade, dados, empresa_id: empresaId, criado_por: userRes?.user?.id })
    .select("id, dados, atualizado_em")
    .single();
  if (error) throw error;
  return paraItem(data);
}

export async function remover(entidade, id) {
  const { error } = await supabase.from("registros").delete().eq("id", id);
  if (error) throw error;
}

// Chama cb() sempre que um registro dessa entidade mudar em QUALQUER
// aparelho (inclui o próprio) — usar pra recarregar a lista na tela.
export function assinar(entidade, cb) {
  const canal = supabase
    .channel("registros:" + entidade)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "registros", filter: "entidade=eq." + entidade },
      cb
    )
    .subscribe();
  return () => supabase.removeChannel(canal);
}
