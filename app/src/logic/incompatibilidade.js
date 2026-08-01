// Aviso HEURÍSTICO de incompatibilidade de calda — baseado em categorias gerais
// de química (cobre, enxofre, óleo, biológico), não numa tabela oficial de
// "produto X reage com produto Y" (isso não existe de forma pública/genérica —
// compatibilidade real depende da formulação/marca e está na bula de cada
// produto). Sempre recomenda bula + teste de jarro; nunca afirma com certeza.
import { filtrar, norm } from "./agrofit";

const CATEGORIAS = {
  cobre: ["cobre", "oxicloreto", "calda bordalesa", "hidroxido de cobre", "sulfato de cobre", "oxido cuproso"],
  enxofre: ["enxofre", "sulfocalcica"],
  oleo: ["oleo mineral", "oleo vegetal", "oleo emulsionavel", "oleo agricola", "adjuvante oleoso", "oleo naftenico"],
  biologico: ["bacillus", "beauveria", "trichoderma", "metarhizium", "biologico", "biopesticida", "baculovirus", "isaria"],
};

function categoriasDoTexto(texto) {
  const t = norm(texto);
  return Object.keys(CATEGORIAS).filter((cat) => CATEGORIAS[cat].some((kw) => t.includes(kw)));
}

// Tenta enriquecer com o ingrediente ativo/classe reais via busca no AGROFIT
// (casando pelo nome digitado) — se não achar, usa só nome + formulação mesmo.
function categoriasDoProduto(produto) {
  let extra = "";
  if (produto.nome) {
    const achados = filtrar({ q: produto.nome, limite: 3 });
    const exato = achados.find((p) => norm(p.n) === norm(produto.nome)) || achados[0];
    if (exato) extra = (exato.i || "") + " " + (exato.c || "");
  }
  return categoriasDoTexto([produto.nome, produto.formulacao, extra].filter(Boolean).join(" "));
}

const PARES_ATENCAO = [
  { a: "cobre", b: "oleo", msg: "cobre + óleo — combinação com histórico de fitotoxidez (queima de folhas), principalmente em dias quentes." },
  { a: "enxofre", b: "oleo", msg: "enxofre + óleo — risco de fitotoxidez, sobretudo acima de 30°C." },
  { a: "biologico", b: "cobre", msg: "produto biológico + cobre — cobre é bactericida/fungicida e pode matar o organismo do biológico, reduzindo a eficácia dele." },
  { a: "biologico", b: "enxofre", msg: "produto biológico + enxofre — enxofre é fungicida e pode reduzir a eficácia do biológico." },
];

// Retorna lista de avisos (strings) pros produtos informados na calda.
// Heurística por PALAVRAS-CHAVE no nome/ingrediente — não pega tudo (ex.: um
// adjuvante oleoso vendido só com nome de marca, sem "óleo" nem no nome nem no
// AGROFIT, passa batido). Por isso sempre recomenda bula + teste de jarro.
export function avaliarIncompatibilidade(produtos) {
  const validos = (produtos || []).filter((p) => p.nome && p.nome.trim());
  if (validos.length < 2) return [];

  const cats = validos.map((p) => ({ nome: p.nome, cats: categoriasDoProduto(p) }));
  const avisos = [];
  const vistos = new Set();

  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      for (const par of PARES_ATENCAO) {
        const cruzou =
          (cats[i].cats.includes(par.a) && cats[j].cats.includes(par.b)) ||
          (cats[i].cats.includes(par.b) && cats[j].cats.includes(par.a));
        if (!cruzou) continue;
        const chave = [cats[i].nome, cats[j].nome, par.a, par.b].sort().join("|");
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        avisos.push(cats[i].nome + " + " + cats[j].nome + ": " + par.msg);
      }
    }
  }
  return avisos;
}
