import React from "react";
import { View, Text } from "react-native";
import { FCStyles as CS } from "../../logic/fin/finTheme";

export default function VazioEstado({ icone, titulo, sub }) {
  return (
    <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
      <Text style={CS.vazioIcone}>{icone}</Text>
      <Text style={CS.vazioTitulo}>{titulo}</Text>
      {sub ? <Text style={CS.vazioSub}>{sub}</Text> : null}
    </View>
  );
}
