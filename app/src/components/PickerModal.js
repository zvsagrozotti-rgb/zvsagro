import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, Pressable, StyleSheet, Dimensions } from "react-native";
import { C as CEscuro } from "../theme";

// Seletor genérico em modal. itens: [{id, label, sub?}]. onSelect(item).
// theme: opcional — passe o tema claro do Financeiro (FC) nas telas de fin/,
// senão usa o tema escuro padrão do resto do app.
// acaoExtra: opcional, { label, onPress } — botão extra acima do "Fechar"
// (ex.: "+ Cadastrar novo produto" quando o item procurado não existe ainda).
export default function PickerModal({ visible, titulo, itens, onSelect, onClose, vazioMsg, theme, acaoExtra }) {
  const C = theme || CEscuro;
  const maxLista = Math.round(Dimensions.get("window").height * 0.72);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => {}}>
          <Text style={[s.titulo, { color: C.text }]}>{titulo}</Text>
          <ScrollView style={{ maxHeight: maxLista }} keyboardShouldPersistTaps="handled">
            {(!itens || itens.length === 0) && <Text style={[s.vazio, { color: C.mut }]}>{vazioMsg || "Nada cadastrado."}</Text>}
            {(itens || []).map((item, idx) => (
              <TouchableOpacity key={item.id || String(idx)} style={[s.row, { borderBottomColor: C.border }]} onPress={() => onSelect(item)}>
                <Text style={[s.rowTxt, { color: C.text }]}>{item.label}</Text>
                {item.sub ? <Text style={[s.rowSub, { color: C.mut }]}>{item.sub}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {acaoExtra ? (
            <TouchableOpacity style={[s.extra, { borderColor: C.green || "#7cd992" }]} onPress={acaoExtra.onPress}>
              <Text style={[s.extraTxt, { color: C.green || "#7cd992" }]}>{acaoExtra.label}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[s.cancel, { backgroundColor: C.bg }]} onPress={onClose}><Text style={[s.cancelTxt, { color: C.mut }]}>Fechar</Text></TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000000cc", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { borderRadius: 14, borderWidth: 1, padding: 16, maxHeight: "88%", width: "100%", maxWidth: 640 },
  titulo: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  row: { paddingVertical: 12, borderBottomWidth: 1 },
  rowTxt: { fontSize: 15, fontWeight: "600", flexShrink: 1, flexWrap: "wrap" },
  rowSub: { fontSize: 12, marginTop: 2, flexShrink: 1, flexWrap: "wrap" },
  vazio: { textAlign: "center", paddingVertical: 20 },
  extra: { marginTop: 12, paddingVertical: 11, alignItems: "center", borderRadius: 9, borderWidth: 1.5 },
  extraTxt: { fontWeight: "800" },
  cancel: { marginTop: 8, paddingVertical: 11, alignItems: "center", borderRadius: 9 },
  cancelTxt: { fontWeight: "700" },
});
