import React, { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { criarConta, editarConta, excluirConta } from "../../logic/fin/contas";
import { avisar, confirmar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

const TIPOS = ["corrente", "poupança", "caixa", "investimento", "outro"];

export default function FinContaFormScreen({ route, navigation }) {
  const item = route.params?.item || null;
  const sistema = !!item?.sistema;
  const [nome, setNome] = useState(item?.nome || "");
  const [tipo, setTipo] = useState(item?.tipo || "corrente");
  const [banco, setBanco] = useState(item?.banco || "");
  const [saldoInicial, setSaldoInicial] = useState(item ? String(item.saldo_inicial) : "0");
  const [pickTipo, setPickTipo] = useState(false);

  async function onSalvar() {
    if (!nome.trim()) { avisar("Atenção", "Informe o nome da conta."); return; }
    try {
      if (item) await editarConta(item.id, { nome: sistema ? item.nome : nome, tipo, banco });
      else await criarConta({ nome, tipo, banco, saldo_inicial: saldoInicial });
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir conta", "Remover esta conta?", async () => {
      try { await excluirConta(item.id); navigation.goBack(); }
      catch (e) { avisar("Não foi possível excluir", e.message); }
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {sistema ? (
        <Text style={s.avisoSistema}>🔒 Conta controlada automaticamente pelo módulo de Estoque — credita/debita sozinha a cada compra/venda de produto. Nome e saldo não podem ser alterados na mão.</Text>
      ) : null}

      <Text style={s.label}>Nome *</Text>
      <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex.: Conta Principal" placeholderTextColor="#9ca3af" editable={!sistema} />

      <Text style={s.label}>Tipo</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickTipo(true)}>
        <Text style={s.selTxt}>{tipo}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Banco</Text>
      <TextInput style={s.input} value={banco} onChangeText={setBanco} placeholder="Opcional" placeholderTextColor="#9ca3af" />

      {!item ? (
        <>
          <Text style={s.label}>Saldo inicial</Text>
          <TextInput style={s.input} value={saldoInicial} onChangeText={setSaldoInicial} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
        </>
      ) : null}

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item && !sistema ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}

      <PickerModal theme={C} visible={pickTipo} titulo="Tipo de conta"
        itens={TIPOS.map(t => ({ id: t, label: t }))}
        onSelect={(it) => { setTipo(it.label); setPickTipo(false); }}
        onClose={() => setPickTipo(false)} />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  avisoSistema: { color: "#92400e", backgroundColor: "#fef3c7", borderColor: "#fde68a", borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 12, fontWeight: "600", marginBottom: 14, lineHeight: 17 },
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1, textTransform: "capitalize" },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  salvarTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: C.redBg, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
