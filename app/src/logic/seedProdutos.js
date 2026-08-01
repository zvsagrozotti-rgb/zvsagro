// Semeia produtos comuns UMA vez (flag), adicionando só os que ainda não existem.
// IMPORTANTE: nome/tipo/formulação são genéricos e conhecidos; DOSE não é preenchida
// de propósito — dose/alvo dependem da cultura e devem vir da BULA + receituário agronômico.
import AsyncStorage from "./asyncStorage";
import { listar, salvar } from "./store";

const FLAG = "dp:seedProdutos";
const AVISO = "Dose e alvo: consultar a BULA oficial e o receituário agronômico. Princípio ativo: ";

const PADRAO = [
  { nome: "Glifosato 480 SL", tipo: "Herbicida", unidade: "L/ha", formulacao: "SL — solução", observacao: AVISO + "glifosato (herbicida sistêmico não seletivo)." },
  { nome: "2,4-D 806 SL", tipo: "Herbicida", unidade: "L/ha", formulacao: "SL — solução", observacao: AVISO + "2,4-D (auxina sintética; cuidado com deriva em culturas sensíveis)." },
  { nome: "Atrazina 500 SC", tipo: "Herbicida", unidade: "L/ha", formulacao: "SC — suspensão", observacao: AVISO + "atrazina (pré e pós-emergente)." },
  { nome: "Glufosinato 200 SL", tipo: "Herbicida", unidade: "L/ha", formulacao: "SL — solução", observacao: AVISO + "glufosinato-sal de amônio (contato)." },
  { nome: "Mancozebe 800 WP", tipo: "Fungicida", unidade: "kg/ha", formulacao: "WP — pó molhável", observacao: AVISO + "mancozebe (fungicida protetor, multissítio)." },
  { nome: "Clorotalonil 720 SC", tipo: "Fungicida", unidade: "L/ha", formulacao: "SC — suspensão", observacao: AVISO + "clorotalonil (protetor de contato)." },
  { nome: "Tebuconazol 200 EC", tipo: "Fungicida", unidade: "L/ha", formulacao: "EC/EW — emulsionável", observacao: AVISO + "tebuconazol (triazol, sistêmico)." },
  { nome: "Lambda-cialotrina 50 CS", tipo: "Inseticida", unidade: "L/ha", formulacao: "SC — suspensão", observacao: AVISO + "lambda-cialotrina (piretroide; formulação microencapsulada)." },
  { nome: "Clorpirifós 480 EC", tipo: "Inseticida", unidade: "L/ha", formulacao: "EC/EW — emulsionável", observacao: AVISO + "clorpirifós (organofosforado)." },
  { nome: "Imidacloprido 700 WG", tipo: "Inseticida", unidade: "kg/ha", formulacao: "WG/WDG — granulado", observacao: AVISO + "imidacloprido (neonicotinoide, sistêmico)." },
  { nome: "Óleo mineral (adjuvante)", tipo: "Adjuvante", unidade: "% v/v", formulacao: "Adjuvante / óleo", observacao: "Adjuvante. Dose em % v/v conforme recomendação." },
  { nome: "Óleo vegetal (adjuvante)", tipo: "Adjuvante", unidade: "% v/v", formulacao: "Adjuvante / óleo", observacao: "Adjuvante. Dose em % v/v conforme recomendação." },
  { nome: "Fertilizante foliar (Boro)", tipo: "Fertilizante", unidade: "L/ha", formulacao: "Fertilizante foliar", observacao: "Foliar. Dose conforme análise/recomendação." },
];

export async function seedProdutosPadrao() {
  try {
    const flag = await AsyncStorage.getItem(FLAG);
    if (flag === "1") return; // já semeou uma vez (respeita o que o usuário apagar depois)
    const atuais = await listar("produtos");
    const nomes = new Set((atuais || []).map(p => String(p.nome || "").toLowerCase().trim()));
    for (const p of PADRAO) {
      if (!nomes.has(p.nome.toLowerCase())) await salvar("produtos", { ...p });
    }
    await AsyncStorage.setItem(FLAG, "1");
  } catch (e) { /* silencioso */ }
}
