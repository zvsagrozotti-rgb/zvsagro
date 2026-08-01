import React from "react";
import { Text } from "react-native";
import { C } from "../theme";

// Nome do app estilizado: "Aegro" em verde + "Fin" em amarelo, negrito
// itálico com sombra (mesmo tratamento de letreiro usado no AgroBrasil).
// (Diferente do nome customizável da empresa do cliente, que é outra coisa.)
const marcaBase = {
  fontWeight: "800",
  fontStyle: "italic",
  textShadow: "2px 3px 2px rgba(10,40,20,0.55)",
};

export default function MarcaAegroFin({ style }) {
  return (
    <Text style={style}>
      <Text style={[marcaBase, { color: C.green }]}>Aegro</Text>
      <Text style={[marcaBase, { color: C.amarelo }]}>Fin</Text>
    </Text>
  );
}
