import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { ENTIDADES, ORDEM_CADASTRO } from "../logic/entidades";
import { C } from "../theme";

export default function CadastrosScreen({ navigation }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      {ORDEM_CADASTRO.map((ent) => {
        const cfg = ENTIDADES[ent];
        return (
          <TouchableOpacity key={ent} style={s.row} onPress={() => navigation.navigate("CrudList", { entidade: ent })}>
            <Text style={s.icon}>{cfg.icon}</Text>
            <Text style={s.txt}>{cfg.titulo}</Text>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 10 },
  icon: { fontSize: 22 },
  txt: { color: C.text, fontSize: 15, fontWeight: "700", flex: 1 },
  chev: { color: C.mut, fontSize: 22, fontWeight: "800" },
});
