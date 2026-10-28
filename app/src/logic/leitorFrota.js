// Cupom do FrotaFácil: usa o leitor genérico (leitorCupom.js) e acrescenta o tipo (Combustível,
// Alimentação ou Outros) e os litros. Tudo que não for achado com segurança fica null.
import { lerCupom } from "./leitorCupom.js";

const norm = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// Acha "40,500 L" / "40.500 LT" / "QTD 40,500". Só aceita quantidade com 2 ou 3 casas e diferente do total.
export function acharLitros(linhas, total) {
  for (const l of linhas) {
    const m = String(l).match(/(\d{1,4}[.,]\d{2,3})\s*(?:L|LT|LTS|LITROS?)(?![A-Za-z])/i);
    if (m) { const v = Number(m[1].replace(",", ".")); if (v > 0 && v !== total) return v; }
  }
  for (const l of linhas) {
    if (!/QTD|QUANT|LITROS/.test(norm(l))) continue;
    const m = String(l).match(/(\d{1,4}[.,]\d{3})/);
    if (m) { const v = Number(m[1].replace(",", ".")); if (v > 0 && v !== total) return v; }
  }
  return null;
}

export function lerCupomFrotaFacil(texto, hoje = new Date()) {
  const r = lerCupom(texto, hoje);
  const linhas = (Array.isArray(texto) ? texto : String(texto || "").split(/\r?\n/)).map((l) => String(l).trim()).filter(Boolean);
  const t = norm(linhas.join(" "));
  let tipo = "Outros";
  if (/GASOLINA|ETANOL|DIESEL|\bGNV\b|COMBUST|POSTO/.test(t)) tipo = "Combustível";
  else if (r.sugestaoCategoria.includes("aliment") ||
    /REFEIC|LANCHE|MARMIT|ALMOCO|JANTAR|PRATO|BEBIDA|SUCO|REFRIG|AGUA|CAFE|PADARIA|MERCADO|RESTAURANTE/.test(t)) tipo = "Alimentação";
  const litros = tipo === "Combustível" ? acharLitros(linhas, r.valor) : null;
  return {
    estabelecimento: r.descricao || null, cnpj: r.cnpj || null, data: r.data || null, total: r.valor,
    tipo, litros, preco_litro: litros && r.valor ? Math.round((r.valor / litros) * 1000) / 1000 : null,
    confianca: r.confianca,
  };
}
