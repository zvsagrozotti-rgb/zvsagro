// Quem está com cada veículo e quando: histórico de uso (entidade "usos").
// Entregar um veículo fecha o uso aberto (se houver) e abre um novo; devolver só fecha.
// O veículo guarda um resumo do uso atual (usoAtual*) para a lista da Frota mostrar sem buscar o histórico.
import { listar, salvar } from "./store";

// ---- regras puras (testadas em test/uso.test.mjs) ----
export function usoAberto(usos, veiculoId) {
  return (usos || []).filter((u) => u.veiculoId === veiculoId && !u.fim).sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)))[0] || null;
}
export function historicoDoVeiculo(usos, veiculoId) {
  return (usos || []).filter((u) => u.veiculoId === veiculoId).sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)));
}
// Quem usou o veículo numa data (AAAA-MM-DD): o uso que começou até ela e não terminou antes dela.
export function quemUsavaEm(usos, veiculoId, data) {
  return (usos || []).find((u) => u.veiculoId === veiculoId && String(u.inicio) <= data && (!u.fim || String(u.fim) >= data)) || null;
}

// ---- gravação ----
export const listarUsos = () => listar("usos");

async function fecharAbertos(veiculoId, fim) {
  const usos = await listarUsos();
  for (const u of usos.filter((x) => x.veiculoId === veiculoId && !x.fim)) await salvar("usos", { ...u, fim });
}

export async function entregarVeiculo(veiculo, funcionario, data) {
  await fecharAbertos(veiculo.id, data);
  await salvar("usos", { veiculoId: veiculo.id, veiculoNome: veiculo.apelido || veiculo.placa || "", funcionarioId: funcionario.id, funcionarioNome: funcionario.nome, inicio: data, fim: null });
  return salvar("veiculos", { ...veiculo, usoAtualFuncionarioId: funcionario.id, usoAtualNome: funcionario.nome, usoDesde: data });
}

export async function devolverVeiculo(veiculo, data) {
  await fecharAbertos(veiculo.id, data);
  return salvar("veiculos", { ...veiculo, usoAtualFuncionarioId: null, usoAtualNome: "", usoDesde: null });
}
