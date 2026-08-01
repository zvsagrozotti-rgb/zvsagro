import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, salvar } from "../logic/store";
import { fmt, num } from "../logic/calc";
import { confirmar, avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

export default function SalvarTalhaoScreen({ route, navigation }) {
  const { area = 0, coords = [] } = route.params || {};
  const [nome, setNome] = useState("");
  const [cultura, setCultura] = useState("");
  const [fazendas, setFazendas] = useState([]);
  const [fazenda, setFazenda] = useState(null);
  const [pickFaz, setPickFaz] = useState(false);

  useFocusEffect(useCallback(() => { listar("fazendas").then(setFazendas); }, []));

  async function onSalvar() {
    if (!nome.trim()) { avisar("Atenção", "Dê um nome ao talhão."); return; }
    if (!fazenda) { avisar("Atenção", "Escolha a fazenda para vincular."); return; }
    const ha = Number((area || 0).toFixed(2));
    const saved = await salvar("talhoes", {
      nome: nome.trim(),
      fazenda: fazenda.nome, fazendaId: fazenda.id,
      cliente: fazenda.cliente || null, clienteId: fazenda.clienteId || null,
      cultura: cultura.trim(),
      area: ha, coords,
      em: new Date().toISOString(),
    });
    confirmar("Talhão salvo!", "\"" + nome.trim() + "\" — " + ha + " ha" + (fazenda.cliente ? " · cliente " + fazenda.cliente : "") + ".\n\nCriar a aplicação deste talhão agora?",
      () => navigation.reset({ index: 1, routes: [{ name: "Home" }, { name: "Calculadora", params: { talhao: saved } }] }),
      () => navigation.reset({ index: 1, routes: [{ name: "Home" }, { name: "CrudList", params: { entidade: "talhoes" } }] }));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={s.kpi}>
        <Text style={s.kpiN}>{fmt(area, 2)} ha</Text>
        <Text style={s.kpiL}>área desenhada · {coords.length} pontos</Text>
      </View>

      <Text style={s.label}>Nome do talhão *</Text>
      <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex.: Talhão 1 / Sede" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Cultura</Text>
      <TextInput style={s.input} value={cultura} onChangeText={setCultura} placeholder="Ex.: Soja, Milho, Algodão…" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Fazenda *</Text>
      <TouchableOpacity style={s.sel} onPress={() => setPickFaz(true)}>
        <Text style={[s.selTxt, !fazenda && { color: "#5f7d69" }]}>{fazenda ? fazenda.nome : "Escolher fazenda"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>
      {fazenda && fazenda.cliente ? <Text style={s.vinc}>🔗 Cliente vinculado: {fazenda.cliente}</Text> : null}

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar talhão</Text></TouchableOpacity>
      <View style={{ height: 30 }} />

      <PickerModal visible={pickFaz} titulo="Escolher fazenda"
        itens={fazendas.map(f => ({ id: f.id, label: f.nome, sub: [f.cliente, f.cultura].filter(Boolean).join(" · "), _o: f }))}
        onSelect={(it) => { setFazenda(it._o); setPickFaz(false); }}
        onClose={() => setPickFaz(false)}
        vazioMsg="Nenhuma fazenda. Cadastre em Cadastros › Fazendas (já com o cliente)." />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  kpi: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 18, alignItems: "center" },
  kpiN: { color: C.green, fontSize: 28, fontWeight: "800" },
  kpiL: { color: C.mut, fontSize: 12, marginTop: 4 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 6, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginBottom: 8 },
  sel: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  vinc: { color: "#8fe6b0", fontSize: 12, marginTop: 8 },
  salvar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  salvarTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
});
