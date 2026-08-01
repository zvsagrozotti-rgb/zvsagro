import React from "react";
import { Text } from "react-native";
import { C } from "../theme";

// Nome do app estilizado: "VZS" em branco + "Agro" em verde, negrito
// itálico com sombra (mesmo tratamento de letreiro usado nos outros apps,
// seguindo as cores da logo real: "VZS" branco/prata + "Agro" verde).
const marcaBase = {
  fontWeight: "800",
  fontStyle: "italic",
  textShadow: "2px 3px 2px rgba(10,40,20,0.55)",
};

export default function MarcaVZSAgro({ style }) {
  return (
    <Text style={style}>
      <Text style={[marcaBase, { color: C.text }]}>VZS</Text>
      <Text style={[marcaBase, { color: C.green }]}> Agro</Text>
    </Text>
  );
}
