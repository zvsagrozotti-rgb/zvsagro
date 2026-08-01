// Armazenamento OFFLINE-FIRST: toda leitura/escrita acontece no cache local
// (funciona sem internet), e uma fila de pendências ("outbox") envia pro
// Supabase assim que a conexão voltar. Quem usa este módulo (listar/salvar/
// remover/assinar) nem percebe se está online ou offline.
import * as Crypto from "expo-crypto";
import AsyncStorage from "./asyncStorage";
import { supabase } from "./supabaseClient";
import { empresaIdAtual } from "./empresaOnline";

// Cache e fila SEMPRE namespaced por empresa: sem isso, um aparelho usado por
// contas de empresas diferentes (ex.: testar com uma conta e depois logar com
// outra) mostrava os cadastros de quem usou por último pra qualquer um que
// logasse ali depois — o cache local não sabia de quem era cada coisa.
const CACHE_KEY = (empresaId, entidade) => "synccache:" + empresaId + ":" + entidade;
const OUTBOX_KEY = (empresaId) => "sync:outbox:" + empresaId;

async function lerCache(empresaId, entidade) {
  try { const r = await AsyncStorage.getItem(CACHE_KEY(empresaId, entidade)); return r ? JSON.parse(r) : []; }
  catch (e) { return []; }
}
async function gravarCache(empresaId, entidade, itens) {
  await AsyncStorage.setItem(CACHE_KEY(empresaId, entidade), JSON.stringify(itens));
}
async function lerOutbox(empresaId) {
  try { const r = await AsyncStorage.getItem(OUTBOX_KEY(empresaId)); return r ? JSON.parse(r) : []; }
  catch (e) { return []; }
}
async function gravarOutbox(empresaId, itens) {
  await AsyncStorage.setItem(OUTBOX_KEY(empresaId), JSON.stringify(itens));
}

// Quem está com uma tela aberta escutando essa entidade (pra recarregar sozinho).
const ouvintes = {};
function notificar(entidade) {
  (ouvintes[entidade] || new Set()).forEach((cb) => { try { cb(); } catch (e) {} });
}

// Avisa quem está esperando saber "quantas coisas ainda não sincronizaram".
const ouvintesStatus = new Set();
function notificarStatus() { ouvintesStatus.forEach((cb) => { try { cb(); } catch (e) {} }); }
export function assinarStatus(cb) { ouvintesStatus.add(cb); return () => ouvintesStatus.delete(cb); }

export async function pendentes() {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return 0;
  return (await lerOutbox(empresaId)).length;
}

// Tela chama isso pra saber quando os dados dessa entidade mudam — seja por
// uma sincronização que terminou, seja por outro aparelho editando ao vivo
// (Realtime, só funciona online, mas a fila garante que funciona offline também).
export function assinar(entidade, cb) {
  if (!ouvintes[entidade]) ouvintes[entidade] = new Set();
  ouvintes[entidade].add(cb);

  let canalRealtime = null;
  try {
    canalRealtime = supabase
      .channel("sync:" + entidade)
      .on("postgres_changes", { event: "*", schema: "public", table: "registros", filter: "entidade=eq." + entidade },
        async () => {
          const empresaId = await empresaIdAtual();
          if (!empresaId) return;
          puxarDoServidor(entidade, empresaId).then((mudou) => { if (mudou) notificar(entidade); }).catch(() => {});
        })
      .subscribe();
  } catch (e) {}

  return () => {
    ouvintes[entidade].delete(cb);
    if (canalRealtime) supabase.removeChannel(canalRealtime);
  };
}

// Volta o que está no cache local NA HORA (funciona offline) e, se der,
// atualiza esse cache com o que tiver de mais novo no servidor em segundo
// plano — quem chamou já recebeu a resposta, a tela só é avisada de novo
// via `assinar` se algo realmente mudou.
export async function listar(entidade) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const cache = await lerCache(empresaId, entidade);
  puxarDoServidor(entidade, empresaId).then((mudou) => { if (mudou) notificar(entidade); }).catch(() => {});
  return cache;
}

async function puxarDoServidor(entidade, empresaId) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return false;
  const { data, error } = await supabase
    .from("registros")
    .select("id, dados, atualizado_em")
    .eq("entidade", entidade)
    .eq("empresa_id", empresaId);
  if (error) throw error;

  const doServidor = (data || []).map((r) => ({ ...r.dados, id: r.id, atualizadoEm: r.atualizado_em }));
  const local = await lerCache(empresaId, entidade);
  const porId = new Map(local.map((x) => [x.id, x]));
  let mudou = false;
  for (const item of doServidor) {
    const meu = porId.get(item.id);
    if (!meu || new Date(item.atualizadoEm) > new Date(meu.atualizadoEm || 0)) {
      porId.set(item.id, item);
      mudou = true;
    }
  }
  if (mudou) await gravarCache(empresaId, entidade, [...porId.values()]);
  return mudou;
}

export async function salvar(entidade, item) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Sem empresa vinculada a este login.");
  const agora = new Date().toISOString();
  const final = { ...item, id: item.id || Crypto.randomUUID(), atualizadoEm: agora };

  const local = await lerCache(empresaId, entidade);
  const i = local.findIndex((x) => x.id === final.id);
  if (i >= 0) local[i] = final; else local.unshift(final);
  await gravarCache(empresaId, entidade, local);

  const outbox = await lerOutbox(empresaId);
  outbox.push({ tipo: "salvar", entidade, item: final, em: agora });
  await gravarOutbox(empresaId, outbox);

  notificar(entidade);
  notificarStatus();
  sincronizar();
  return final;
}

export async function remover(entidade, id) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) throw new Error("Sem empresa vinculada a este login.");
  const local = (await lerCache(empresaId, entidade)).filter((x) => x.id !== id);
  await gravarCache(empresaId, entidade, local);

  const outbox = await lerOutbox(empresaId);
  outbox.push({ tipo: "remover", entidade, id, em: new Date().toISOString() });
  await gravarOutbox(empresaId, outbox);

  notificar(entidade);
  notificarStatus();
  sincronizar();
}

// Esvazia a fila de pendências mandando tudo pro Supabase, na ordem em que
// foi feito. Para no primeiro erro (provavelmente falta de internet) e tenta
// de novo mais tarde — não trava o app, é sempre "melhor esforço".
let sincronizando = false;
export async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return;
    const empresaId = await empresaIdAtual();
    if (!empresaId) return;

    let outbox = await lerOutbox(empresaId);
    const entidadesAfetadas = new Set();
    while (outbox.length) {
      const op = outbox[0];
      try {
        if (op.tipo === "salvar") {
          const { id, atualizadoEm, ...dados } = op.item;
          const { error } = await supabase
            .from("registros")
            .upsert({ id, entidade: op.entidade, dados, empresa_id: empresaId, criado_por: userRes.user.id });
          if (error) throw error;
        } else if (op.tipo === "remover") {
          const { error } = await supabase.from("registros").delete().eq("id", op.id);
          if (error) throw error;
        }
        entidadesAfetadas.add(op.entidade);
        outbox.shift();
        await gravarOutbox(empresaId, outbox);
      } catch (e) {
        break; // sem rede (ou erro real) — para aqui, tenta de novo depois
      }
    }
    entidadesAfetadas.forEach(notificar);
  } finally {
    sincronizando = false;
    notificarStatus();
  }
}

// Chamar 1x quando o app abre: tenta sincronizar já, de novo quando a
// conexão voltar, e a cada 20s como rede de segurança (cobre casos em que o
// evento "online" não dispara, ex.: alguns navegadores/WebViews).
export function iniciarAutoSync() {
  sincronizar();
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("online", sincronizar);
  }
  setInterval(sincronizar, 20000);
}
