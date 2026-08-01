// Liga o estoque ao financeiro. Uma conta chamada "Estoque" guarda o valor
// do que está em estoque — ela credita/debita na hora (pelo CUSTO), assim
// que uma entrada/saída é registrada, sem depender de baixa nenhuma (ver
// ajustarContaEstoque, chamado direto por criarEntrada/criarSaida em
// movimentacoes.js). Em paralelo, saída também gera uma receita a receber e
// entrada uma despesa a pagar (as duas nascem "pendentes"), mas essas são
// só o registro financeiro do dinheiro que entra/sai de verdade quando a
// pessoa recebe/paga — dar baixa nelas não mexe mais na conta Estoque.
import { listarContas, criarConta, ajustarSaldoSistema, marcarContaComoSistema } from "../fin/contas";
import { criarReceita } from "../fin/receitas";
import { criarDespesa } from "../fin/despesas";
import { saldoPorProdutoLocal, custoMedioPonderado } from "./movimentacoes";

const NOME_CONTA_ESTOQUE = "Estoque";

// Acha (ou cria) a conta Estoque e garante que ela esteja marcada como
// "sistema" — uma conta sistema só muda de saldo por aqui (compra/venda de
// estoque), nunca por transferência/baixa/lançamento manual escolhido à mão
// (ver a trava em ajustarSaldo, em fin/contas.js). Contas Estoque criadas
// antes dessa trava existir são corrigidas na hora (backfill da flag).
export async function contaEstoqueId() {
  const contas = await listarContas();
  const existente = contas.find((c) => c.nome === NOME_CONTA_ESTOQUE);
  if (existente) {
    if (!existente.sistema) await marcarContaComoSistema(existente.id);
    return existente.id;
  }
  const nova = await criarConta({ nome: NOME_CONTA_ESTOQUE, tipo: "estoque", saldo_inicial: 0, sistema: true });
  return nova.id;
}

// Credita (delta > 0, entrada) ou debita (delta < 0, saída) a conta Estoque
// pelo valor de custo, na hora que o estoque muda — não espera baixa. Usa
// ajustarSaldoSistema (não ajustarSaldo) porque a conta Estoque é "sistema"
// e o ajustarSaldo normal recusaria mexer nela.
export async function ajustarContaEstoque(delta) {
  if (!delta) return;
  const estoqueId = await contaEstoqueId();
  await ajustarSaldoSistema(estoqueId, delta);
}

// Corrige de uma vez a conta Estoque pro valor real do que tem em estoque
// agora (soma de saldo × custo médio de cada produto/local). Serve pra
// acertar contas antigas que ficaram zeradas/erradas de antes dessa conta
// passar a se mexer na hora da entrada/saída.
export async function recalcularContaEstoque(movimentacoes) {
  const saldos = saldoPorProdutoLocal(movimentacoes);
  let valorReal = 0;
  for (const [chave, saldo] of Object.entries(saldos)) {
    if (saldo <= 0) continue;
    const [produtoId, localId] = chave.split("|");
    valorReal += saldo * custoMedioPonderado(movimentacoes, produtoId, localId);
  }
  const estoqueId = await contaEstoqueId();
  const contas = await listarContas();
  const atual = Number(contas.find((c) => c.id === estoqueId)?.saldo_atual || 0);
  const diferenca = valorReal - atual;
  if (diferenca) await ajustarSaldoSistema(estoqueId, diferenca);
  return valorReal;
}

// preço de venda é o que o cliente paga (vira a receita/valor a receber);
// custoUnitario (ou custoTotal, quando a venda saiu de mais de um local) já
// foi debitado da conta Estoque direto na criarSaida — aqui só registra o
// valor a receber (o preço cheio de venda), sem tocar mais na conta Estoque.
export async function gerarReceitaDeSaida({ produtoNome, quantidade, precoVenda, clienteId, data }) {
  const valor = Number(quantidade) * Number(precoVenda || 0);
  if (!valor) return null; // sem preço de venda informado, não tem o que cobrar
  const r = await criarReceita({
    descricao: "Saída de estoque — " + produtoNome,
    valor, data_vencimento: data, cliente_id: clienteId || null,
    origem: "estoque",
  });
  return { ...r, lancamentoId: r.ids[0] };
}

export async function gerarDespesaDeEntrada({ produtoNome, quantidade, custoUnitario, fornecedorId, data }) {
  const valor = Number(quantidade) * Number(custoUnitario || 0);
  if (!valor) return null;
  const r = await criarDespesa({
    descricao: "Entrada de estoque — " + produtoNome,
    valor, data_vencimento: data, cliente_id: fornecedorId || null,
    origem: "estoque",
  });
  return { ...r, lancamentoId: r.ids[0] };
}
