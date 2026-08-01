import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FC as C } from "../../logic/fin/finTheme";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Barra "‹ Mês Ano ›" + pill "Ver todos os meses", igual à do FinControl.
// `mes` é {ano, mes} (mes 0-11) ou null quando "todos os meses" está ativo.
export default function FinMesNav({ mes, onMudar, todos, onTodos }) {
  return (
    <View>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => onMudar(-1)} style={s.seta} disabled={todos}>
          <Text style={[s.setaTxt, todos && { opacity: 0.35 }]}>‹</Text>
        </TouchableOpacity>
        <Text style={s.titulo}>{todos ? "Todos os períodos" : MESES[mes.mes] + " " + mes.ano}</Text>
        <TouchableOpacity onPress={() => onMudar(1)} style={s.seta} disabled={todos}>
          <Text style={[s.setaTxt, todos && { opacity: 0.35 }]}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={s.pillWrap}>
        <TouchableOpacity style={s.pill} onPress={onTodos}>
          <Text style={s.pillTxt}>{todos ? "Ver só este mês" : "Ver todos os meses"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  nav: { backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 12 },
  seta: { paddingHorizontal: 10, paddingVertical: 4 },
  setaTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  titulo: { color: "#fff", fontSize: 15, fontWeight: "800" },
  pillWrap: { backgroundColor: "#fff", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  pill: { borderColor: C.border, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 7 },
  pillTxt: { color: C.text, fontSize: 13, fontWeight: "700" },
});
