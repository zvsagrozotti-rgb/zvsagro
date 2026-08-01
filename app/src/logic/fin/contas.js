// Contas bancárias/caixa. Porte de backend/routes/contas.js do FinControl para armazenamento local.
import { listar as listarBase, salvarTudo, inserir, atualizar, agora } from "./store";

export async function listarContas() {
  const items = await listarBase("contas");
  return items.filter(c => c.ativo !== false).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
}

// Igual listarContas, mas sem as contas "sistema" (ex.: Estoque) — usar em
// todo picker de conta que o usuário preenche na mão (transferência, baixa,
// lançamento manual, pagamento de fatura). Uma conta sistema só pode mudar
// de saldo pelo fluxo automático que a controla, nunca escolhida à mão.
export async function listarContasSelecionaveis() {
  return (await listarContas()).filter(c => !c.sistema);
}

export async function criarConta({ nome, tipo, banco, saldo_inicial = 0, sistema = false }) {
  if (!String(nome || "").trim()) throw new Error("Nome obrigatório");
  const v = parseFloat(saldo_inicial) || 0;
  return inserir("contas", { nome, tipo: tipo || "corrente", banco: banco || null, saldo_inicial: v, saldo_atual: v, ativo: true, sistema: !!sistema });
}

export async function editarConta(id, { nome, tipo, banco }) {
  return atualizar("contas", id, { nome, tipo, banco: banco || null });
}

// Marca uma conta já existente como "sistema" — usado pra corrigir contas
// (como a Estoque) criadas antes dessa trava existir.
export async function marcarContaComoSistema(id) {
  return atualizar("contas", id, { sistema: true });
}

// Ajusta o saldo (delta pode ser negativo). Usado pelas regras manuais
// (baixar, estornar, cancelar, excluir, transferir, pagar fatura). Recusa
// mexer numa conta "sistema" (ex.: Estoque) — essa só pode mudar pelo fluxo
// automático que a controla (ver ajustarSaldoSistema, abaixo).
export async function ajustarSaldo(id, delta) {
  if (!id || !delta) return;
  const items = await listarBase("contas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) return;
  if (items[i].sistema) {
    throw new Error("A conta \"" + items[i].nome + "\" é controlada automaticamente (entra/sai só com movimento de estoque) e não pode ser alterada manualmente.");
  }
  items[i] = { ...items[i], saldo_atual: parseFloat(items[i].saldo_atual || 0) + parseFloat(delta), atualizado_em: agora() };
  await salvarTudo("contas", items);
}

// Mesma coisa que ajustarSaldo, sem a trava — só pra uso interno de módulos
// que TÊM permissão de mexer numa conta sistema (hoje, só estoque/financeiro.js,
// que credita/debita a conta Estoque pelo custo a cada entrada/saída).
export async function ajustarSaldoSistema(id, delta) {
  if (!id || !delta) return;
  const items = await listarBase("contas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) return;
  items[i] = { ...items[i], saldo_atual: parseFloat(items[i].saldo_atual || 0) + parseFloat(delta), atualizado_em: agora() };
  await salvarTudo("contas", items);
}

// Exclui (soft) — bloqueia se houver lançamento vinculado, igual à regra do FinControl.
// Também bloqueia excluir uma conta "sistema" (ex.: Estoque).
export async function excluirConta(id) {
  const [contasAtuais, receitas, despesas, transferencias] = await Promise.all([
    listarBase("contas"), listarBase("receitas"), listarBase("despesas"), listarBase("transferencias"),
  ]);
  const conta = contasAtuais.find(c => c.id === id);
  if (conta?.sistema) throw new Error("A conta \"" + conta.nome + "\" é controlada automaticamente e não pode ser excluída.");
  const vinculos =
    receitas.filter(r => r.conta_id === id && !r.deletado_em && r.status !== "cancelado").length +
    despesas.filter(d => d.conta_id === id && !d.deletado_em && d.status !== "cancelado").length +
    transferencias.filter(t => t.conta_origem_id === id || t.conta_destino_id === id).length;
  if (vinculos > 0) throw new Error("Conta possui " + vinculos + " lançamento(s) vinculado(s). Cancele os lançamentos antes de excluir a conta.");
  return atualizar("contas", id, { ativo: false });
}
