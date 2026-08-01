// Importa um backup da versão ANTERIOR (offline: AegroPrecisão ou AegroFin
// local) pra dentro da conta online — usado na migração pra essa versão nova.
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { salvar } from "./store";

const ENTIDADES_LISTA = ["clientes", "fazendas", "talhoes", "produtos", "drones", "pilotos", "aplicacoes"];

export async function importarBackupAntigo() {
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
  if (!pacote || !pacote.dados || !["AegroPrecisao", "Aegrofin", "AegroFin Online"].includes(pacote.app)) {
    return { ok: false, erro: "Esse arquivo não parece ser um backup do AegroPrecisão/AegroFin." };
  }

  const porEntidade = {};
  let total = 0;
  for (const entidade of ENTIDADES_LISTA) {
    const chave = "dp:" + entidade;
    let itens = [];
    try { itens = JSON.parse(pacote.dados[chave] || "[]"); } catch (e) { itens = []; }
    if (!Array.isArray(itens) || itens.length === 0) continue;

    let importados = 0;
    for (const item of itens) {
      if (!item) continue;
      // O id antigo (gerado localmente) não é um UUID válido pro banco online —
      // deixa o sistema gerar um novo ao salvar.
      const { id, ...resto } = item;
      try { await salvar(entidade, resto); importados++; } catch (e) { /* pula o que der erro, não trava o resto */ }
    }
    if (importados > 0) { porEntidade[entidade] = importados; total += importados; }
  }

  return { ok: true, total, porEntidade, deOnde: pacote.app };
}
