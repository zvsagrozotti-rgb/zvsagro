// Relatórios (extrato e completo). Porte de backend/routes/relatorios.js do FinControl.
import { listar as listarBase } from "./store";
import { listarContas } from "./contas";
import { listarCategorias } from "./categorias";
import { listar as listarAgro } from "../store";

async function comNomes(items) {
  const [contas, categorias, clientes] = await Promise.all([listarContas(), listarCategorias(), listarAgro("clientes")]);
  const cNome = Object.fromEntries(contas.map(c => [c.id, c.nome]));
  const gNome = Object.fromEntries(categorias.map(c => [c.id, c.nome]));
  const pNome = Object.fromEntries(clientes.map(c => [c.id, c.nome]));
  return items.map(x => ({ ...x, conta: cNome[x.conta_id] || null, categoria: gNome[x.categoria_id] || null, cliente: pNome[x.cliente_id] || null }));
}

// Lançamentos já baixados, no período (por data_baixa).
export async function extrato({ inicio, fim } = {}) {
  const [receitas, despesas] = await Promise.all([listarBase("receitas"), listarBase("despesas")]);
  const filtra = (arr, tipo) => arr
    .filter(x => !x.deletado_em && x.status === "baixado")
    .filter(x => (!inicio || x.data_baixa >= inicio) && (!fim || x.data_baixa <= fim))
    .map(x => ({ tipo, ...x }));
  const todos = [...filtra(receitas, "receita"), ...filtra(despesas, "despesa")];
  todos.sort((a, b) => String(b.data_baixa).localeCompare(String(a.data_baixa)));
  return comNomes(todos);
}

// Todos os lançamentos no período (por data_vencimento), com filtro opcional de status.
export async function relatorioCompleto({ inicio, fim, status } = {}) {
  const d0 = new Date(); const p0 = (n) => String(n).padStart(2, "0");
  const hoje = d0.getFullYear() + "-" + p0(d0.getMonth() + 1) + "-" + p0(d0.getDate());
  const [receitas, despesas] = await Promise.all([listarBase("receitas"), listarBase("despesas")]);
  const filtra = (arr, tipo) => arr
    .filter(x => !x.deletado_em)
    .filter(x => (!inicio || x.data_vencimento >= inicio) && (!fim || x.data_vencimento <= fim))
    .map(x => ({ tipo, ...x }));
  let todos = [...filtra(receitas, "receita"), ...filtra(despesas, "despesa")];
  todos.sort((a, b) => String(b.data_vencimento).localeCompare(String(a.data_vencimento)));
  if (status === "baixado") todos = todos.filter(x => x.status === "baixado");
  else if (status === "pendente") todos = todos.filter(x => x.status === "pendente" && x.data_vencimento >= hoje);
  else if (status === "atrasado") todos = todos.filter(x => x.status === "pendente" && x.data_vencimento < hoje);
  return comNomes(todos);
}
