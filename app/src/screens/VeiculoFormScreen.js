import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { salvar, remover } from "../logic/store";
import { listarAbastecimentos } from "../logic/frota/abastecimentos";
import { TIPOS_COMBUSTIVEL } from "../logic/entidades";
import { confirmar, avisar } from "../logic/confirm";
import { fmt, num } from "../logic/fmt";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

export default function VeiculoFormScreen({ route, navigation }) {
  const item = route.params?.item || null;
  const [apelido, setApelido] = useState(item?.apelido || "");
  const [placa, setPlaca] = useState(item?.placa || "");
  const [modelo, setModelo] = useState(item?.modelo || "");
  const [tipoCombustivel, setTipoCombustivel] = useState(item?.tipoCombustivel || "");
  const [odometroInicial, setOdometroInicial] = useState(item ? String(item.odometroInicial ?? "") : "");
  const [odometroAtual, setOdometroAtual] = useState(null);
  const [pickTipo, setPickTipo] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: item ? "Editar veículo" : "Novo veículo" });
  }, [navigation, item]);

  // Odômetro atual = maior leitura entre os abastecimentos, ou o inicial se
  // ainda não tem nenhum — só serve pra exibir, o valor de verdade vem de lá.
  useEffect(() => {
    if (!item) return;
    listarAbastecimentos(item.id).then((abs) => {
      const maiores = abs.map((a) => num(a.odometro)).filter((n) => isFinite(n));
      const maiorAbastecimento = maiores.length ? Math.max(...maiores) : null;
      const inicial = num(item.odometroInicial);
      setOdometroAtual(Math.max(maiorAbastecimento || 0, isFinite(inicial) ? inicial : 0));
    });
  }, [item]);

  async function onSalvar() {
    if (!apelido.trim()) { avisar("Atenção", "Informe o apelido/nome do veículo."); return; }
    try {
      await salvar("veiculos", {
        ...(item || {}),
        apelido, placa, modelo, tipoCombustivel,
        odometroInicial: item ? item.odometroInicial : odometroInicial.replace(",", "."),
      });
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir veículo", "Remover este veículo? O histórico de abastecimentos dele não será apagado, mas ficará órfão.", async () => {
      await remover("veiculos", item.id);
      navigation.navigate("Frota");
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Apelido / Nome *</Text>
      <TextInput style={s.input} value={apelido} onChangeText={setApelido} placeholder="Ex.: Strada Vinícius" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Placa</Text>
      <TextInput style={s.input} value={placa} onChangeText={setPlaca} placeholder="Placa" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Modelo</Text>
      <TextInput style={s.input} value={modelo} onChangeText={setModelo} placeholder="Modelo" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Tipo de combustível</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickTipo(true)}>
        <Text style={[s.selTxt, !tipoCombustivel && { color: "#5f7d69" }]}>{tipoCombustivel || "Toque para escolher"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      {!item ? (
        <>
          <Text style={s.label}>Odômetro inicial (km)</Text>
          <TextInput style={s.input} value={odometroInicial} onChangeText={setOdometroInicial} keyboardType="decimal-pad" placeholder="Ex.: 0" placeholderTextColor="#5f7d69" />
        </>
      ) : (
        <View style={s.odomBox}>
          <Text style={s.odomLabel}>Odômetro atual</Text>
          <Text style={s.odomValor}>{odometroAtual != null ? fmt(odometroAtual, 0) + " km" : "…"}</Text>
          <Text style={s.odomSub}>Calculado a partir do último abastecimento registrado. Não pode ser alterado na mão — para corrigir, ajuste ou registre um abastecimento.</Text>
        </View>
      )}

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}

      <PickerModal
        visible={pickTipo}
        titulo="Tipo de combustível"
        itens={TIPOS_COMBUSTIVEL.map((o) => ({ id: o, label: o }))}
        onSelect={(it) => { setTipoCombustivel(it.label); setPickTipo(false); }}
        onClose={() => setPickTipo(false)}
      />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 14, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  odomBox: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 18 },
  odomLabel: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  odomValor: { color: C.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  odomSub: { color: C.mut, fontSize: 11, marginTop: 8, lineHeight: 16 },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: "#3a1f28", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
