// Cartões de crédito e pagamento de fatura. Porte de backend/routes/cartoes.js do FinControl.
import { listar as listarBase, inserir, atualizar } from "./store";
import { ajustarSaldo } from "./contas";
import { listarDespesas, baixarDespesasDaFatura } from "./despesas";

export async function listarCartoes() {
  const items = await listarBase("cartoes");
  return items.filter(c => c.ativo !== false).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
}

export async function criarCartao({ nome, bandeira, limite = 0, dia_fechamento = 1, dia_vencimento = 10, conta_id, cor }) {
  if (!String(nome || "").trim()) throw new Error("Nome obrigatório");
  return inserir("cartoes", {
    nome, bandeira: bandeira || null, limite: parseFloat(limite) || 0,
    dia_fechamento: parseInt(dia_fechamento) || 1, dia_vencimento: parseInt(dia_vencimento) || 10,
    conta_id: conta_id || null, cor: cor || null, ativo: true,
  });
}

export async function editarCartao(id, { nome, bandeira, limite = 0, dia_fechamento = 1, dia_vencimento = 10, conta_id, cor }) {
  if (!String(nome || "").trim()) throw new Error("Nome obrigatório");
  return atualizar("cartoes", id, {
    nome, bandeira: bandeira || null, limite: parseFloat(limite) || 0,
    dia_fechamento: parseInt(dia_fechamento) || 1, dia_vencimento: parseInt(dia_vencimento) || 10,
    conta_id: conta_id || null, cor: cor || null,
  });
}

export async function excluirCartao(id) {
  return atualizar("cartoes", id, { ativo: false });
}

// Paga a fatura de uma competência (YYYY-MM): baixa as despesas pendentes do cartão e debita a conta.
export async function pagarFatura(cartaoId, { competencia, conta_id, data_baixa }) {
  if (!competencia || !data_baixa) throw new Error("Competência e data são obrigatórias");
  const todas = await listarDespesas();
  const pendentes = todas.filter(d => d.cartao_id === cartaoId && !d.deletado_em && d.status === "pendente"
    && String(d.data_vencimento || "").slice(0, 7) === competencia);
  if (!pendentes.length) throw new Error("Nenhuma despesa pendente nesta fatura");
  const total = pendentes.reduce((s, d) => s + parseFloat(d.valor), 0);
  await baixarDespesasDaFatura(pendentes.map(d => d.id), { data_baixa, conta_id: conta_id || null });
  if (conta_id) await ajustarSaldo(conta_id, -total);
  return { ok: true, total, qtd: pendentes.length };
}
