import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarContas } from "../../logic/fin/contas";
import { fmtMoeda } from "../../logic/fmt";
import { FC as C } from "../../logic/fin/finTheme";
import FinTabBar from "../../components/fin/FinTabBar";
import VazioEstado from "../../components/fin/VazioEstado";

export default function FinContasScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  useFocusEffect(useCallback(() => { listarContas().then(setItens); }, []));

  // Conta "sistema" (Estoque) fica de fora do total — ela representa valor
  // em produto, não dinheiro disponível em conta/caixa.
  const contasSomaveis = itens.filter((c) => !c.sistema);
  const total = contasSomaveis.reduce((s, c) => s + parseFloat(c.saldo_atual || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={s.totalCard}>
          <Text style={s.totalLbl}>Saldo Total em Contas</Text>
          <Text style={s.totalValor}>{fmtMoeda(total)}</Text>
          <Text style={s.totalSub}>{contasSomaveis.length} conta{contasSomaveis.length !== 1 ? "s" : ""}</Text>
        </View>

        <TouchableOpacity style={s.transferir} onPress={() => navigation.navigate("FinTransferencias")}>
          <Text style={s.transferirTxt}>⇄  Transferir entre contas</Text>
        </TouchableOpacity>

        {itens.length === 0 ? (
          <VazioEstado icone="🏦" titulo="Nenhuma conta" sub="Cadastre suas contas bancárias" />
        ) : itens.map((c) => (
          <TouchableOpacity key={c.id} style={s.row} onPress={() => navigation.navigate("FinContaForm", { item: c })}>
            <View style={s.rowIcone}><Text style={{ fontSize: 18 }}>🏦</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{c.nome}</Text>
              <Text style={s.sub}>{c.tipo}{c.banco ? " · " + c.banco : ""} · toque para ver</Text>
            </View>
            <Text style={[s.saldo, { color: c.saldo_atual >= 0 ? C.green : C.red }]}>{fmtMoeda(c.saldo_atual)}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("FinContaForm", {})}>
          <Text style={s.novoTxt}>＋ Nova conta</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
      <FinTabBar navigation={navigation} ativa="FinContas" />
    </View>
  );
}

const s = StyleSheet.create({
  totalCard: { backgroundColor: C.navy, borderRadius: 16, padding: 20, marginBottom: 14 },
  totalLbl: { color: "#d1fae5", fontSize: 12, fontWeight: "600" },
  totalValor: { color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 6 },
  totalSub: { color: "#d1fae5", fontSize: 11, marginTop: 4 },
  transferir: {
    backgroundColor: "#fff", borderColor: C.border, borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 13, alignItems: "center", marginBottom: 18,
  },
  transferirTxt: { color: C.navy, fontWeight: "700", fontSize: 14 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff",
    borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 10,
  },
  rowIcone: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.contaCard, alignItems: "center", justifyContent: "center" },
  nome: { color: C.text, fontSize: 14, fontWeight: "700" },
  sub: { color: "#9ca3af", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  saldo: { fontSize: 16, fontWeight: "800" },
  novo: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 6 },
  novoTxt: { color: "#fff", fontWeight: "700" },
});
