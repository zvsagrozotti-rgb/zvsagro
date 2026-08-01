// Entrada, saída, transferência e contagem (ajuste) de estoque. Saldo é
// sempre a soma das movimentações — não existe contador guardado à parte,
// então nunca fica dessincronizado do histórico.
import { listar, inserir, atualizar as atualizarMov } from "./store";
import { obter as obterLancamento } from "../fin/store";
import { editarReceita } from "../fin/receitas";
import { editarDespesa } from "../fin/despesas";
import { gerarReceitaDeSaida, gerarDespesaDeEntrada, ajustarContaEstoque } from "./financeiro";

export async function listarMovimentacoes() {
  const items = await listar("movimentacoes");
  return items.sort((a, b) => String(b.data).localeCompare(String(a.data)));
}

const chave = (produtoId, localId) => produtoId + "|" + localId;

export function saldoPorProdutoLocal(movimentacoes) {
  const saldo = {};
  const soma = (produtoId, localId, delta) => {
    const k = chave(produtoId, localId);
    saldo[k] = (saldo[k] || 0) + delta;
  };
  for (const m of movimentacoes) {
    const qtd = Number(m.quantidade) || 0;
    if (m.tipo === "entrada") soma(m.produtoId, m.localId, qtd);
    else if (m.tipo === "saida") soma(m.produtoId, m.localId, -qtd);
    else if (m.tipo === "ajuste") soma(m.produtoId, m.localId, qtd); // qtd já vem com o sinal da diferença
    else if (m.tipo === "transferencia") {
      soma(m.produtoId, m.localOrigemId, -qtd);
      soma(m.produtoId, m.localDestinoId, qtd);
    }
  }
  return saldo;
}

export function saldoDe(movimentacoes, produtoId, localId) {
  return saldoPorProdutoLocal(movimentacoes)[chave(produtoId, localId)] || 0;
}

// Custo médio ponderado do produto em cada local: toda entrada dilui/some
// no custo médio existente (qtd*custoMédio antigo + qtd nova*custo novo,
// dividido pela qtd total); saída e ajuste só mudam a quantidade, não o
// custo médio; transferência carrega o custo médio da origem pro destino
// (soma no custo médio de lá, do jeito que já tiver estoque). É recalculado
// na hora a partir do histórico inteiro — nunca fica um número guardado
// que possa dessincronizar.
export function custoMedioPonderado(movimentacoes, produtoId, localId) {
  const doProduto = movimentacoes
    .filter((m) => m.produtoId === produtoId)
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const estado = {};
  const pega = (loc) => estado[loc] || (estado[loc] = { qtd: 0, custoMedio: 0 });
  for (const m of doProduto) {
    const qtd = Number(m.quantidade) || 0;
    if (m.tipo === "entrada") {
      const e = pega(m.localId);
      const custoNovo = Number(m.custoUnitario) || 0;
      const valorTotal = e.qtd * e.custoMedio + qtd * custoNovo;
      e.qtd += qtd;
      e.custoMedio = e.qtd > 0 ? valorTotal / e.qtd : 0;
    } else if (m.tipo === "saida") {
      pega(m.localId).qtd -= qtd;
    } else if (m.tipo === "ajuste") {
      pega(m.localId).qtd += qtd; // ajuste não tem custo associado — não mexe no custo médio
    } else if (m.tipo === "transferencia") {
      const origem = pega(m.localOrigemId);
      const destino = pega(m.localDestinoId);
      const custoQueSai = origem.custoMedio;
      origem.qtd -= qtd;
      const valorTotalDestino = destino.qtd * destino.custoMedio + qtd * custoQueSai;
      destino.qtd += qtd;
      destino.custoMedio = destino.qtd > 0 ? valorTotalDestino / destino.qtd : 0;
    }
  }
  return (estado[localId] || { custoMedio: 0 }).custoMedio;
}

// Depois de registrar o movimento no estoque (e já ter ajustado a conta
// Estoque), tenta gerar o lançamento pendente em Contas a Pagar/Receber. Se
// isso falhar, o movimento de estoque e o ajuste na conta Estoque já foram
// salvos e ficam valendo — a pessoa só recebe um aviso pra criar o
// lançamento à mão, em vez de perder o que já fez no estoque por causa de
// um problema do lado financeiro.
async function comAvisoFinanceiro(mov, gerar) {
  try {
    await gerar();
    return mov;
  } catch (e) {
    return { ...mov, avisoFinanceiro: "Estoque atualizado, mas não consegui gerar o lançamento financeiro: " + e.message };
  }
}

// fornecedorId é opcional (quem vendeu pra gente) — vira o "Fornecedor" do
// lançamento em Contas a Pagar, mesmo cadastro de Clientes e Fornecedores.
export async function criarEntrada({ produtoId, produtoNome, localId, quantidade, custoUnitario, fornecedorId, data, observacao }) {
  if (!produtoId || !localId) throw new Error("Escolha o produto e o local.");
  if (!quantidade || quantidade <= 0) throw new Error("Informe uma quantidade válida.");
  const mov = await inserir("movimentacoes", {
    tipo: "entrada", produtoId, localId,
    quantidade: Number(quantidade), custoUnitario: Number(custoUnitario) || 0,
    fornecedorId: fornecedorId || null,
    data: data || new Date().toISOString(), observacao: observacao || null,
  });
  await ajustarContaEstoque(mov.quantidade * mov.custoUnitario);
  return comAvisoFinanceiro(mov, async () => {
    const r = await gerarDespesaDeEntrada({
      produtoNome, quantidade: mov.quantidade, custoUnitario: mov.custoUnitario, fornecedorId: mov.fornecedorId, data: mov.data.split("T")[0],
    });
    if (r?.lancamentoId) await atualizarMov("movimentacoes", mov.id, { lancamentoId: r.lancamentoId, lancamentoTipo: "despesa" });
  });
}

// Descobre de onde puxar quando a saída não trava num local só (localId
// vazio = "Automático"): pega primeiro dos locais com mais saldo, pra não
// deixar sobras pequenas espalhadas por aí. Erra se a soma de TODOS os
// locais não cobrir o pedido — nunca deixa vender mais do que existe.
function planoDeRetirada(movimentacoes, produtoId, quantidadeNecessaria) {
  const saldos = saldoPorProdutoLocal(movimentacoes);
  const porLocal = Object.entries(saldos)
    .filter(([k, saldo]) => k.split("|")[0] === produtoId && saldo > 0)
    .map(([k, saldo]) => ({ localId: k.split("|")[1], saldo }))
    .sort((a, b) => b.saldo - a.saldo);
  const totalDisponivel = porLocal.reduce((acc, l) => acc + l.saldo, 0);
  if (totalDisponivel < quantidadeNecessaria) {
    throw new Error("Saldo insuficiente: tem só " + totalDisponivel + " desse produto no total, somando todos os locais.");
  }
  const plano = [];
  let restante = quantidadeNecessaria;
  for (const l of porLocal) {
    if (restante <= 0) break;
    const usar = Math.min(l.saldo, restante);
    plano.push({ localId: l.localId, quantidade: usar });
    restante -= usar;
  }
  return plano;
}

// precoVenda é o que vai virar receita a receber; o custo (que sai IMEDIATAMENTE
// da conta Estoque, sem esperar baixa nenhuma) é o custo médio ponderado do
// produto em cada local NO MOMENTO da saída — snapshotado antes de inserir
// qualquer movimento, pra refletir exatamente o que tinha em estoque até então.
// clienteId é opcional (quem comprou da gente) — vira o "Cliente" do
// lançamento em Contas a Receber.
//
// localId vazio = "Automático": puxa de mais de um local se precisar
// (ver planoDeRetirada). Com localId, sai só dali — e trava se não tiver
// saldo suficiente NESSE local especificamente (nunca deixa vender mais
// do que existe). De qualquer forma nasce só UM lançamento (receita) pro
// valor total da venda, mesmo quando sai de vários locais.
export async function criarSaida({ produtoId, produtoNome, localId, quantidade, precoVenda, clienteId, data, observacao }) {
  if (!produtoId) throw new Error("Escolha o produto.");
  if (!quantidade || quantidade <= 0) throw new Error("Informe uma quantidade válida.");
  const qtd = Number(quantidade);
  const movsAntes = await listarMovimentacoes();

  let plano;
  if (localId) {
    const saldoLocal = saldoDe(movsAntes, produtoId, localId);
    if (qtd > saldoLocal) throw new Error("Saldo insuficiente nesse local: tem só " + saldoLocal + ". Use \"Automático\" pra puxar de outro local também.");
    plano = [{ localId, quantidade: qtd }];
  } else {
    plano = planoDeRetirada(movsAntes, produtoId, qtd);
  }

  const dataFinal = data || new Date().toISOString();
  const movs = [];
  let custoTotal = 0;
  for (const item of plano) {
    const custoUnitario = custoMedioPonderado(movsAntes, produtoId, item.localId);
    const mov = await inserir("movimentacoes", {
      tipo: "saida", produtoId, localId: item.localId,
      quantidade: item.quantidade, custoUnitario, precoVenda: Number(precoVenda) || 0,
      clienteId: clienteId || null,
      data: dataFinal, observacao: observacao || null,
    });
    custoTotal += item.quantidade * custoUnitario;
    movs.push(mov);
  }

  await ajustarContaEstoque(-custoTotal);

  return comAvisoFinanceiro(movs[0], async () => {
    const r = await gerarReceitaDeSaida({
      produtoNome, quantidade: qtd, precoVenda, clienteId, data: String(dataFinal).split("T")[0],
    });
    if (r?.lancamentoId) {
      await Promise.all(movs.map((m) => atualizarMov("movimentacoes", m.id, { lancamentoId: r.lancamentoId, lancamentoTipo: "receita" })));
    }
  });
}

export async function criarTransferencia({ produtoId, localOrigemId, localDestinoId, quantidade, data, observacao }) {
  if (!produtoId || !localOrigemId || !localDestinoId) throw new Error("Escolha o produto, a origem e o destino.");
  if (localOrigemId === localDestinoId) throw new Error("Origem e destino devem ser diferentes.");
  if (!quantidade || quantidade <= 0) throw new Error("Informe uma quantidade válida.");
  return inserir("movimentacoes", {
    tipo: "transferencia", produtoId, localOrigemId, localDestinoId,
    quantidade: Number(quantidade),
    data: data || new Date().toISOString(), observacao: observacao || null,
  });
}

// Contagem física: a pessoa informa quanto CONTOU de verdade no local: a
// diferença pro saldo atual vira um ajuste (positivo ou negativo), sempre
// rastreável (não edita/apaga histórico, só soma o que faltava ou sobrava).
export async function criarContagem({ produtoId, localId, quantidadeContada, data, observacao }) {
  if (!produtoId || !localId) throw new Error("Escolha o produto e o local.");
  if (quantidadeContada === "" || quantidadeContada === null || isNaN(quantidadeContada)) {
    throw new Error("Informe a quantidade contada.");
  }
  const movimentacoes = await listarMovimentacoes();
  const saldoAtual = saldoDe(movimentacoes, produtoId, localId);
  const diferenca = Number(quantidadeContada) - saldoAtual;
  if (diferenca === 0) return null; // já bate, não precisa lançar nada
  return inserir("movimentacoes", {
    tipo: "ajuste", produtoId, localId,
    quantidade: diferenca,
    data: data || new Date().toISOString(),
    observacao: observacao || ("Contagem física — saldo era " + saldoAtual + ", contado " + quantidadeContada),
  });
}

// Lançamento financeiro pareado a essa movimentação (se tiver) — usado pra
// saber se dá pra editar (pendente) ou não (baixado, precisa estornar antes).
export async function lancamentoDaMovimentacao(mov) {
  if (!mov?.lancamentoId) return null;
  return obterLancamento(mov.lancamentoTipo === "despesa" ? "despesas" : "receitas", mov.lancamentoId);
}

// Corrige uma entrada/saída/transferência/contagem já lançada. Tipo, produto
// e local ficam fixos (mudar isso pediria reconferir saldo/custo em outro
// lugar); só quantidade, custo/preço, data e observação são editáveis. Se
// tiver lançamento financeiro vinculado e ele já foi baixado, bloqueia —
// precisa estornar a baixa em Financeiro primeiro, senão o dinheiro que já
// mudou de conta fica dessincronizado do que o estoque mostra.
export async function editarMovimentacao(mov, { quantidade, custoUnitario, precoVenda, observacao, data }) {
  const lancamento = await lancamentoDaMovimentacao(mov);
  if (lancamento && lancamento.status === "baixado") {
    throw new Error("Esse movimento já tem um lançamento financeiro baixado. Estorne a baixa em Financeiro antes de editar.");
  }
  if (mov.lancamentoId) {
    const todas = await listarMovimentacoes();
    const irmas = todas.filter((m) => m.lancamentoId === mov.lancamentoId);
    if (irmas.length > 1) {
      throw new Error("Essa venda saiu de mais de um local ao mesmo tempo (\"Automático\") — editar uma parte separadamente ainda não é suportado. Para corrigir, cancele o lançamento em Financeiro e refaça a venda.");
    }
  }
  const patch = {
    quantidade: Number(quantidade),
    observacao: observacao || null,
    data: data || mov.data,
  };
  if (mov.tipo === "entrada") patch.custoUnitario = Number(custoUnitario) || 0;
  if (mov.tipo === "saida") { patch.custoUnitario = Number(custoUnitario) || 0; patch.precoVenda = Number(precoVenda) || 0; }

  if (mov.tipo === "entrada" || mov.tipo === "saida") {
    const custoAntigo = Number(mov.quantidade) * Number(mov.custoUnitario || 0);
    const custoNovo = patch.quantidade * patch.custoUnitario;
    const diferenca = custoNovo - custoAntigo;
    if (diferenca) await ajustarContaEstoque(mov.tipo === "entrada" ? diferenca : -diferenca);
  }

  const atualizado = await atualizarMov("movimentacoes", mov.id, patch);

  if (lancamento && lancamento.status === "pendente") {
    const novoValor = mov.tipo === "entrada" ? patch.quantidade * patch.custoUnitario : patch.quantidade * (patch.precoVenda || 0);
    if (novoValor > 0) {
      const dadosComuns = {
        descricao: lancamento.descricao, valor: novoValor,
        data_vencimento: String(patch.data).split("T")[0],
        categoria_id: lancamento.categoria_id, conta_id: lancamento.conta_id,
        cliente_id: lancamento.cliente_id, observacao: lancamento.observacao,
      };
      if (mov.tipo === "entrada") await editarDespesa(mov.lancamentoId, dadosComuns);
      else await editarReceita(mov.lancamentoId, dadosComuns);
    }
    // se o valor novo virou zero, deixa o lançamento como está (cancelar é
    // uma ação separada, em Financeiro — evita apagar algo sem querer aqui).
  }
  return atualizado;
}
