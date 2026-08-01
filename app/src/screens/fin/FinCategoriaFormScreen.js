import React, { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { criarCategoria, editarCategoria, excluirCategoria } from "../../logic/fin/categorias";
import { avisar, confirmar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

const CORES = ["#6B7280", "#1565C0", "#2E7D32", "#C62828", "#EF6C00", "#6A1B9A", "#00695C", "#AD1457"];

export default function FinCategoriaFormScreen({ route, navigation }) {
  const item = route.params?.item || null;
  const [nome, setNome] = useState(item?.nome || "");
  const [tipo, setTipo] = useState(item?.tipo || "despesa");
  const [cor, setCor] = useState(item?.cor || CORES[0]);
  const [pickTipo, setPickTipo] = useState(false);

  async function onSalvar() {
    if (!nome.trim()) { avisar("Atenção", "Informe o nome do centro de custo."); return; }
    try {
      if (item) await editarCategoria(item.id, { nome, cor });
      else await criarCategoria({ nome, tipo, cor });
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir centro de custo", "Remover este centro de custo?", async () => {
      await excluirCategoria(item.id);
      navigation.goBack();
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Nome *</Text>
      <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex.: Combustível, Serviços…" placeholderTextColor="#9ca3af" />

      {!item ? (
        <>
          <Text style={s.label}>Tipo</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickTipo(true)}>
            <Text style={s.selTxt}>{tipo}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={s.label}>Cor</Text>
      <View style={s.cores}>
        {CORES.map((c) => (
          <TouchableOpacity key={c} onPress={() => setCor(c)} style={[s.corBola, { backgroundColor: c }, cor === c && s.corSel]} />
        ))}
      </View>

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}

      <PickerModal theme={C} visible={pickTipo} titulo="Tipo"
        itens={[{ id: "receita", label: "receita" }, { id: "despesa", label: "despesa" }]}
        onSelect={(it) => { setTipo(it.label); setPickTipo(false); }}
        onClose={() => setPickTipo(false)} />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1, textTransform: "capitalize" },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  cores: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  corBola: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "transparent" },
  corSel: { borderColor: C.text },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  salvarTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: C.redBg, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
