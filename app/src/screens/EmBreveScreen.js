import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { C } from "../theme";

export default function EmBreveScreen({ route, navigation }) {
  const titulo = route.params?.titulo || "Em breve";
  useLayoutEffect(() => { navigation.setOptions({ title: titulo }); }, [navigation, titulo]);
  return (
    <View style={s.wrap}>
      <Text style={s.ico}>🚧</Text>
      <Text style={s.t}>{titulo}</Text>
      <Text style={s.s}>Este módulo está em construção.{"\n"}Em breve!</Text>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", padding: 30 },
  ico: { fontSize: 50, marginBottom: 14 },
  t: { color: C.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  s: { color: C.mut, fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
