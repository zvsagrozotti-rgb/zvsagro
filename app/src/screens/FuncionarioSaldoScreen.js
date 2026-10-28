import React, { useState, useCallback, useLayoutEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { carregarTudo, souAdministrador } from "../logic/cupons";
import { resumoFuncionario } from "../logic/saldo";
import { fmtMoeda } from "../logic/fmt";
import { C } from "../theme";

function dataBR(d) { const p = String(d || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : (d || ""); }

// Saldo do funcionário no ciclo aberto, com os cupons e os botões do administrador.
export default function FuncionarioSaldoScreen({ route, navigation }) {
  const { funcionarioId } = route.params;
  const [func, setFunc] = useState(null);
  const [res, setRes] = useState(null);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(useCallback(() => {
    carregarTudo().then(({ funcionarios, cupons, creditos }) => {
      setFunc(funcionarios.find((f) => f.id === funcionarioId) || null);
      setRes(resumoFuncionario(funcionarioId, creditos, cupons));
    });
    souAdministrador().then(setAdmin);
  }, [funcionarioId]));

  useLayoutEffect(() => { navigation.setOptions({ title: func ? func.nome : "Funcionário" }); }, [navigation, func]);

  if (!res) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const cupons = res.cuponsAbertos.slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.lbl}>Saldo do ciclo</Text>
        <Text style={[s.saldo, { color: res.saldo < 0 ? C.red : C.greenClaro }]}>{fmtMoeda(res.saldo)}</Text>
        <Text style={s.det}>Adiantado {fmtMoeda(res.adiantado)}  ·  Gasto {fmtMoeda(res.gasto)}</Text>
        {Object.keys(res.porTipo).length > 0 ? (
          <Text style={s.det}>{Object.entries(res.porTipo).map(([t, v]) => t + " " + fmtMoeda(v)).join("  ·  ")}</Text>
        ) : null}
        {res.saldo < 0 ? <Text style={s.alerta}>Gastou {fmtMoeda(-res.saldo)} a mais que o adiantado.</Text> : null}
      </View>

      <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("CupomForm", { funcionarioId })}>
        <Text style={s.novoTxt}>📷  Novo cupom</Text>
      </TouchableOpacity>

      {admin ? (
        <View style={s.linhaBtns}>
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate("Adiantamento", { funcionarioId, modo: "adiantamento" })}>
            <Text style={s.btnTxt}>💰 Lançar adiantamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate("Adiantamento", { funcionarioId, modo: "fechar" })}>
            <Text style={s.btnTxt}>✅ Fechar ciclo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {res.creditosAbertos.length > 0 ? (
        <>
          <Text style={s.secao}>Adiantamentos do ciclo</Text>
          {res.creditosAbertos.map((c) => (
            <View key={c.id} style={s.row}>
              <View style={{ flex: 1 }}><Text style={s.rowT}>{c.descricao || "Adiantamento"}</Text><Text style={s.rowS}>{dataBR(c.data)}</Text></View>
              <Text style={[s.rowV, { color: C.greenClaro }]}>+ {fmtMoeda(c.valor)}</Text>
            </View>
          ))}
        </>
      ) : null}

      <Text style={s.secao}>Cupons do ciclo</Text>
      {cupons.length === 0 ? <Text style={s.vazio}>Nenhum cupom neste ciclo.</Text> : null}
      {cupons.map((c) => (
        <TouchableOpacity key={c.id} style={s.row} onPress={() => navigation.navigate("CupomForm", { funcionarioId, cupom: c })}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.rowT} numberOfLines={1}>{c.estabelecimento || c.tipo}</Text>
            <Text style={s.rowS}>{dataBR(c.data)} · {c.tipo}</Text>
          </View>
          <Text style={[s.rowV, { color: C.red }]}>− {fmtMoeda(c.valor)}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 14 },
  lbl: { color: C.mut, fontSize: 12, fontWeight: "700" },
  saldo: { fontSize: 32, fontWeight: "800", marginTop: 4 },
  det: { color: C.mut, fontSize: 12, marginTop: 6 },
  alerta: { color: C.red, fontSize: 12, fontWeight: "700", marginTop: 8 },
  novo: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  novoTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
  linhaBtns: { flexDirection: "row", gap: 10, marginBottom: 6 },
  btn: { flex: 1, backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 11, paddingVertical: 13, alignItems: "center" },
  btnTxt: { color: C.text, fontSize: 13, fontWeight: "800" },
  secao: { color: C.text, fontSize: 15, fontWeight: "800", marginTop: 18, marginBottom: 10 },
  vazio: { color: C.mut, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 11, padding: 13, marginBottom: 8 },
  rowT: { color: C.text, fontSize: 14, fontWeight: "700" },
  rowS: { color: C.mut, fontSize: 11, marginTop: 2 },
  rowV: { fontSize: 14, fontWeight: "800" },
});
