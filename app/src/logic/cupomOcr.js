// OCR do cupom no próprio aparelho (sem chave, sem custo, a foto não sai do aparelho).
// Usa o Tesseract (tesseract.js), carregado do CDN na primeira leitura e guardado em cache pelo navegador.
// Só na versão web/PWA. No app nativo ainda não há OCR: a tela pede o preenchimento à mão.
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

export function ocrDisponivel() { return Platform.OS === "web"; }

// base64 de um JPEG -> texto reconhecido (português). Lança erro com mensagem clara se não der.
export async function textoDaImagem(base64) {
  if (!ocrDisponivel()) throw new Error("A leitura automática por foto funciona na versão web. Preencha os dados à mão.");
  const T = await carregarTesseract();
  const r = await T.recognize("data:image/jpeg;base64," + base64, "por");
  const texto = String((r && r.data && r.data.text) || "").trim();
  if (!texto) throw new Error("Não achei texto na foto. Tire de novo com mais luz, com o cupom esticado e de frente.");
  return texto;
}
