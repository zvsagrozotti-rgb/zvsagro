// Despesas (contas a pagar). Porte de backend/routes/despesas.js do FinControl.
import { listar as listarBase, salvarTudo, gerarId, agora } from "./store";
import { ajustarSaldo, listarContas } from "./contas";
import { listarCategorias } from "./categorias";
import { listar as listarAgro } from "../store";

export async function listarDespesas({ mes, ano, status, cartao_id } = {}) {
  let items = (await listarBase("despesas")).filter(d => !d.deletado_em);
  if (mes && ano) items = items.filter(d => {
    const dt = new Date((d.data_vencimento || "") + "T12:00:00");
    return dt.getMonth() + 1 === Number(mes) && dt.getFullYear() === Number(ano);
  });
  if (status) items = items.filter(d => d.status === status);
  if (cartao_id) items = items.filter(d => d.cartao_id === cartao_id);
  items.sort((a, b) => String(b.data_vencimento).localeCompare(String(a.data_vencimento)));

  // Nome da conta, categoria e fornecedor pro detalhe/lista mostrarem, não só o id.
  // Fornecedor vem do cadastro agrícola "Clientes e Fornecedores" (entidade "clientes").
  const [contas, categorias, clientes] = await Promise.all([listarContas(), listarCategorias(), listarAgro("clientes")]);
  const contaNome = Object.fromEntries(contas.map(c => [c.id, c.nome]));
  const categoriaNome = Object.fromEntries(categorias.map(c => [c.id, c.nome]));
  const clienteNome = Object.fromEntries(clientes.map(c => [c.id, c.nome]));
  return items.map(d => ({ ...d, conta_nome: contaNome[d.conta_id] || null, categoria_nome: categoriaNome[d.categoria_id] || null, cliente_nome: clienteNome[d.cliente_id] || null }));
}

// Calcula a data de vencimento da fatura a partir da data da compra e dos dias de fechamento/vencimento do cartão.
export function calcVencimentoFatura(dataCompra, diaFech, diaVenc) {
  const d = new Date(dataCompra + "T12:00:00");
  const dia = d.getDate();
  let mF = d.getMonth(), aF = d.getFullYear();
  if (dia > diaFech) { mF++; if (mF > 11) { mF = 0; aF++; } }
  let mV = mF, aV = aF;
  if (diaVenc <= diaFech) { mV++; if (mV > 11) { mV = 0; aV++; } }
  const ultimo = new Date(aV, mV + 1, 0).getDate();
  const dd = Math.min(diaVenc, ultimo);
  return aV + "-" + String(mV + 1).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
}

export async function criarDespesa({ descricao, valor, data_vencimento, categoria_id, conta_id, cliente_id, observacao, parcelas = 1, cartao_id, origem }) {
  if (!String(descricao || "").trim() || !valor || !data_vencimento) throw new Error("Campos obrigatórios: descrição, valor, vencimento");
  let baseVenc = data_vencimento;
  if (cartao_id) {
    const cartoes = await listarBase("cartoes");
    const cartao = cartoes.find(c => c.id === cartao_id && c.ativo !== false);
    if (!cartao) throw new Error("Cartão inválido");
    baseVenc = calcVencimentoFatura(data_vencimento, cartao.dia_fechamento, cartao.dia_vencimento);
  }
  const contaFinal = cartao_id ? null : (conta_id || null); // despesa de cartão só debita conta ao pagar a fatura
  const np = Math.max(1, parseInt(parcelas) || 1);
  const grupo_id = np > 1 ? gerarId() : null;
  const items = await listarBase("despesas");
  const criados = [];
  for (let i = 0; i < np; i++) {
    const dt = new Date(baseVenc + "T12:00:00");
    dt.setMonth(dt.getMonth() + i);
    const ds = dt.toISOString().split("T")[0];
    const novo = {
      id: gerarId(), criado_em: agora(), atualizado_em: agora(),
      conta_id: contaFinal, categoria_id: categoria_id || null, cliente_id: cliente_id || null,
      descricao: np > 1 ? descricao + " (" + (i + 1) + "/" + np + ")" : descricao,
      valor: parseFloat(valor), data_vencimento: ds, observacao: observacao || null,
      status: "pendente", data_baixa: null, valor_baixa: null, juros: 0, desconto: 0,
      parcela_atual: np > 1 ? i + 1 : null, total_parcelas: np > 1 ? np : null, grupo_id,
      cartao_id: cartao_id || null, origem: origem || null, deletado_em: null,
    };
    items.push(novo);
    criados.push(novo.id);
  }
  await salvarTudo("despesas", items);
  return { ids: criados, mensagem: criados.length + " lançamento(s) criado(s)" };
}

export async function baixarDespesa(id, { data_baixa, juros = 0, desconto = 0, conta_id }) {
  if (!data_baixa) throw new Error("Data da baixa obrigatória");
  const items = await listarBase("despesas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const desp = items[i];
  if (desp.status === "baixado") throw new Error("Já baixada");
  if (desp.status === "cancelado") throw new Error("Cancelada");
  const valor_baixa = parseFloat(desp.valor) + parseFloat(juros || 0) - parseFloat(desconto || 0);
  const conta = conta_id || desp.conta_id;
  items[i] = { ...desp, status: "baixado", data_baixa, juros: parseFloat(juros || 0), desconto: parseFloat(desconto || 0), valor_baixa, conta_id: conta, atualizado_em: agora() };
  await salvarTudo("despesas", items);
  if (conta) await ajustarSaldo(conta, -valor_baixa);
  return { ok: true, valor_baixa };
}

export async function estornarDespesa(id) {
  const items = await listarBase("despesas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const desp = items[i];
  if (desp.status !== "baixado") throw new Error("Não está baixada");
  items[i] = { ...desp, status: "pendente", data_baixa: null, juros: 0, desconto: 0, valor_baixa: null, atualizado_em: agora() };
  await salvarTudo("despesas", items);
  if (desp.conta_id && desp.valor_baixa) await ajustarSaldo(desp.conta_id, parseFloat(desp.valor_baixa));
  return { ok: true };
}

export async function cancelarDespesa(id) {
  const items = await listarBase("despesas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const desp = items[i];
  if (desp.status === "cancelado") throw new Error("Já cancelada");
  if (desp.status === "baixado" && desp.conta_id && desp.valor_baixa) await ajustarSaldo(desp.conta_id, parseFloat(desp.valor_baixa));
  items[i] = { ...desp, status: "cancelado", atualizado_em: agora() };
  await salvarTudo("despesas", items);
  return { ok: true };
}

export async function editarDespesa(id, { descricao, valor, data_vencimento, categoria_id, conta_id, cliente_id, observacao }) {
  if (!String(descricao || "").trim() || valor == null || !data_vencimento) throw new Error("Campos obrigatórios");
  const items = await listarBase("despesas");
  const i = items.findIndex(x => x.id === id && !x.deletado_em);
  if (i < 0) throw new Error("Não encontrada");
  items[i] = { ...items[i], descricao, valor: parseFloat(valor), data_vencimento, categoria_id: categoria_id || null, conta_id: conta_id || null, cliente_id: cliente_id || null, observacao: observacao || null, atualizado_em: agora() };
  await salvarTudo("despesas", items);
  return { ok: true };
}

export async function excluirDespesa(id) {
  const items = await listarBase("despesas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const desp = items[i];
  if (desp.status === "baixado" && desp.conta_id && desp.valor_baixa) await ajustarSaldo(desp.conta_id, parseFloat(desp.valor_baixa));
  items[i] = { ...desp, deletado_em: agora() };
  await salvarTudo("despesas", items);
  return { ok: true };
}

// Usado por cartoes.pagarFatura(): baixa em lote as despesas de uma fatura (sem mexer no saldo aqui —
// quem ajusta o saldo é o chamador, uma vez só pelo total).
export async function baixarDespesasDaFatura(ids, { data_baixa, conta_id }) {
  const items = await listarBase("despesas");
  for (const id of ids) {
    const i = items.findIndex(x => x.id === id);
    if (i < 0) continue;
    items[i] = { ...items[i], status: "baixado", data_baixa, valor_baixa: parseFloat(items[i].valor), conta_id: conta_id || items[i].conta_id, atualizado_em: agora() };
  }
  await salvarTudo("despesas", items);
}
