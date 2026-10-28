import React from "react";
import { Text } from "react-native";
import { C } from "../theme";

// Nome do app estilizado: "Frota" em branco + "Fácil" em verde.
const marcaBase = {
  fontWeight: "800",
  fontStyle: "italic",
  textShadow: "2px 3px 2px rgba(10,40,20,0.55)",
};

export default function MarcaFrotaFacil({ style }) {
  return (
    <Text style={style}>
      <Text style={[marcaBase, { color: C.text }]}>Frota</Text>
      <Text style={[marcaBase, { color: C.green }]}>Fácil</Text>
    </Text>
  );
}
