// Faixa fininha que aparece só quando tem coisa esperando pra sincronizar —
// avisa o usuário que gravou local e vai mandar pro servidor quando conseguir.
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { pendentes, assinarStatus } from "../logic/store";
import { C } from "../theme";

export default function SyncBadge() {
  const [qtd, setQtd] = useState(0);

  useEffect(() => {
    const atualizar = () => pendentes().then(setQtd);
    atualizar();
    const cancelar = assinarStatus(atualizar);
    const t = setInterval(atualizar, 5000);
    return () => { cancelar(); clearInterval(t); };
  }, []);

  if (qtd === 0) return null;

  return (
    <View style={s.wrap}>
      <Text style={s.txt}>⏳ {qtd} {qtd === 1 ? "alteração" : "alterações"} aguardando conexão pra sincronizar…</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: "#3a2e08", paddingVertical: 6, alignItems: "center" },
  txt: { color: "#ffd76b", fontSize: 11.5, fontWeight: "700" },
});
