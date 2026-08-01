// Log de atividade — quem criou/editou/removeu o quê, gravado sozinho por
// um gatilho no banco (não depende do app "avisar certo").
import { supabase } from "./supabaseClient";
import { empresaIdAtual } from "./empresaOnline";

const NOMES_ENTIDADE = {
  clientes: "cliente", fazendas: "fazenda", talhoes: "talhão", produtos: "produto",
  drones: "drone", pilotos: "piloto", aplicacoes: "aplicação",
};

const ACAO_LABEL = { criado: "criou", editado: "editou", removido: "removeu" };

export async function listarHistorico(limite = 50) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const { data, error } = await supabase
    .from("historico")
    .select("id, entidade, acao, autor_email, dados, criado_em")
    .eq("empresa_id", empresaId)
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) return [];
  return (data || []).map((h) => ({
    ...h,
    descricao: (h.autor_email || "Alguém") + " " + (ACAO_LABEL[h.acao] || h.acao) + " " +
      (h.dados?.nome ? "\"" + h.dados.nome + "\"" : "um registro") + " em " + (NOMES_ENTIDADE[h.entidade] || h.entidade),
  }));
}
