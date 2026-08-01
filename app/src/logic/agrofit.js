// Catálogo AGROFIT (base oficial do MAPA). É grande (~4,5 MB), então é
// carregado SOB DEMANDA (só na primeira vez que a busca/tabela é aberta),
// pra não pesar na abertura do app.
let _cat = null;
let _idx = null;

export function norm(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Carrega o JSON só quando precisa.
export function catalogo() {
  if (!_cat) _cat = require("../data/agrofit.json");
  return _cat;
}
export function total() { return catalogo().length; }

// Índice de busca (nome + ingrediente + classe + culturas + pragas).
function idx() {
  if (!_idx) {
    _idx = catalogo().map((p) => ({
      p,
      s: norm(p.n + " " + p.i + " " + p.c + " " + (p.cul || []).join(" ") + " " + (p.prg || []).join(" ")),
    }));
  }
  return _idx;
}

// Filtra por texto (todos os termos, sem acento) e opcionalmente por tipo.
// limite = 0 → sem limite (usado na tabela). Retorna array de produtos.
export function filtrar({ q = "", tipo = "", limite = 0 } = {}) {
  const termos = norm(q).split(/\s+/).filter(Boolean);
  const ix = idx();
  const out = [];
  for (let i = 0; i < ix.length; i++) {
    if (limite && out.length >= limite) break;
    const it = ix[i];
    if (tipo && it.p.t !== tipo) continue;
    let ok = true;
    for (const t of termos) { if (it.s.indexOf(t) === -1) { ok = false; break; } }
    if (ok) out.push(it.p);
  }
  return out;
}

export const TIPOS = ["Herbicida", "Inseticida", "Fungicida", "Adjuvante", "Fertilizante", "Outro"];
