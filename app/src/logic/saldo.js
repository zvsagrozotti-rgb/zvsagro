// Regras de saldo por funcionário (sem dependências, para testar em Node).
//
// Adiantamento ("receita") = crédito lançado pelo administrador para o funcionário.
// Cupom = gasto que debita desse saldo.
// Fechar ciclo = o administrador dá a receita como paga: tudo que estava em aberto
// (créditos e cupons) passa a "fechado" e, se quiser, lança um novo adiantamento.
const n = (v) => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return isFinite(x) ? x : 0; };
const arred = (v) => Math.round(v * 100) / 100;

export function resumoFuncionario(funcId, creditos, cupons) {
  const cs = (creditos || []).filter((c) => c.funcionarioId === funcId && !c.fechadoEm);
  const ps = (cupons || []).filter((c) => c.funcionarioId === funcId && !c.fechadoEm);
  const adiantado = arred(cs.reduce((s, c) => s + n(c.valor), 0));
  const gasto = arred(ps.reduce((s, c) => s + n(c.valor), 0));
  const porTipo = {};
  for (const p of ps) porTipo[p.tipo || "Outros"] = arred((porTipo[p.tipo || "Outros"] || 0) + n(p.valor));
  return { adiantado, gasto, saldo: arred(adiantado - gasto), porTipo, qtdCupons: ps.length, creditosAbertos: cs, cuponsAbertos: ps };
}

// Ids que devem ser marcados como fechados ao fechar o ciclo do funcionário.
export function idsParaFechar(funcId, creditos, cupons) {
  const r = resumoFuncionario(funcId, creditos, cupons);
  return { creditos: r.creditosAbertos.map((c) => c.id), cupons: r.cuponsAbertos.map((c) => c.id), resumo: { adiantado: r.adiantado, gasto: r.gasto, saldo: r.saldo } };
}

// Total gasto por funcionário (centro de custos) num período, aberto ou fechado.
export function gastoPorFuncionario(cupons, de, ate) {
  const m = {};
  for (const c of cupons || []) {
    if (de && String(c.data) < de) continue;
    if (ate && String(c.data) > ate) continue;
    m[c.funcionarioId] = arred((m[c.funcionarioId] || 0) + n(c.valor));
  }
  return m;
}

// Relatório por funcionário: receitas (adiantamentos) e despesas (cupons), abertos e já fechados.
// funcionarioId = null -> todos. prefixo = "AAAA", "AAAA-MM" ou "AAAA-MM-DD" (null = todo o histórico).
export function relatorioFuncionarios(funcionarios, creditos, cupons, { funcionarioId = null, prefixo = null } = {}) {
  const noPeriodo = (d) => !prefixo || String(d || "").startsWith(prefixo);
  const alvo = (funcionarios || []).filter((f) => !funcionarioId || f.id === funcionarioId);
  const porFuncionario = alvo.map((f) => {
    const rec = (creditos || []).filter((c) => c.funcionarioId === f.id && noPeriodo(c.data));
    const desp = (cupons || []).filter((c) => c.funcionarioId === f.id && noPeriodo(c.data));
    const receitas = arred(rec.reduce((s, c) => s + n(c.valor), 0));
    const despesas = arred(desp.reduce((s, c) => s + n(c.valor), 0));
    const porTipo = {};
    for (const p of desp) porTipo[p.tipo || "Outros"] = arred((porTipo[p.tipo || "Outros"] || 0) + n(p.valor));
    const movimentos = [
      ...rec.map((c) => ({ id: c.id, data: c.data, kind: "receita", valor: n(c.valor), titulo: c.descricao || "Adiantamento", tipo: "Receita", fechado: !!c.fechadoEm })),
      ...desp.map((c) => ({ id: c.id, data: c.data, kind: "despesa", valor: n(c.valor), titulo: c.estabelecimento || c.tipo || "Cupom", tipo: c.tipo || "Outros", fechado: !!c.fechadoEm })),
    ].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
    return { funcionario: f, receitas, despesas, resultado: arred(receitas - despesas), porTipo, movimentos };
  });
  const totais = {
    receitas: arred(porFuncionario.reduce((s, x) => s + x.receitas, 0)),
    despesas: arred(porFuncionario.reduce((s, x) => s + x.despesas, 0)),
  };
  totais.resultado = arred(totais.receitas - totais.despesas);
  return { porFuncionario, totais };
}
