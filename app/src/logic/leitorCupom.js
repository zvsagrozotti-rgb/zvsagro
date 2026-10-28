// Leitura de cupom fiscal (NFC-e / SAT / cupom comum) a partir do TEXTO que o OCR devolve.
// (Reaproveitado do FinControl offline; litros e tipo do FrotaFácil ficam em leitorFrota.js.)
// Não inventa nada: o que não achar com segurança fica vazio para a pessoa preencher.
// Devolve: { emitente, descricao, cnpj, valor, data (AAAA-MM-DD), pagamento, chave, sugestaoCategoria[], observacao, confianca }

const norm = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

// ---------- valores em reais ----------
// aceita 1.234,56 | 1234,56 | 12,5? (nao: exige 2 casas) | OCR que trocou a virgula por ponto (12.50)
const RE_VALOR = /(?<![\d,.])(\d{1,3}(?:[.\s]\d{3})+|\d+)[,.](\d{2})(?![\d])/g;
export function valoresDaLinha(linha) {
  const out = [];
  for (const m of String(linha).matchAll(RE_VALOR)) {
    const n = Number(m[1].replace(/[.\s]/g, "") + "." + m[2]);
    if (isFinite(n)) out.push(n);
  }
  return out;
}

// ---------- CNPJ ----------
export function cnpjValido(c) {
  const d = soDigitos(c);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base) => {
    let soma = 0, peso = base.length - 7;
    for (const ch of base) { soma += Number(ch) * peso--; if (peso < 2) peso = 9; }
    const r = soma % 11; return r < 2 ? 0 : 11 - r;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}
export const formatarCnpj = (c) => { const d = soDigitos(c); return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"); };

// ---------- chave de acesso (44 digitos, impressa em grupos de 4) ----------
const UFS = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF" };
export function lerChave(texto) {
  // 44 digitos juntos ou 11 grupos de 4 separados por espaco/ponto (como vem impresso)
  const m = String(texto).match(/(?<!\d)\d{44}(?!\d)/) || String(texto).match(/(?<!\d)(?:\d{4}[\s.]+){10}\d{4}(?!\d)/);
  if (!m) return null;
  const d = soDigitos(m[0]).slice(0, 44);
  if (d.length !== 44 || !UFS[d.slice(0, 2)]) return null;
  return { chave: d, uf: UFS[d.slice(0, 2)], aamm: d.slice(2, 6), cnpj: d.slice(6, 20), modelo: d.slice(20, 22), serie: d.slice(22, 25), numero: d.slice(25, 34) };
}

// ---------- total ----------
// prioridade 1 = o que foi realmente pago; 3 = so "total". Subtotais, itens, impostos e descontos nao entram.
const ROTULOS = [
  [1, /(VALOR|TOTAL)\s*(A\s*)?PAG(AR|O)|VALOR\s*PAGO|TOTAL\s*PAGO/],
  [2, /VALOR\s*TOTAL|TOTAL\s*GERAL|TOTAL\s*DO\s*CUPOM|TOTAL\s*DA\s*NOTA|TOTAL\s*NFC|VL\.?\s*TOTAL|TOTAL\s*DA\s*COMPRA/],
  [3, /^\s*TOTAL\b|\bTOTAL\s*R\$|\bTOTAL\s*:/],
];
const EXCLUI = /SUBTOTAL|SUB-TOTAL|ITENS|ITEM|TRIBUT|IMPOSTO|ICMS|PIS|COFINS|DESCONTO|ACRESCIMO|TROCO|QTD|QUANT|FRETE/;
export function acharTotal(linhas) {
  const cand = [];
  linhas.forEach((l0, i) => {
    const l = norm(l0);
    if (EXCLUI.test(l)) return;
    for (const [prio, re] of ROTULOS) {
      if (!re.test(l)) continue;
      let v = valoresDaLinha(l0);
      if (!v.length && linhas[i + 1] && !EXCLUI.test(norm(linhas[i + 1]))) v = valoresDaLinha(linhas[i + 1]).slice(0, 1);
      if (v.length) cand.push({ prio, valor: v[v.length - 1], linha: i });
      break;
    }
  });
  if (cand.length) { cand.sort((a, b) => a.prio - b.prio || b.linha - a.linha); return { valor: cand[0].valor, certo: true }; }
  // sem rotulo: so aceita se existir um unico valor "grande" que se repete (total + forma de pagamento) - senao deixa vazio
  const todos = linhas.flatMap((l) => (EXCLUI.test(norm(l)) ? [] : valoresDaLinha(l)));
  const cont = new Map(); todos.forEach((v) => cont.set(v, (cont.get(v) || 0) + 1));
  const rep = [...cont.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[0] - a[0]);
  return rep.length ? { valor: rep[0][0], certo: false } : { valor: null, certo: false };
}

// ---------- data ----------
export function acharData(linhas, hoje = new Date()) {
  const re = /(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})/;
  let melhor = null;
  for (const l of linhas) {
    const m = String(l).match(re);
    if (!m) continue;
    const [d, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(a, mo - 1, d);
    if (dt.getFullYear() !== a || dt.getMonth() !== mo - 1 || dt.getDate() !== d) continue;
    if (dt.getTime() > hoje.getTime() + 86400000 || a < hoje.getFullYear() - 6) continue;
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    if (/EMISS|EMITIDA|DATA/.test(norm(l))) return iso;
    if (!melhor) melhor = iso;
  }
  return melhor;
}

// ---------- emitente ----------
const NAO_NOME = /CUPOM|DANFE|NFC|NF-?E|NOTA\s*FISCAL|DOCUMENTO\s*AUXILIAR|CNPJ|CPF|\bIE\b|INSCR|ENDERECO|\bRUA\b|\bAV\b|AVENIDA|RODOVIA|\bKM\b|CEP|FONE|TEL\b|WWW|HTTP|CONSUMIDOR|SAT\b|EXTRATO|VENDA|ELETRONICA|ELETRÔNICA/;
export function acharEmitente(linhas) {
  const idxCnpj = linhas.findIndex((l) => /CNPJ/.test(norm(l)) || /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(l));
  const limite = idxCnpj > 0 ? idxCnpj : Math.min(linhas.length, 8);
  for (const l of linhas.slice(0, limite)) {
    const t = String(l).replace(/\s+/g, " ").trim();
    const letras = (t.match(/[A-Za-zÀ-ú]/g) || []).length;
    if (letras < 4 || letras < t.replace(/\s/g, "").length * 0.6) continue;
    if (NAO_NOME.test(norm(t))) continue;
    return t;
  }
  return "";
}
const tituloCase = (t) => t.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Ltda|Me|Epp|Eireli|Sa|S\/A)\b\.?$/i, "").trim();

// ---------- forma de pagamento ----------
export function acharPagamento(linhas) {
  const t = linhas.map(norm).join(" | ");
  if (/PIX/.test(t)) return "Pix";
  if (/CARTAO.*CREDITO|CREDITO/.test(t)) return "Cartão de crédito";
  if (/CARTAO.*DEBITO|DEBITO/.test(t)) return "Cartão de débito";
  if (/DINHEIRO/.test(t)) return "Dinheiro";
  if (/VALE|TICKET|ALIMENTACAO/.test(t)) return "Vale";
  return "";
}

// ---------- categoria sugerida (palavras para casar com os centros de custo que a pessoa ja criou) ----------
const CATEGORIAS = [
  [/POSTO|COMBUST|GASOLINA|ETANOL|DIESEL|\bGNV\b/, ["combust", "diesel", "posto", "gasolina"]],
  [/FARMACIA|DROGARIA|DROGA\b|LABORATORIO|CLINICA|HOSPITAL|ODONTO/, ["saude", "saúde", "farmacia", "farmácia", "medic"]],
  [/AGROPEC|AGRICOL|DEFENSIV|SEMENTE|FERTILIZ|VETERIN|RACAO|AGRO\b/, ["insumo", "agro", "defensiv", "fazenda", "lavoura"]],
  [/AUTO\s*PECAS|PECAS|PNEU|OFICINA|MECANIC|BORRACHARIA/, ["manuten", "pecas", "peças", "oficina"]],
  [/HOTEL|POUSADA|MOTEL/, ["hosped", "hotel", "viagem"]],
  [/MERCADO|SUPERMERC|ATACAD|HORTIFRUTI|PADARIA|ACOUGUE|RESTAURANTE|LANCHONETE|PIZZARIA|CHURRASC|SORVETE|CAFE|BAR\b|MERCEARIA/, ["aliment", "mercado", "comida", "refei"]],
];
export function sugerirCategoria(emitente) {
  const n = norm(emitente);
  for (const [re, termos] of CATEGORIAS) if (re.test(n)) return termos;
  return [];
}
// Escolhe, entre os centros de custo existentes, o que casa com a sugestao. null se nenhum.
export function escolherCategoria(termos, categorias) {
  if (!termos || !termos.length) return null;
  for (const c of categorias || []) {
    const n = norm(c.nome).toLowerCase();
    if (termos.some((t) => n.includes(norm(t).toLowerCase()))) return c;
  }
  return null;
}

// ---------- principal ----------
export function lerCupom(texto, hoje = new Date()) {
  const linhas = (Array.isArray(texto) ? texto : String(texto || "").split(/\r?\n/)).map((l) => String(l).trim()).filter(Boolean);
  const ch = lerChave(linhas.join(" "));
  let cnpj = "";
  for (const l of linhas) { const m = l.match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/); if (m && cnpjValido(m[0])) { cnpj = formatarCnpj(m[0]); break; } }
  if (!cnpj && ch && cnpjValido(ch.cnpj)) cnpj = formatarCnpj(ch.cnpj);
  const emitente = acharEmitente(linhas);
  const total = acharTotal(linhas);
  let data = acharData(linhas, hoje);
  if (!data && ch) data = null; // so a competencia (AAMM) seria conhecida: melhor deixar vazio do que chutar o dia
  const pagamento = acharPagamento(linhas);
  const partes = ["Cupom fiscal"];
  if (cnpj) partes.push("CNPJ " + cnpj);
  if (pagamento) partes.push("pago em " + pagamento.toLowerCase());
  if (ch) partes.push(`NF ${Number(ch.numero)}/${Number(ch.serie)} (${ch.uf})`);
  const achados = [emitente, total.valor, data].filter((x) => x !== "" && x != null).length;
  return {
    emitente, descricao: emitente ? tituloCase(emitente) : "", cnpj, valor: total.valor, valorCerto: total.certo, data, pagamento, chave: ch ? ch.chave : "",
    sugestaoCategoria: sugerirCategoria(emitente), observacao: partes.join(" - "),
    confianca: achados === 3 && total.certo ? "alta" : achados >= 2 ? "media" : "baixa",
  };
}

// numero -> texto do campo valor do formulario ("1234,56")
export const valorParaCampo = (n) => (n == null ? "" : n.toFixed(2).replace(".", ","));
