// Painel financeiro. Porte de backend/routes/dashboard.js do FinControl.
import { listar as listarBase } from "./store";
import { listarContas } from "./contas";

function hojeISO() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export async function obterDashboard() {
  const hoje = hojeISO();
  const agora = new Date();
  const mes = agora.getMonth() + 1, ano = agora.getFullYear();

  const [contas, receitas, despesas] = await Promise.all([
    listarContas(),
    listarBase("receitas"),
    listarBase("despesas"),
  ]);

  const noMes = (d, campo) => {
    if (!d[campo]) return false;
    const dt = new Date(d[campo] + "T12:00:00");
    return dt.getMonth() + 1 === mes && dt.getFullYear() === ano;
  };

  const receitasMes = receitas.filter(r => r.status === "baixado" && noMes(r, "data_baixa"))
    .reduce((s, r) => s + parseFloat(r.valor_baixa || 0), 0);
  const despesasMes = despesas.filter(d => d.status === "baixado" && noMes(d, "data_baixa"))
    .reduce((s, d) => s + parseFloat(d.valor_baixa || 0), 0);

  const pendentesAtivos = [
    ...receitas.filter(r => !r.deletado_em && r.status === "pendente"),
    ...despesas.filter(d => !d.deletado_em && d.status === "pendente"),
  ];
  const atrasados = pendentesAtivos.filter(x => x.data_vencimento < hoje);
  const proximosVencimentos = pendentesAtivos
    .filter(x => x.data_vencimento >= hoje)
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
    .slice(0, 5)
    .map(x => ({ tipo: receitas.includes(x) ? "receita" : "despesa", descricao: x.descricao, valor: x.valor, data_vencimento: x.data_vencimento, status: x.status }));

  const baixados = [
    ...receitas.filter(r => !r.deletado_em && r.status === "baixado").map(r => ({ tipo: "receita", descricao: r.descricao, valor: r.valor_baixa, data: r.data_baixa })),
    ...despesas.filter(d => !d.deletado_em && d.status === "baixado").map(d => ({ tipo: "despesa", descricao: d.descricao, valor: d.valor_baixa, data: d.data_baixa })),
  ].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 8);

  // Conta "sistema" (Estoque) fica de fora do saldo total — é valor em
  // produto, não dinheiro disponível.
  const saldoTotal = contas.filter((c) => !c.sistema).reduce((s, c) => s + parseFloat(c.saldo_atual || 0), 0);

  return {
    saldo_total: saldoTotal, contas,
    receitas_mes: receitasMes, despesas_mes: despesasMes, saldo_mes: receitasMes - despesasMes,
    atrasados: { qtd: atrasados.length, total: atrasados.reduce((s, x) => s + parseFloat(x.valor || 0), 0) },
    proximos_vencimentos: proximosVencimentos,
    ultimas_transacoes: baixados,
  };
}
