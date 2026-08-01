import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { obterDashboard } from "../../logic/fin/dashboard";
import { fmtMoeda } from "../../logic/calc";
import { lerEmpresa } from "../../logic/empresa";
import { FC as C } from "../../logic/fin/finTheme";
import FinTabBar from "../../components/fin/FinTabBar";

const ACOES = [
  { icone: "🧾", label: "Despesa", tela: "FinDespesas", cor: "#dc2626", fundo: "#fde8e8" },
  { icone: "💰", label: "Receita", tela: "FinReceitas", cor: "#16a34a", fundo: "#dcf5e3" },
  { icone: "🏦", label: "Contas", tela: "FinContas", cor: "#1a73e8", fundo: "#dbe9fd" },
  { icone: "💳", label: "Cartões", tela: "FinCartoes", cor: "#ca8a04", fundo: "#fdf1cf" },
];

export default function FinanceiroScreen({ navigation }) {
  const [d, setD] = useState(null);
  const [empresa, setEmpresa] = useState(null);

  useFocusEffect(useCallback(() => {
    obterDashboard().then(setD);
    lerEmpresa().then(setEmpresa);
  }, []));

  const mesAtual = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.ola}>Olá{empresa && empresa.nome ? ", " + empresa.nome : ""} 👋</Text>
        <Text style={s.mes}>{mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}</Text>

        <View style={s.saldoCard}>
          <Text style={s.saldoLbl}>Saldo em Contas (real)</Text>
          <Text style={s.saldoValor}>{d ? fmtMoeda(d.saldo_total) : "—"}</Text>
          <View style={s.saldoLinha}>
            <View>
              <Text style={s.saldoSubLbl}>↑ Recebido (mês)</Text>
              <Text style={[s.saldoSubValor, { color: "#8fe6b0" }]}>{d ? fmtMoeda(d.receitas_mes) : "—"}</Text>
            </View>
            <View style={s.divisor} />
            <View>
              <Text style={s.saldoSubLbl}>↓ Pago (mês)</Text>
              <Text style={[s.saldoSubValor, { color: "#ffb0b0" }]}>{d ? fmtMoeda(d.despesas_mes) : "—"}</Text>
            </View>
          </View>
        </View>

        <Text style={s.secaoT}>Ações Rápidas</Text>
        <View style={s.grid}>
          {ACOES.map((a) => (
            <TouchableOpacity key={a.tela} style={[s.tile, { backgroundColor: a.fundo }]} onPress={() => navigation.navigate(a.tela)}>
              <Text style={s.tileIcone}>{a.icone}</Text>
              <Text style={[s.tileLabel, { color: a.cor }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.secaoT}>Minhas Contas</Text>
        {!d || d.contas.length === 0 ? (
          <Text style={s.vazio}>Nenhuma conta cadastrada.</Text>
        ) : d.contas.map((c) => (
          <View key={c.id} style={s.contaRow}>
            <View>
              <Text style={s.contaNome}>{c.nome}</Text>
              <Text style={s.contaSub}>{c.tipo}</Text>
            </View>
            <Text style={[s.contaValor, { color: c.saldo_atual >= 0 ? C.text : C.red }]}>{fmtMoeda(c.saldo_atual)}</Text>
          </View>
        ))}

        <TouchableOpacity style={s.linkCentros} onPress={() => navigation.navigate("FinCategorias")}>
          <Text style={s.linkCentrosTxt}>🏷️ Centros de Custo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.linkCentros} onPress={() => navigation.navigate("FinTransferencias")}>
          <Text style={s.linkCentrosTxt}>🔁 Transferências entre contas</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
      <FinTabBar navigation={navigation} ativa="Financeiro" />
    </View>
  );
}

const s = StyleSheet.create({
  ola: { color: C.text, fontSize: 20, fontWeight: "800" },
  mes: { color: C.mut, fontSize: 13, marginTop: 2, marginBottom: 14 },
  saldoCard: { backgroundColor: C.navy, borderRadius: 16, padding: 20, marginBottom: 20 },
  saldoLbl: { color: "#d1fae5", fontSize: 12, fontWeight: "600" },
  saldoValor: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 6, marginBottom: 16 },
  saldoLinha: { flexDirection: "row", alignItems: "center" },
  saldoSubLbl: { color: "#d1fae5", fontSize: 11 },
  saldoSubValor: { fontSize: 15, fontWeight: "700", marginTop: 3 },
  divisor: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.25)", marginHorizontal: 24 },
  secaoT: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  tile: { width: "47%", flexGrow: 1, borderRadius: 14, paddingVertical: 18, alignItems: "center", gap: 6 },
  tileIcone: { fontSize: 24 },
  tileLabel: { fontSize: 13, fontWeight: "800" },
  vazio: { color: C.mut, fontSize: 13, marginBottom: 16 },
  contaRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 10,
  },
  contaNome: { color: C.text, fontSize: 14, fontWeight: "700" },
  contaSub: { color: "#9ca3af", fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  contaValor: { fontSize: 16, fontWeight: "800" },
  linkCentros: { paddingVertical: 12, alignItems: "center" },
  linkCentrosTxt: { color: C.blue, fontSize: 13, fontWeight: "700" },
});
