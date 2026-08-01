import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarCartoes } from "../../logic/fin/cartoes";
import { fmtMoeda } from "../../logic/calc";
import { FC as C } from "../../logic/fin/finTheme";
import FinTabBar from "../../components/fin/FinTabBar";
import VazioEstado from "../../components/fin/VazioEstado";

export default function FinCartoesScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  useFocusEffect(useCallback(() => { listarCartoes().then(setItens); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {itens.length === 0 ? (
          <VazioEstado icone="💳" titulo="Nenhum cartão" sub="Adicione seus cartões de crédito" />
        ) : itens.map((c) => (
          <View key={c.id} style={s.card}>
            <TouchableOpacity onPress={() => navigation.navigate("FinCartaoForm", { item: c })}>
              <Text style={s.nome}>💳 {c.nome}{c.bandeira ? <Text style={s.bandeira}>  {c.bandeira}</Text> : null}</Text>
              <Text style={s.limite}>{fmtMoeda(c.limite)}</Text>
              <Text style={s.sub}>Limite · fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fatura} onPress={() => navigation.navigate("FinFatura", { cartao: c })}>
              <Text style={s.faturaTxt}>🧾 Ver fatura</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("FinCartaoForm", {})}>
          <Text style={s.novoTxt}>＋ Novo cartão</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
      <FinTabBar navigation={navigation} ativa="FinCartoes" />
    </View>
  );
}

const s = StyleSheet.create({
  novo: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 6 },
  novoTxt: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 12 },
  nome: { color: C.text, fontSize: 14, fontWeight: "700" },
  bandeira: { color: C.mut, fontSize: 11, fontWeight: "400" },
  limite: { fontSize: 20, fontWeight: "800", marginTop: 3, color: C.text },
  sub: { color: "#9ca3af", fontSize: 11, marginTop: 4 },
  fatura: { marginTop: 12, backgroundColor: "#fff", borderColor: C.border, borderWidth: 1.5, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  faturaTxt: { color: C.text, fontWeight: "700", fontSize: 13 },
});
