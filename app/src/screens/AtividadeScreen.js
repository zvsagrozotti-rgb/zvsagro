import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarHistorico } from "../logic/historicoOnline";
import { C } from "../theme";

const ICONE_ACAO = { criado: "🟢", editado: "✏️", removido: "🗑️" };

function tempoRelativo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return "há " + min + " min";
  const h = Math.floor(min / 60);
  if (h < 24) return "há " + h + "h";
  const d = Math.floor(h / 24);
  return "há " + d + "d";
}

export default function AtividadeScreen() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    listarHistorico(80).then((r) => { setItens(r); setCarregando(false); });
  }, []);
  useFocusEffect(carregar);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={itens}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={s.vazio}>{carregando ? "Carregando…" : "Nenhuma atividade registrada ainda."}</Text>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.icone}>{ICONE_ACAO[item.acao] || "•"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.desc}>{item.descricao}</Text>
              <Text style={s.quando}>{tempoRelativo(item.criado_em)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  icone: { fontSize: 16, marginTop: 1 },
  desc: { color: C.text, fontSize: 13.5, fontWeight: "600", lineHeight: 19 },
  quando: { color: C.mut, fontSize: 11, marginTop: 3 },
});
