import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarCategorias } from "../../logic/fin/categorias";
import { FC as C } from "../../logic/fin/finTheme";

export default function FinCategoriasScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  useFocusEffect(useCallback(() => { listarCategorias().then(setItens); }, []));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("FinCategoriaForm", {})}>
        <Text style={s.novoTxt}>＋ Novo centro de custo</Text>
      </TouchableOpacity>
      {itens.length === 0 ? <Text style={s.vazio}>Nenhum centro de custo cadastrado.</Text> : itens.map((c) => (
        <TouchableOpacity key={c.id} style={s.row} onPress={() => navigation.navigate("FinCategoriaForm", { item: c })}>
          <View style={[s.dot, { backgroundColor: c.cor || "#6B7280" }]} />
          <Text style={s.nome}>{c.nome}</Text>
          <Text style={[s.tag, c.tipo === "receita" ? s.tagReceita : s.tagDespesa]}>{c.tipo}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  novo: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginBottom: 14 },
  novoTxt: { color: "#fff", fontWeight: "700" },
  vazio: { color: C.mut, fontSize: 13, textAlign: "center", marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  nome: { color: C.text, fontSize: 15, fontWeight: "700", flex: 1 },
  tag: { fontSize: 11, fontWeight: "700", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, overflow: "hidden" },
  tagReceita: { color: C.green, backgroundColor: C.greenBg },
  tagDespesa: { color: C.red, backgroundColor: C.redBg },
});
