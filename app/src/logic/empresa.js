// Dados da empresa prestadora (registro único) — compartilhado pela EQUIPE
// inteira (mesma tabela "registros" usada por clientes/talhões/etc.), não
// mais preso ao aparelho. Usado no topo e no relatório.
import { supabase } from "./supabaseClient";
import { empresaIdAtual } from "./empresaOnline";

const ENTIDADE = "empresa_perfil";

export async function lerEmpresa() {
  try {
    const empresaId = await empresaIdAtual();
    if (!empresaId) return null;
    const { data, error } = await supabase
      .from("registros")
      .select("dados")
      .eq("entidade", ENTIDADE)
      .eq("id", empresaId)
      .maybeSingle();
    if (error || !data) return null;
    return data.dados || null;
  } catch (e) { return null; }
}

export async function salvarEmpresa(obj) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Sem empresa vinculada a este login.");
  const { data: userRes } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("registros")
    .upsert({ id: empresaId, entidade: ENTIDADE, dados: obj || {}, empresa_id: empresaId, criado_por: userRes?.user?.id });
  if (error) throw error;
}
