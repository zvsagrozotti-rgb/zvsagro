// Anexar e abrir arquivos (PDF) — funciona no web e no celular.
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1] || "");
    r.readAsDataURL(blob);
  });
}

// Abre o seletor e retorna { nome, tipo, dados(base64) } ou null.
export async function escolherArquivo() {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const a = res.assets[0];
  let dados = "";
  if (Platform.OS === "web") {
    const resp = await fetch(a.uri); const blob = await resp.blob();
    dados = await blobToBase64(blob);
  } else {
    dados = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  return { nome: a.name || "documento.pdf", tipo: a.mimeType || "application/pdf", dados };
}

// Abre/visualiza o arquivo guardado.
export async function abrirArquivo(item) {
  const tipo = item.tipo || "application/pdf";
  if (Platform.OS === "web") {
    try {
      const bin = atob(item.dados);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: tipo }));
      window.open(url, "_blank");
    } catch (e) { window.open("data:" + tipo + ";base64," + item.dados, "_blank"); }
    return;
  }
  const path = FileSystem.cacheDirectory + (item.nome || "documento.pdf");
  await FileSystem.writeAsStringAsync(path, item.dados, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
}
