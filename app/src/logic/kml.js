// Importa contorno de talhão de arquivo KML ou KMZ (Google Earth, GPS, etc.).
// Retorna as coordenadas [[lat,lng], ...] do maior polígono encontrado.
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";

function parseBloco(bloco) {
  // "lon,lat,alt lon,lat,alt ..." (KML é lon,lat!) -> [[lat,lng], ...]
  return String(bloco).trim().split(/\s+/).map((t) => {
    const p = t.split(",");
    const lng = parseFloat(p[0]), lat = parseFloat(p[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  }).filter(Boolean);
}

// Extrai o maior anel de coordenadas do KML (normalmente o contorno do talhão).
export function parseKML(texto) {
  const t = String(texto || "");
  const blocos = [];
  const re = /<coordinates>([\s\S]*?)<\/coordinates>/gi;
  let m;
  while ((m = re.exec(t)) !== null) blocos.push(parseBloco(m[1]));
  let melhor = [];
  for (const b of blocos) if (b.length > melhor.length) melhor = b;
  // KML fecha o anel repetindo o 1º ponto no fim — remove a duplicata.
  if (melhor.length > 3) {
    const a = melhor[0], z = melhor[melhor.length - 1];
    if (a[0] === z[0] && a[1] === z[1]) melhor = melhor.slice(0, -1);
  }
  return melhor;
}

// Área geodésica (hectares) de um polígono [[lat,lng], ...] — mesma fórmula do mapa.
export function areaHectares(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return 0;
  const R = 6378137, rad = Math.PI / 180;
  let a = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const p1 = coords[i], p2 = coords[(i + 1) % n];
    a += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }
  return Math.abs(a * R * R / 2) / 10000;
}

function blobToBase64(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(",")[1] || "");
    r.readAsDataURL(blob);
  });
}

async function lerTexto(uri) {
  if (Platform.OS === "web") { const r = await fetch(uri); return await r.text(); }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}
async function lerBase64(uri) {
  if (Platform.OS === "web") { const r = await fetch(uri); const b = await r.blob(); return await blobToBase64(b); }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// Abre o seletor, lê o KML/KMZ e devolve { ok, coords } ou { ok:false, erro/cancelado }.
export async function importarKml() {
  let res;
  try {
    res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
  } catch (e) { return { ok: false, erro: "Não foi possível abrir o seletor de arquivos." }; }
  if (res.canceled || !res.assets || !res.assets[0]) return { ok: false, cancelado: true };
  const a = res.assets[0];
  const nome = (a.name || "").toLowerCase();

  let texto = "";
  try {
    if (nome.endsWith(".kmz") || (a.mimeType || "").includes("kmz")) {
      const b64 = await lerBase64(a.uri);
      const zip = await JSZip.loadAsync(b64, { base64: true });
      const arq = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith(".kml"));
      if (!arq) return { ok: false, erro: "O KMZ não contém um arquivo KML dentro." };
      texto = await zip.files[arq].async("string");
    } else {
      texto = await lerTexto(a.uri);
    }
  } catch (e) { return { ok: false, erro: "Não consegui ler o arquivo. Ele é um KML/KMZ válido?" }; }

  if (texto.indexOf("<coordinates>") === -1) {
    return { ok: false, erro: "Não achei coordenadas no arquivo. Ele precisa ser um KML/KMZ com um polígono." };
  }
  const coords = parseKML(texto);
  if (!coords || coords.length < 3) {
    return { ok: false, erro: "Não achei um polígono com pontos suficientes no arquivo." };
  }
  return { ok: true, coords, nome: a.name };
}
