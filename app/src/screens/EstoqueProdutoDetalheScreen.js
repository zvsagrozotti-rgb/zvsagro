import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import { listarMovimentacoes, saldoPorProdutoLocal, custoMedioPonderado } from "../logic/estoque/movimentacoes";
import { C } from "../theme";

const LABEL_TIPO = { entrada: "Entrada", saida: "Saída", transferencia: "Transferência", ajuste: "Ajuste (contagem)" };

// Histórico completo de UM produto — onde comprou (fornecedor), pra quem
// vendeu (cliente), em qual local, tudo junto. Chegou aqui a partir de um
// toque no saldo, lá na tela de Estoque.
export default function EstoqueProdutoDetalheScreen({ navigation, route }) {
  const { produtoId, produtoNome } = route.params;

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [locais, setLocais] = useState([]);
  const [parceiros, setParceiros] = useState([]);

  const carregar = useCallback(() => {
    listarMovimentacoes().then((todas) => setMovimentacoes(todas.filter((m) => m.produtoId === produtoId)));
    listarAgro("locais").then(setLocais);
    listarAgro("clientes").then(setParceiros);
  }, [produtoId]);

  useFocusEffect(carregar);

  useLayoutEffect(() => {
    navigation.setOptions({ title: produtoNome || "Produto" });
  }, [navigation, produtoNome]);

  const nomeLocal = (id) => locais.find((l) => l.id === id)?.nome || "(local removido)";
  const nomeParceiro = (id) => parceiros.find((p) => p.id === id)?.nome || null;

  const saldo = saldoPorProdutoLocal(movimentacoes);
  const linhasSaldo = Object.keys(saldo)
    .map((k) => {
      const localId = k.split("|")[1];
      return { localId, saldo: saldo[k], custoMedio: custoMedioPonderado(movimentacoes, produtoId, localId) };
    })
    .filter((l) => l.saldo !== 0)
    .sort((a, b) => nomeLocal(a.localId).localeCompare(nomeLocal(b.localId)));

  const valorTotal = linhasSaldo.reduce((acc, l) => acc + (l.saldo > 0 ? l.saldo * l.custoMedio : 0), 0);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16 }}
      data={movimentacoes}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={[s.tituloSecao, { marginBottom: 0 }]}>Saldo atual</Text>
            {valorTotal > 0 ? <Text style={s.valorTotal}>R$ {valorTotal.toFixed(2)}</Text> : null}
          </View>
          {linhasSaldo.length === 0 ? (
            <Text style={s.vazio}>Sem saldo desse produto no momento.</Text>
          ) : (
            <View style={s.saldoBox}>
              {linhasSaldo.map((l) => (
                <View key={l.localId} style={s.saldoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.saldoLocal}>{nomeLocal(l.localId)}</Text>
                    {l.custoMedio > 0 ? <Text style={s.saldoCusto}>custo médio R$ {l.custoMedio.toFixed(2)}/un</Text> : null}
                  </View>
                  <Text style={s.saldoValor}>{l.saldo}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[s.tituloSecao, { marginTop: 22 }]}>Histórico</Text>
        </View>
      }
      ListEmptyComponent={<Text style={s.vazio}>Nenhuma movimentação desse produto ainda.</Text>}
      renderItem={({ item }) => {
        const parceiroId = item.tipo === "entrada" ? item.fornecedorId : item.tipo === "saida" ? item.clienteId : null;
        const parceiroLabel = item.tipo === "entrada" ? "Fornecedor" : "Cliente";
        const parceiroNome = parceiroId ? nomeParceiro(parceiroId) : null;
        return (
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate("EstoqueMovimento", { movimentacao: item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.sub}>
                {LABEL_TIPO[item.tipo] || item.tipo}
                {item.tipo === "transferencia"
                  ? " · " + nomeLocal(item.localOrigemId) + " → " + nomeLocal(item.localDestinoId)
                  : " · " + nomeLocal(item.localId)}
              </Text>
              {parceiroNome ? <Text style={s.parceiro}>{parceiroLabel}: {parceiroNome}</Text> : null}
              <Text style={s.data}>{new Date(item.data).toLocaleDateString("pt-BR")}</Text>
            </View>
            <Text style={[s.qtd, item.tipo === "saida" ? { color: C.red } : { color: C.blue }]}>
              {item.tipo === "saida" ? "-" + item.quantidade
                : item.tipo === "transferencia" ? "⇄ " + item.quantidade
                : (item.quantidade > 0 ? "+" : "") + item.quantidade}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  tituloSecao: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  valorTotal: { color: C.green, fontSize: 15, fontWeight: "800" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 10, lineHeight: 22 },
  saldoBox: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  saldoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomColor: C.border, borderBottomWidth: 1 },
  saldoLocal: { color: C.text, fontSize: 14, fontWeight: "700" },
  saldoCusto: { color: C.mut, fontSize: 11, marginTop: 2 },
  saldoValor: { color: C.blue, fontSize: 18, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  sub: { color: C.text, fontSize: 13, fontWeight: "700" },
  parceiro: { color: "#8fe6b0", fontSize: 12, marginTop: 3, fontWeight: "600" },
  data: { color: C.mut, fontSize: 11, marginTop: 2 },
  qtd: { fontSize: 18, fontWeight: "800", marginLeft: 10 },
});
