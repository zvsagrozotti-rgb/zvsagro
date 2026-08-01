import React, { useState, useMemo } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { filtrar, total } from "../logic/agrofit";
import { C } from "../theme";

export default function AgrofitBusca({ visible, onSelect, onClose }) {
  const [q, setQ] = useState("");

  const resultados = useMemo(() => {
    if (!visible || q.trim().length === 0) return [];
    return filtrar({ q, limite: 60 });
  }, [q, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.top}>
          <Text style={s.titulo}>🔎 Buscar no AGROFIT</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.fechar}>✕</Text></TouchableOpacity>
        </View>
        <Text style={s.sub}>Base oficial do MAPA · {total().toLocaleString("pt-BR")} produtos. Busque por nome, ingrediente, cultura ou praga. A dose você preenche pela bula.</Text>

        <TextInput style={s.input} value={q} onChangeText={setQ} autoFocus
          placeholder="Ex.: glifosato, soja, ferrugem…" placeholderTextColor="#5f7d69" />

        {q.trim().length === 0 ? (
          <Text style={s.dica}>Digite para buscar.</Text>
        ) : resultados.length === 0 ? (
          <Text style={s.dica}>Nenhum produto encontrado para "{q}".</Text>
        ) : (
          <FlatList
            data={resultados}
            keyExtractor={(item) => item.r}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} onPress={() => onSelect(item)}>
                <Text style={s.rNome}>{item.n}</Text>
                <Text style={s.rIng} numberOfLines={2}>{item.i}</Text>
                <View style={s.rTags}>
                  <Text style={s.tag}>{item.c || item.t}</Text>
                  {item.fc ? <Text style={[s.tag, s.tagForm]}>{item.fc}</Text> : null}
                  {item.cul && item.cul.length ? <Text style={[s.tag, s.tagCul]}>{item.cul.length} culturas</Text> : null}
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 44 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titulo: { color: C.text, fontSize: 18, fontWeight: "800" },
  fechar: { color: C.mut, fontSize: 22, paddingHorizontal: 8 },
  sub: { color: C.mut, fontSize: 12, marginTop: 4, marginBottom: 12, lineHeight: 17 },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 10, color: C.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  dica: { color: C.mut, fontSize: 13, textAlign: "center", marginTop: 24 },
  row: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rNome: { color: C.text, fontSize: 15, fontWeight: "700" },
  rIng: { color: C.mut, fontSize: 12, marginTop: 3, lineHeight: 16 },
  rTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { color: "#bff0cf", backgroundColor: "#1c4a30", fontSize: 10, fontWeight: "700", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  tagForm: { color: "#cfe0ff", backgroundColor: "#22406a" },
  tagCul: { color: "#f0e6bf", backgroundColor: "#4a3f16" },
});
