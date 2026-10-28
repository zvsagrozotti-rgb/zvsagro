// OCR do cupom no próprio aparelho (sem chave, sem custo, a foto não sai do aparelho).
//  - Web/PWA: Tesseract (tesseract.js), baixado do CDN na primeira leitura e guardado em cache pelo navegador.
//  - Android/iOS: Google ML Kit / Apple Vision, via expo-text-extractor (já embutido no app, funciona sem internet).
import { Platform } from "react-native";

const SCRIPT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let carregando = null;

function carregarTesseract() {
  if (typeof window === "undefined") return Promise.reject(new Error("sem janela"));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (carregando) return carregando;
  carregando = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT; s.async = true;
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Leitor indisponível.")));
    s.onerror = () => { carregando = null; reject(new Error("Não consegui baixar o leitor de texto. Veja a internet e tente de novo, ou preencha à mão.")); };
    document.head.appendChild(s);
  });
  return carregando;
}

function moduloNativo() {
  if (Platform.OS === "web") return null;
  try { return require("expo-text-extractor"); } catch (e) { return null; }
}

export function ocrDisponivel() {
  if (Platform.OS === "web") return true;
  const m = moduloNativo();
  return !!(m && m.isSupported);
}

const VAZIO = "Não achei texto na foto. Tire de novo com mais luz, com o cupom esticado e de frente.";

// base64 de um JPEG -> texto reconhecido. Lança erro com mensagem clara se não der.
export async function textoDaImagem(base64) {
  if (Platform.OS === "web") {
    const T = await carregarTesseract();
    const r = await T.recognize("data:image/jpeg;base64," + base64, "por");
    const texto = String((r && r.data && r.data.text) || "").trim();
    if (!texto) throw new Error(VAZIO);
    return texto;
  }
  const m = moduloNativo();
  if (!m || !m.isSupported) throw new Error("Este aparelho não consegue ler texto de fotos. Preencha os dados à mão.");
  // O leitor nativo trabalha com arquivo: grava a foto no cache e lê.
  const FileSystem = require("expo-file-system");
  const uri = FileSystem.cacheDirectory + "cupom-ocr.jpg";
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  const linhas = await m.extractTextFromImage(uri);
  const texto = (linhas || []).join("\n").trim();
  if (!texto) throw new Error(VAZIO);
  return texto;
}
