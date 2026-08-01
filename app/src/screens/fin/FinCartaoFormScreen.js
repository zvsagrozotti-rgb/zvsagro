import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { criarCartao, editarCartao, excluirCartao } from "../../logic/fin/cartoes";
import { listarContasSelecionaveis } from "../../logic/fin/contas";
import { avisar, confirmar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

export default function FinCartaoFormScreen({ route, navigation }) {
  const item = route.params?.item || null;
  const [nome, setNome] = useState(item?.nome || "");
  const [bandeira, setBandeira] = useState(item?.bandeira || "");
  const [limite, setLimite] = useState(item ? String(item.limite) : "0");
  const [diaFechamento, setDiaFechamento] = useState(item ? String(item.dia_fechamento) : "1");
  const [diaVencimento, setDiaVencimento] = useState(item ? String(item.dia_vencimento) : "10");
  const [conta, setConta] = useState(null);
  const [contas, setContas] = useState([]);
  const [pickConta, setPickConta] = useState(false);

  useFocusEffect(useCallback(() => {
    listarContasSelecionaveis().then((cs) => {
      setContas(cs);
      if (item?.conta_id) { const c = cs.find(x => x.id === item.conta_id); if (c) setConta(c); }
    });
  }, []));

  async function onSalvar() {
    if (!nome.trim()) { avisar("Atenção", "Informe o nome do cartão."); return; }
    const dados = { nome, bandeira, limite, dia_fechamento: diaFechamento, dia_vencimento: diaVencimento, conta_id: conta?.id || null };
    try {
      if (item) await editarCartao(item.id, dados);
      else await criarCartao(dados);
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir cartão", "Remover este cartão?", async () => { await excluirCartao(item.id); navigation.goBack(); });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Nome *</Text>
      <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex.: Nubank" placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Bandeira</Text>
      <TextInput style={s.input} value={bandeira} onChangeText={setBandeira} placeholder="Visa, Master…" placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Limite</Text>
      <TextInput style={s.input} value={limite} onChangeText={setLimite} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Dia fechamento</Text>
          <TextInput style={s.input} value={diaFechamento} onChangeText={setDiaFechamento} keyboardType="number-pad" placeholderTextColor="#9ca3af" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Dia vencimento</Text>
          <TextInput style={s.input} value={diaVencimento} onChangeText={setDiaVencimento} keyboardType="number-pad" placeholderTextColor="#9ca3af" />
        </View>
      </View>

      <Text style={s.label}>Conta pra debitar a fatura</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickConta(true)}>
        <Text style={[s.selTxt, !conta && { color: "#9ca3af" }]}>{conta ? conta.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}

      <PickerModal theme={C} visible={pickConta} titulo="Escolher conta"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setConta(it._o); setPickConta(false); }}
        onClose={() => setPickConta(false)} vazioMsg="Nenhuma conta cadastrada." />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  row2: { flexDirection: "row", gap: 10 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  salvarTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: C.redBg, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
