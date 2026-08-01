import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import { listarMovimentacoes, saldoPorProdutoLocal, custoMedioPonderado } from "../logic/estoque/movimentacoes";
import { recalcularContaEstoque } from "../logic/estoque/financeiro";
import { avisar, confirmar } from "../logic/confirm";
import { C } from "../theme";

// Só o saldo aqui — o histórico de cada produto (onde comprou, de quem,
// pra quem vendeu) fica dentro da tela de detalhe, um toque adiante.
export default function EstoqueScreen({ navigation }) {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [locais, setLocais] = useState([]);

  const carregar = useCallback(() => {
    listarMovimentacoes().then(setMovimentacoes);
    listarAgro("produtos").then(setProdutos);
    listarAgro("locais").then(setLocais);
  }, []);

  useFocusEffect(carregar);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Estoque",
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("EstoqueMovimento")} style={{ paddingHorizontal: 14 }}>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>＋</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const nomeProduto = (id) => produtos.find((p) => p.id === id)?.nome || "(produto removido)";
  const nomeLocal = (id) => locais.find((l) => l.id === id)?.nome || "(local removido)";

  const saldo = saldoPorProdutoLocal(movimentacoes);
  const linhasSaldo = Object.keys(saldo)
    .map((k) => {
      const [produtoId, localId] = k.split("|");
      const custoMedio = custoMedioPonderado(movimentacoes, produtoId, localId);
      return { produtoId, localId, saldo: saldo[k], custoMedio };
    })
    .filter((l) => l.saldo !== 0)
    .sort((a, b) => nomeProduto(a.produtoId).localeCompare(nomeProduto(b.produtoId)));

  const valorTotalEstoque = linhasSaldo.reduce((acc, l) => acc + (l.saldo > 0 ? l.saldo * l.custoMedio : 0), 0);

  function onRecalcular() {
    confirmar(
      "Recalcular conta Estoque",
      "Isso ajusta o saldo da conta \"Estoque\" (em Financeiro) pra bater com o valor do que você tem em estoque agora (R$ " + valorTotalEstoque.toFixed(2) + "). Use se ela estiver zerada ou errada. Continuar?",
      async () => {
        const valor = await recalcularContaEstoque(movimentacoes);
        avisar("Pronto", "Conta Estoque ajustada para R$ " + valor.toFixed(2) + ".");
      }
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={linhasSaldo}
      keyExtractor={(l) => l.produtoId + l.localId}
      ListHeaderComponent={
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={[s.tituloSecao, { marginBottom: 0 }]}>Saldo atual</Text>
            {valorTotalEstoque > 0 ? <Text style={s.valorTotal}>R$ {valorTotalEstoque.toFixed(2)}</Text> : null}
          </View>
          <TouchableOpacity onPress={onRecalcular} style={{ marginBottom: 14 }}>
            <Text style={s.recalcular}>🔄 Recalcular conta Estoque em Financeiro</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={<Text style={s.vazio}>Nenhum saldo ainda.{"\n"}Toque em ＋ para lançar uma entrada.</Text>}
      renderItem={({ item: l }) => (
        <TouchableOpacity
          style={s.saldoRow}
          onPress={() => navigation.navigate("EstoqueProduto", { produtoId: l.produtoId, produtoNome: nomeProduto(l.produtoId) })}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.saldoProduto}>{nomeProduto(l.produtoId)}</Text>
            <Text style={s.saldoLocal}>{nomeLocal(l.localId)}{l.custoMedio > 0 ? " · custo médio R$ " + l.custoMedio.toFixed(2) + "/un" : ""}</Text>
          </View>
          <Text style={s.saldoValor}>{l.saldo}</Text>
          <Text style={s.chev}>›</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  tituloSecao: { color: C.text, fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  valorTotal: { color: C.green, fontSize: 15, fontWeight: "800" },
  recalcular: { color: C.blue, fontSize: 12, fontWeight: "700" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 10, lineHeight: 22 },
  saldoRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
  saldoProduto: { color: C.text, fontSize: 14, fontWeight: "700" },
  saldoLocal: { color: C.mut, fontSize: 11, marginTop: 2 },
  saldoValor: { color: C.blue, fontSize: 18, fontWeight: "800" },
  chev: { color: C.mut, fontSize: 20, fontWeight: "800", marginLeft: 8 },
});
