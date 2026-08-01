import React, { useState, useLayoutEffect } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { salvarAbastecimento, removerAbastecimento } from "../logic/frota/abastecimentos";
import { confirmar, avisar } from "../logic/confirm";
import { C } from "../theme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export default function AbastecimentoFormScreen({ route, navigation }) {
  const { veiculoId, item } = route.params;
  const [data, setData] = useState(item?.data || hoje());
  const [odometro, setOdometro] = useState(item ? String(item.odometro ?? "") : "");
  const [volume, setVolume] = useState(item ? String(item.volume ?? "") : "");
  const [precoLitro, setPrecoLitro] = useState(item ? String(item.precoLitro ?? "") : "");
  const [completou, setCompletou] = useState(item ? !!item.completou : true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: item ? "Editar abastecimento" : "Novo abastecimento" });
  }, [navigation]);

  async function onSalvar() {
    if (!odometro.trim()) { avisar("Atenção", "Informe o odômetro."); return; }
    if (!volume.trim()) { avisar("Atenção", "Informe o volume abastecido."); return; }
    try {
      await salvarAbastecimento(veiculoId, {
        ...(item || {}),
        data, odometro: odometro.replace(",", "."), volume: volume.replace(",", "."),
        precoLitro: precoLitro.replace(",", "."), completou,
      });
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir", "Remover este abastecimento?", async () => {
      await removerAbastecimento(item.id);
      navigation.goBack();
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Data</Text>
      <TextInput style={s.input} value={data} onChangeText={setData} placeholder="aaaa-mm-dd" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Odômetro (km) *</Text>
      <TextInput style={s.input} value={odometro} onChangeText={setOdometro} keyboardType="decimal-pad" placeholder="Ex.: 12345" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Volume abastecido (L) *</Text>
      <TextInput style={s.input} value={volume} onChangeText={setVolume} keyboardType="decimal-pad" placeholder="Ex.: 40.5" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Preço do litro (R$)</Text>
      <TextInput style={s.input} value={precoLitro} onChangeText={setPrecoLitro} keyboardType="decimal-pad" placeholder="Ex.: 5.79" placeholderTextColor="#5f7d69" />

      <TouchableOpacity style={s.toggle} onPress={() => setCompletou((v) => !v)}>
        <Text style={s.toggleTxt}>{completou ? "☑" : "☐"} Completou o tanque?</Text>
        <Text style={s.toggleSub}>Só um abastecimento que completa o tanque fecha o cálculo de consumo. Abastecimentos parciais entram na conta, mas não fecham sozinhos.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 14, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  toggle: { backgroundColor: C.card, borderColor: C.green, borderWidth: 1.5, borderRadius: 10, padding: 14, marginTop: 18 },
  toggleTxt: { color: C.text, fontSize: 15, fontWeight: "800" },
  toggleSub: { color: C.mut, fontSize: 11, marginTop: 6, lineHeight: 16 },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: "#3a1f28", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
