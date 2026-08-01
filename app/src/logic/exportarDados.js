// Exporta um arquivo com todos os cadastros/aplicações da empresa — pra
// quem for parar de usar o sistema levar os dados, ou só guardar uma cópia.
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { listar } from "./store";

const ENTIDADES_LISTA = ["clientes", "veiculos", "abastecimentos"];

function hojeArquivo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function exportarMeusDados() {
  const dados = {};
  let total = 0;
  for (const entidade of ENTIDADES_LISTA) {
    const itens = await listar(entidade);
    dados["dp:" + entidade] = JSON.stringify(itens || []);
    total += (itens || []).length;
  }

  const pacote = { app: "VZS Agro", tipo: "backup", versao: 1, em: new Date().toISOString(), dados };
  const json = JSON.stringify(pacote);
  const nome = "vzsagro-backup-" + hojeArquivo() + ".json";

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } else {
    const path = FileSystem.cacheDirectory + nome;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      try { await Sharing.shareAsync(path, { mimeType: "*/*", dialogTitle: "Backup VZS Agro" }); }
      catch (e) { /* arquivo já está salvo, só o compartilhar falhou */ }
    }
  }

  return { ok: true, arquivo: nome, total };
}
