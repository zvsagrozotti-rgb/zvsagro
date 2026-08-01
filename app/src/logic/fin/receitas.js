// Receitas (contas a receber). Porte de backend/routes/receitas.js do FinControl.
import { listar as listarBase, salvarTudo, gerarId, agora } from "./store";
import { ajustarSaldo, listarContas } from "./contas";
import { listarCategorias } from "./categorias";
import { listar as listarAgro } from "../store";

export async function listarReceitas({ mes, ano, status } = {}) {
  let items = (await listarBase("receitas")).filter(r => !r.deletado_em);
  if (mes && ano) items = items.filter(r => {
    const dt = new Date((r.data_vencimento || "") + "T12:00:00");
    return dt.getMonth() + 1 === Number(mes) && dt.getFullYear() === Number(ano);
  });
  if (status) items = items.filter(r => r.status === status);
  items.sort((a, b) => String(b.data_vencimento).localeCompare(String(a.data_vencimento)));

  // Nome da conta, categoria e cliente pro detalhe/lista mostrarem, não só o id.
  // Cliente vem do cadastro "Pessoas" (entidade "clientes").
  const [contas, categorias, clientes] = await Promise.all([listarContas(), listarCategorias(), listarAgro("clientes")]);
  const contaNome = Object.fromEntries(contas.map(c => [c.id, c.nome]));
  const categoriaNome = Object.fromEntries(categorias.map(c => [c.id, c.nome]));
  const clienteNome = Object.fromEntries(clientes.map(c => [c.id, c.nome]));
  return items.map(r => ({ ...r, conta_nome: contaNome[r.conta_id] || null, categoria_nome: categoriaNome[r.categoria_id] || null, cliente_nome: clienteNome[r.cliente_id] || null }));
}

export async function criarReceita({ descricao, valor, data_vencimento, categoria_id, conta_id, cliente_id, observacao, parcelas = 1, origem }) {
  if (!String(descricao || "").trim() || !valor || !data_vencimento) throw new Error("Campos obrigatórios: descrição, valor, vencimento");
  const np = Math.max(1, parseInt(parcelas) || 1);
  const grupo_id = np > 1 ? gerarId() : null;
  const items = await listarBase("receitas");
  const criados = [];
  for (let i = 0; i < np; i++) {
    const dt = new Date(data_vencimento + "T12:00:00");
    dt.setMonth(dt.getMonth() + i);
    const ds = dt.toISOString().split("T")[0];
    const novo = {
      id: gerarId(), criado_em: agora(), atualizado_em: agora(),
      conta_id: conta_id || null, categoria_id: categoria_id || null, cliente_id: cliente_id || null,
      descricao: np > 1 ? descricao + " (" + (i + 1) + "/" + np + ")" : descricao,
      valor: parseFloat(valor), data_vencimento: ds, observacao: observacao || null,
      status: "pendente", data_baixa: null, valor_baixa: null, juros: 0, desconto: 0,
      parcela_atual: np > 1 ? i + 1 : null, total_parcelas: np > 1 ? np : null, grupo_id,
      origem: origem || null, deletado_em: null,
    };
    items.push(novo);
    criados.push(novo.id);
  }
  await salvarTudo("receitas", items);
  return { ids: criados, mensagem: criados.length + " lançamento(s) criado(s)" };
}

export async function baixarReceita(id, { data_baixa, juros = 0, desconto = 0, conta_id }) {
  if (!data_baixa) throw new Error("Data da baixa obrigatória");
  const items = await listarBase("receitas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const rec = items[i];
  if (rec.status === "baixado") throw new Error("Já baixada");
  if (rec.status === "cancelado") throw new Error("Cancelada não pode ser baixada");
  const valor_baixa = parseFloat(rec.valor) + parseFloat(juros || 0) - parseFloat(desconto || 0);
  const conta = conta_id || rec.conta_id;
  items[i] = { ...rec, status: "baixado", data_baixa, juros: parseFloat(juros || 0), desconto: parseFloat(desconto || 0), valor_baixa, conta_id: conta, atualizado_em: agora() };
  await salvarTudo("receitas", items);
  if (conta) await ajustarSaldo(conta, valor_baixa);
  return { ok: true, valor_baixa };
}

export async function estornarReceita(id) {
  const items = await listarBase("receitas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const rec = items[i];
  if (rec.status !== "baixado") throw new Error("Não está baixada");
  items[i] = { ...rec, status: "pendente", data_baixa: null, juros: 0, desconto: 0, valor_baixa: null, atualizado_em: agora() };
  await salvarTudo("receitas", items);
  if (rec.conta_id && rec.valor_baixa) await ajustarSaldo(rec.conta_id, -parseFloat(rec.valor_baixa));
  return { ok: true };
}

export async function cancelarReceita(id) {
  const items = await listarBase("receitas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const rec = items[i];
  if (rec.status === "cancelado") throw new Error("Já cancelada");
  if (rec.status === "baixado" && rec.conta_id && rec.valor_baixa) await ajustarSaldo(rec.conta_id, -parseFloat(rec.valor_baixa));
  items[i] = { ...rec, status: "cancelado", atualizado_em: agora() };
  await salvarTudo("receitas", items);
  return { ok: true };
}

export async function editarReceita(id, { descricao, valor, data_vencimento, categoria_id, conta_id, cliente_id, observacao }) {
  if (!String(descricao || "").trim() || valor == null || !data_vencimento) throw new Error("Campos obrigatórios");
  const items = await listarBase("receitas");
  const i = items.findIndex(x => x.id === id && !x.deletado_em);
  if (i < 0) throw new Error("Não encontrada");
  items[i] = { ...items[i], descricao, valor: parseFloat(valor), data_vencimento, categoria_id: categoria_id || null, conta_id: conta_id || null, cliente_id: cliente_id || null, observacao: observacao || null, atualizado_em: agora() };
  await salvarTudo("receitas", items);
  return { ok: true };
}

export async function excluirReceita(id) {
  const items = await listarBase("receitas");
  const i = items.findIndex(x => x.id === id);
  if (i < 0) throw new Error("Não encontrada");
  const rec = items[i];
  if (rec.status === "baixado" && rec.conta_id && rec.valor_baixa) await ajustarSaldo(rec.conta_id, -parseFloat(rec.valor_baixa));
  items[i] = { ...rec, deletado_em: agora() };
  await salvarTudo("receitas", items);
  return { ok: true };
}
