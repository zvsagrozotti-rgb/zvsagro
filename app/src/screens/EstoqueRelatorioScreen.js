import React, { useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, SectionList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import { listarMovimentacoes, saldoPorProdutoLocal } from "../logic/estoque/movimentacoes";
import { imprimirRelatorioEstoque } from "../logic/estoque/estoqueRelatorioPrint";
import { avisar } from "../logic/confirm";
import { C } from "../theme";

// Um produto por linha, agrupado por tipo (Herbicida/Inseticida/...), só os
// que têm saldo positivo agora — quantidade total somando todos os locais.
export default function EstoqueRelatorioScreen() {
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [imprimindo, setImprimindo] = useState(false);

  const carregar = useCallback(() => {
    listarAgro("produtos").then(setProdutos);
    listarMovimentacoes().then(setMovimentacoes);
  }, []);
  useFocusEffect(carregar);

  const secoes = useMemo(() => {
    const saldos = saldoPorProdutoLocal(movimentacoes);
    const quantidadeDe = (produtoId) =>
      Object.entries(saldos)
        .filter(([chave]) => chave.split("|")[0] === produtoId)
        .reduce((soma, [, qtd]) => soma + qtd, 0);

    const linhas = produtos
      .map((p) => ({ ...p, quantidade: quantidadeDe(p.id) }))
      .filter((p) => p.quantidade > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    const grupos = {};
    linhas.forEach((p) => {
      const chaveGrupo = p.tipo || "Sem categoria";
      (grupos[chaveGrupo] = grupos[chaveGrupo] || []).push(p);
    });
    return Object.keys(grupos)
      .sort((a, b) => a.localeCompare(b))
      .map((tipo) => ({ title: tipo, data: grupos[tipo] }));
  }, [produtos, movimentacoes]);

  const totalItens = secoes.reduce((s, sec) => s + sec.data.length, 0);

  async function onImprimir() {
    setImprimindo(true);
    try {
      await imprimirRelatorioEstoque(secoes);
    } catch (e) {
      avisar("Erro", e.message || "Não foi possível gerar o relatório.");
    }
    setImprimindo(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SectionList
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        sections={secoes}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.h1}>📋 Relatório de Estoque</Text>
            <Text style={s.sub}>
              {totalItens} produto{totalItens !== 1 ? "s" : ""} com saldo no momento
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => <Text style={s.secao}>{section.title}</Text>}
        renderItem={({ item }) => {
          const minimo = Number(item.estoqueMinimo) || 0;
          const baixo = minimo > 0 && item.quantidade <= minimo;
          return (
            <View style={s.row}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.nome} numberOfLines={1}>{item.nome}</Text>
                {baixo ? <Text style={s.avisoBaixo}>⚠ abaixo do mínimo ({minimo})</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.qtd, baixo && s.qtdBaixo]}>{item.quantidade}</Text>
                {item.unidade ? <Text style={s.unidade}>{item.unidade}</Text> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhum produto com saldo em estoque no momento.</Text>}
        ListFooterComponent={
          totalItens > 0 ? (
            <TouchableOpacity style={[s.imprimir, imprimindo && { opacity: 0.6 }]} onPress={onImprimir} disabled={imprimindo}>
              <Text style={s.imprimirTxt}>{imprimindo ? "Gerando…" : "🖨️ Imprimir relatório (PDF)"}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { marginBottom: 6 },
  h1: { color: C.text, fontSize: 20, fontWeight: "800" },
  sub: { color: C.mut, fontSize: 12, marginTop: 4 },
  secao: { color: C.mut, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  row: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card,
    borderColor: C.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  nome: { color: C.text, fontSize: 14, fontWeight: "700" },
  avisoBaixo: { color: C.amarelo, fontSize: 11, marginTop: 3, fontWeight: "700" },
  qtd: { color: C.blue, fontSize: 20, fontWeight: "800" },
  qtdBaixo: { color: C.amarelo },
  unidade: { color: C.mut, fontSize: 10, marginTop: 1, textTransform: "uppercase" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 30 },
  imprimir: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  imprimirTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
