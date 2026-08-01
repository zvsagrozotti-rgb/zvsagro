import React from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { C } from "../theme";

const ITENS = [
  { icon: "🧾", titulo: "Compra", sub: "Entrada de produtos — vira despesa a pagar", tela: "Compra" },
  { icon: "💰", titulo: "Venda", sub: "Saída de produtos — vira receita a receber", tela: "Venda" },
  { icon: "📦", titulo: "Estoque", sub: "Saldo, custo médio e histórico completo", tela: "Estoque" },
  { icon: "📋", titulo: "Relatório", sub: "Quantidade em estoque de cada produto", tela: "EstoqueRelatorio" },
];

export default function FaturamentoScreen({ navigation }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.scroll}>
      <View style={s.grid}>
        {ITENS.map((it, i) => (
          <TouchableOpacity key={i} style={s.card} onPress={() => navigation.navigate(it.tela)}>
            <Text style={s.icon}>{it.icon}</Text>
            <Text style={s.titulo}>{it.titulo}</Text>
            <Text style={s.cardSub}>{it.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", flexGrow: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, minHeight: 120 },
  icon: { fontSize: 30, marginBottom: 8 },
  titulo: { color: C.text, fontSize: 15, fontWeight: "800" },
  cardSub: { color: C.mut, fontSize: 11, marginTop: 4, lineHeight: 15 },
});
