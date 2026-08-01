// Backup e restauração de TODOS os dados do cliente (cadastros + aplicações + empresa).
// Os dados ficam em chaves "dp:" no AsyncStorage. Funciona no web e no celular.
import { Platform } from "react-native";
import AsyncStorage from "./asyncStorage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import appJson from "../../app.json";

const K_ULT = "ap:ultimoBackup";
// Aceita backups do próprio Aegrofin e também do AegroPrecisão (mesmos cadastros/aplicações —
// "AegroPrecisao" é o nome gravado pelo app original, sem cedilha). Como só existem chaves "dp:"
// nesse formato, importar um backup do AegroPrecisão nunca mexe no financeiro ("fin:") do Aegrofin.
const APPS_ACEITOS = ["Aegrofin", "AegroPrecisao"];

function hojeArquivo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Gera o arquivo de backup e abre o compartilhamento/download.
export async function exportarBackup() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k && k.startsWith("dp:"));
  const pares = await AsyncStorage.multiGet(keys);
  const dados = {};
  pares.forEach(([k, v]) => { dados[k] = v; });
  const pacote = { app: "Aegrofin", tipo: "backup", versao: 1, em: new Date().toISOString(), dados };
  const json = JSON.stringify(pacote);
  const nome = "aegrofin-v" + appJson.expo.version + "-backup-" + hojeArquivo() + ".json";

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } else {
    const path = FileSystem.cacheDirectory + nome;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    // O arquivo já está salvo no aparelho a essa altura — o compartilhamento é só
    // uma forma de tirar ele do app. Por isso o erro de compartilhar não pode virar
    // "erro no backup" (o cliente pensaria que perdeu os dados). Também evitamos
    // um mimeType específico demais ("application/json"): em alguns aparelhos não
    // há nenhum app registrado pra esse tipo exato, o Android não abre a lista de
    // compartilhamento, e a chamada nativa trava presa "em andamento" pra sempre
    // (só normaliza fechando e abrindo o app de novo). "*/*" é aceito por praticamente
    // qualquer app (WhatsApp, e-mail, Drive, Bluetooth etc.), evitando essa trava.
    if (await Sharing.isAvailableAsync()) {
      try {
        await Sharing.shareAsync(path, { mimeType: "*/*", dialogTitle: "Backup Aegrofin" });
      } catch (e) {
        // Arquivo já está salvo; só o compartilhamento falhou (ex.: nenhum app
        // disponível, ou o usuário fechou a lista). Não interrompe o backup.
      }
    }
  }
  await AsyncStorage.setItem(K_ULT, new Date().toISOString());
  return { ok: true, arquivo: nome, itens: keys.length };
}

// Escolhe um arquivo de backup e restaura tudo. Retorna { ok, itens } ou { ok:false, erro }.
export async function restaurarBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return { ok: false, cancelado: true };
  const a = res.assets[0];
  let texto = "";
  try {
    if (Platform.OS === "web") { const r = await fetch(a.uri); texto = await r.text(); }
    else { texto = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.UTF8 }); }
  } catch (e) { return { ok: false, erro: "Não consegui ler o arquivo." }; }

  let pacote;
  try { pacote = JSON.parse(texto); } catch (e) { return { ok: false, erro: "Arquivo inválido (não é um backup)." }; }
  if (!pacote || !APPS_ACEITOS.includes(pacote.app) || !pacote.dados) {
    return { ok: false, erro: "Este arquivo não é um backup do Aegrofin ou do AegroPrecisão." };
  }
  const entradas = Object.entries(pacote.dados).filter(([k]) => typeof k === "string" && k.startsWith("dp:"));
  if (entradas.length === 0) return { ok: false, erro: "O backup está vazio." };
  await AsyncStorage.multiSet(entradas.map(([k, v]) => [k, v == null ? "" : String(v)]));
  return { ok: true, itens: entradas.length, em: pacote.em };
}

// Entidades guardadas como lista (array de itens com id) — as únicas que fazem sentido mesclar.
const ENTIDADES_LISTA = ["clientes", "fazendas", "talhoes", "produtos", "drones", "pilotos", "aplicacoes"];

// Escolhe um arquivo de backup de OUTRO aparelho e junta com o que já existe aqui:
// - item que só existe no arquivo (id novo) → adiciona.
// - item que existe nos dois → fica com o mais recente (por "atualizadoEm"; sem essa
//   marca, o registro é tratado como antigo e perde pra qualquer versão datada).
// Nunca EXCLUI nada — só adiciona ou atualiza para uma versão mais nova.
export async function mesclarBackup() {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return { ok: false, cancelado: true };
  const a = res.assets[0];
  let texto = "";
  try {
    if (Platform.OS === "web") { const r = await fetch(a.uri); texto = await r.text(); }
    else { texto = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.UTF8 }); }
  } catch (e) { return { ok: false, erro: "Não consegui ler o arquivo." }; }

  let pacote;
  try { pacote = JSON.parse(texto); } catch (e) { return { ok: false, erro: "Arquivo inválido (não é um backup)." }; }
  if (!pacote || !APPS_ACEITOS.includes(pacote.app) || !pacote.dados) {
    return { ok: false, erro: "Este arquivo não é um backup do Aegrofin ou do AegroPrecisão." };
  }

  const porEntidade = {};
  let novos = 0, atualizados = 0;
  for (const entidade of ENTIDADES_LISTA) {
    const key = "dp:" + entidade;
    let importados = [];
    try { importados = JSON.parse(pacote.dados[key] || "[]"); } catch (e) { importados = []; }
    if (!Array.isArray(importados) || importados.length === 0) continue;

    let atuais = [];
    try { atuais = JSON.parse((await AsyncStorage.getItem(key)) || "[]"); } catch (e) { atuais = []; }
    const porId = new Map(atuais.map(x => [x.id, x]));

    let novosAqui = 0, atualizadosAqui = 0;
    for (const imp of importados) {
      if (!imp || !imp.id) continue;
      const meu = porId.get(imp.id);
      if (!meu) {
        porId.set(imp.id, imp);
        novosAqui++;
      } else {
        const tsImp = Date.parse(imp.atualizadoEm || 0) || 0;
        const tsMeu = Date.parse(meu.atualizadoEm || 0) || 0;
        if (tsImp > tsMeu) { porId.set(imp.id, imp); atualizadosAqui++; }
      }
    }
    if (novosAqui === 0 && atualizadosAqui === 0) continue;

    porEntidade[entidade] = { novos: novosAqui, atualizados: atualizadosAqui };
    novos += novosAqui;
    atualizados += atualizadosAqui;
    await AsyncStorage.setItem(key, JSON.stringify([...porId.values()]));
  }

  return { ok: true, novos, atualizados, porEntidade };
}

export async function ultimoBackup() {
  const v = await AsyncStorage.getItem(K_ULT);
  return v ? new Date(v) : null;
}

// Tem dados cadastrados? (pra só lembrar de backup quando faz sentido)
export async function temDados() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k && k.startsWith("dp:"));
  for (const k of keys) {
    if (k === "dp:seedProdutos") continue;
    const v = await AsyncStorage.getItem(k);
    try { const arr = JSON.parse(v); if (Array.isArray(arr) ? arr.length > 0 : !!arr) return true; } catch (e) {}
  }
  return false;
}

// Deve lembrar de fazer backup? (tem dados E (nunca fez OU faz > 7 dias)).
export async function precisaBackup() {
  if (!(await temDados())) return false;
  const ult = await ultimoBackup();
  if (!ult) return true;
  return (Date.now() - ult.getTime()) > 7 * 86400000;
}
