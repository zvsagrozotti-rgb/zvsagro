import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FC as C } from "../../logic/fin/finTheme";

const ABAS = [
  { tela: "Financeiro", icone: "🏠", label: "Início" },
  { tela: "FinDespesas", icone: "🧾", label: "Despesas" },
  { tela: "FinReceitas", icone: "💰", label: "Receitas" },
  { tela: "FinContas", icone: "🏦", label: "Contas" },
  { tela: "FinCartoes", icone: "💳", label: "Cartões" },
  { tela: "FinRelatorio", icone: "📊", label: "Relatórios" },
];

export default function FinTabBar({ navigation, ativa }) {
  // No Android com navegação por gestos/botões, a barra ficava atrás dos
  // botões do sistema — soma a área segura de baixo ao padding da barra.
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: 6 + insets.bottom }]}>
      {ABAS.map((a) => {
        const on = a.tela === ativa;
        return (
          <TouchableOpacity key={a.tela} style={s.item} onPress={() => { if (!on) navigation.navigate(a.tela); }}>
            <Text style={[s.icone, on && { opacity: 1 }]}>{a.icone}</Text>
            <Text style={[s.label, on && s.labelOn]}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 6, paddingBottom: 6,
  },
  item: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 2 },
  icone: { fontSize: 18, opacity: 0.55 },
  label: { fontSize: 10, color: C.mut, fontWeight: "600" },
  labelOn: { color: C.green, fontWeight: "800" },
});
