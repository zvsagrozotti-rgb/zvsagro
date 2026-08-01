// Lógica de cálculo — pura, offline, reutilizável (portada do protótipo validado).

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

export const UNIDADES = ["L/ha", "mL/ha", "kg/ha", "g/ha", "% v/v", "mL/L", "g/L"];

// Formulações e a ORDEM DE PREPARO da calda (1 = adicionar primeiro).
export const FORMULACOES = [
  "WG/WDG — granulado",
  "WP — pó molhável",
  "SC — suspensão",
  "SE/OD — óleo/suspoemulsão",
  "EC/EW — emulsionável",
  "SL — solução",
  "Adjuvante / óleo",
  "Fertilizante foliar",
  "Outro",
];
const ORDEM_FORM = {
  "WG/WDG — granulado": 1, "WP — pó molhável": 2, "SC — suspensão": 3,
  "SE/OD — óleo/suspoemulsão": 4, "EC/EW — emulsionável": 5, "SL — solução": 6,
  "Outro": 7, "Adjuvante / óleo": 8, "Fertilizante foliar": 9,
};
export function ordemDe(formulacao) { return ORDEM_FORM[formulacao] != null ? ORDEM_FORM[formulacao] : 7; }
const PORAREA = new Set(["L/ha", "mL/ha", "kg/ha", "g/ha"]);
const LIQUIDO = new Set(["L/ha", "mL/ha", "% v/v", "mL/L"]); // descontam volume da água

// Quanto de um produto, dada a dose, a área e o volume de calda daquele lote.
function qtdProduto(p, areaLote, caldaLote) {
  const dose = num(p.dose) || 0;
  if (PORAREA.has(p.uni)) return { q: dose * areaLote, un: p.uni.split("/")[0], liqL: liquidoL(p.uni, dose * areaLote) };
  if (p.uni === "% v/v") { const q = (dose / 100) * caldaLote; return { q, un: "L", liqL: q }; }
  if (p.uni === "mL/L") { const q = dose * caldaLote; return { q, un: "mL", liqL: q / 1000 }; }
  if (p.uni === "g/L") { return { q: dose * caldaLote, un: "g", liqL: 0 }; }
  return { q: 0, un: "", liqL: 0 };
}
function liquidoL(uni, q) {
  if (!LIQUIDO.has(uni)) return 0;
  if (uni === "mL/ha") return q / 1000; // q em mL
  if (uni === "L/ha") return q;          // q em L
  return 0;
}

// Calcula a calda. Com ÁREA = cálculo pelo TALHÃO (total) + nº de caldas no misturador.
// Sem área = uma calda do misturador. Retorna null se faltar tanque/vazão.
export function calcularCalda({ tanque, vazao, areaTotal, produtos }) {
  const T = num(tanque), V = num(vazao), area = num(areaTotal) || 0;
  if (!(T > 0) || !(V > 0)) return null;
  const A = T / V; // ha que uma calda cheia (misturador) cobre
  const lista = (produtos || []).filter(p => p.nome || p.dose);

  if (area > 0) {
    const caldaTotal = V * area;                         // litros de calda p/ o talhão todo
    const nCaldas = Math.max(1, Math.ceil(caldaTotal / T));
    const areaPorCalda = Math.min(A, area);              // 1 calda só cobre o talhão inteiro se couber
    const caldaCheia = Math.min(T, caldaTotal);          // volume da calda (única) quando cabe no misturador
    let aguaDescTotal = 0, aguaDescCalda = 0;
    const itens = lista.map(p => {
      const tot = qtdProduto(p, area, caldaTotal);
      const cal = qtdProduto(p, areaPorCalda, caldaCheia);
      aguaDescTotal += tot.liqL; aguaDescCalda += cal.liqL;
      return { nome: p.nome || "(sem nome)", un: tot.un, total: tot.q, porCalda: cal.q, formulacao: p.formulacao || "", ordem: ordemDe(p.formulacao) };
    });
    return {
      modo: "talhao", area, caldaTotal, nCaldas, areaPorCalda,
      aguaTotal: Math.max(0, caldaTotal - aguaDescTotal),
      aguaPorCalda: Math.max(0, caldaCheia - aguaDescCalda),
      itens,
    };
  }

  // Sem área: uma calda cheia do misturador.
  let aguaDesc = 0;
  const itens = lista.map(p => {
    const c = qtdProduto(p, A, T);
    aguaDesc += c.liqL;
    return { nome: p.nome || "(sem nome)", un: c.un, porCalda: c.q, formulacao: p.formulacao || "", ordem: ordemDe(p.formulacao) };
  });
  return { modo: "tanque", areaPorCalda: A, aguaPorCalda: Math.max(0, T - aguaDesc), itens };
}

// Bulbo úmido (Stull, 2011) e Delta T.
export function wetBulb(T, RH) {
  RH = Math.max(1, Math.min(100, RH));
  return T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5))
    + Math.atan(T + RH) - Math.atan(RH - 1.676331)
    + 0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;
}
export function deltaT(T, RH) { return T - wetBulb(T, RH); }
export function corDT(dt) {
  if (dt < 2) return "#7EC8FF";
  if (dt <= 8) return "#34D399";
  if (dt <= 10) return "#FFD23F";
  return "#FF5C5C";
}
export function statusDT(dt) {
  if (dt < 2) return "RISCO — inversão / deriva";
  if (dt <= 8) return "IDEAL para pulverizar";
  if (dt <= 10) return "MARGINAL — use cautela";
  return "INADEQUADO — gota evapora";
}

// Taxa (L/ha) a partir de vazão dos bicos, velocidade e largura da faixa.
export function vazaoLha(q, vel, faixa) {
  q = num(q); vel = num(vel); faixa = num(faixa);
  if (q > 0 && vel > 0 && faixa > 0) return (q * 600) / (vel * faixa);
  return null;
}

export function fmt(n, d = 2) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

export function fmtMoeda(n) {
  const v = Number(n) || 0;
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Cobrança: valor por hectare × área + (opcional) deslocamento (R$/km × km).
export function calcFinanceiro(f) {
  const area = num(f.area) || 0;
  const vha = num(f.valorHa) || 0;
  const vAplic = vha * area;
  const vDesl = f.cobraDeslocamento ? (num(f.valorKm) || 0) * (num(f.km) || 0) : 0;
  return { area, vha, vAplic, vDesl, total: vAplic + vDesl };
}

export const DT_TEMPS = (() => { const a = []; for (let t = 40; t >= 10; t -= 2) a.push(t); return a; })();
export const DT_UMID = [20, 30, 40, 50, 60, 70, 80, 90, 100];
