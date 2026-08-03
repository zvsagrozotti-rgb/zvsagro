// Integração Frota -> Financeiro: cada abastecimento novo gera uma conta a
// pagar (categoria "Combustível"), já pronta pra dar baixa quando for paga.
import { criarDespesa } from "../fin/despesas";
import { listarCategorias, criarCategoria } from "../fin/categorias";

const NOME_CATEGORIA = "Combustível";

async function categoriaCombustivelId() {
  const categorias = await listarCategorias();
  const existente = categorias.find(
    (c) => c.tipo === "despesa" && String(c.nome || "").trim().toLowerCase() === NOME_CATEGORIA.toLowerCase()
  );
  if (existente) return existente.id;
  const nova = await criarCategoria({ nome: NOME_CATEGORIA, tipo: "despesa", cor: "#F4C430" });
  return nova.id;
}

// Cria a conta a pagar referente a um abastecimento. Retorna o id da
// despesa criada, ou null se não tinha valor (volume/preço em branco) pra
// gerar lançamento nenhum.
export async function gerarContaAPagar({ abastecimentoId, veiculoNome, data, valor }) {
  if (!(valor > 0)) return null;
  const categoria_id = await categoriaCombustivelId();
  const descricao = "Combustível — " + (veiculoNome || "veículo");
  const r = await criarDespesa({
    descricao,
    valor,
    data_vencimento: data,
    categoria_id,
    origem: "abastecimento:" + abastecimentoId,
  });
  return r.ids[0];
}
