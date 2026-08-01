// Formatação e parsing de número — utilitário genérico usado por vários módulos.

// Converte texto pra número aceitando vírgula OU ponto decimal.
// O último separador (, ou .) é tratado como decimal; os demais são removidos.
// "2,50"->2.5  "2.50"->2.5  "1.234,56"->1234.56  "100"->100
export function num(v) {
  if (v == null) return NaN;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/[^0-9.,\-]/g, "");
  if (s === "" || s === "-") return NaN;
  const dec = Math.max(s.lastIndexOf(","), s.lastIndexOf("."));
  if (dec === -1) return parseFloat(s);
  const intPart = s.slice(0, dec).replace(/[.,]/g, "");
  const decPart = s.slice(dec + 1).replace(/[.,]/g, "");
  return parseFloat(intPart + "." + decPart);
}

export function fmt(n, d = 2) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

export function fmtMoeda(n) {
  const v = Number(n) || 0;
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
