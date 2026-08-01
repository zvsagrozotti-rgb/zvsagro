// Transferências entre contas. Porte de backend/routes/transferencias.js do FinControl.
import { listar as listarBase, inserir } from "./store";
import { ajustarSaldo, listarContas } from "./contas";

export async function listarTransferencias() {
  const [items, contas] = await Promise.all([listarBase("transferencias"), listarContas()]);
  const porId = Object.fromEntries(contas.map(c => [c.id, c.nome]));
  return items
    .map(t => ({ ...t, origem_nome: porId[t.conta_origem_id] || "", destino_nome: porId[t.conta_destino_id] || "" }))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
    .slice(0, 100);
}

export async function criarTransferencia({ conta_origem_id, conta_destino_id, valor, data, descricao }) {
  if (!conta_origem_id || !conta_destino_id || !valor || !data) throw new Error("Campos obrigatórios faltando");
  if (conta_origem_id === conta_destino_id) throw new Error("Origem e destino devem ser diferentes");
  const v = parseFloat(valor);
  await inserir("transferencias", { conta_origem_id, conta_destino_id, valor: v, data, descricao: descricao || null });
  await ajustarSaldo(conta_origem_id, -v);
  await ajustarSaldo(conta_destino_id, v);
  return { ok: true };
}
