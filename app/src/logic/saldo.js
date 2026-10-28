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
