import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { pagarFatura } from "../../logic/fin/cartoes";
import { listarDespesas } from "../../logic/fin/despesas";
import { listarContasSelecionaveis } from "../../logic/fin/contas";
import { fmtMoeda } from "../../logic/calc";
import { avisar, confirmar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function competenciaAtual() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1);
}

export default function FinFaturaScreen({ route, navigation }) {
  const cartao = route.params.cartao;
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [itens, setItens] = useState([]);
  const [conta, setConta] = useState(null);
  const [contas, setContas] = useState([]);
  const [pickConta, setPickConta] = useState(false);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(() => {
    listarDespesas({ cartao_id: cartao.id, status: "pendente" }).then((all) => {
      setItens(all.filter(d => String(d.data_vencimento || "").slice(0, 7) === competencia));
    });
    listarContasSelecionaveis().then((cs) => {
      setContas(cs);
      if (!conta && cartao.conta_id) { const c = cs.find(x => x.id === cartao.conta_id); if (c) setConta(c); }
    });
    // eslint-disable-next-line
  }, [competencia]);

  useFocusEffect(carregar);

  const total = itens.reduce((s, d) => s + parseFloat(d.valor), 0);

  async function onPagar() {
    if (!itens.length) { avisar("Fatura vazia", "Nenhuma despesa pendente nesta competência."); return; }
    confirmar("Pagar fatura", "Pagar " + fmtMoeda(total) + " (" + itens.length + " despesa(s))?", async () => {
      setBusy(true);
      try {
        await pagarFatura(cartao.id, { competencia, conta_id: conta?.id || null, data_baixa: hoje() });
        avisar("Fatura paga!", "", () => navigation.goBack());
      } catch (e) { avisar("Erro", e.message || "Não foi possível pagar a fatura."); }
      setBusy(false);
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.h1}>{cartao.nome}</Text>

      <Text style={s.label}>Competência (AAAA-MM)</Text>
      <TextInput style={s.input} value={competencia} onChangeText={setCompetencia} placeholder="2026-07" placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Conta pra debitar</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickConta(true)}>
        <Text style={[s.selTxt, !conta && { color: "#9ca3af" }]}>{conta ? conta.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.h}>Despesas desta fatura ({itens.length})</Text>
      {itens.length === 0 ? <Text style={s.vazio}>Nenhuma despesa pendente nesta competência.</Text> : itens.map((d) => (
        <View key={d.id} style={s.linha}>
          <Text style={s.linhaL} numberOfLines={1}>{d.descricao}</Text>
          <Text style={s.linhaV}>{fmtMoeda(d.valor)}</Text>
        </View>
      ))}

      <View style={s.totalBox}>
        <Text style={s.totalLbl}>Total da fatura</Text>
        <Text style={s.totalVal}>{fmtMoeda(total)}</Text>
      </View>

      <TouchableOpacity style={[s.pagar, busy && { opacity: 0.6 }]} onPress={onPagar} disabled={busy}>
        <Text style={s.pagarTxt}>{busy ? "Pagando…" : "💳 Pagar fatura"}</Text>
      </TouchableOpacity>

      <PickerModal theme={C} visible={pickConta} titulo="Escolher conta"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setConta(it._o); setPickConta(false); }}
        onClose={() => setPickConta(false)} vazioMsg="Nenhuma conta cadastrada." />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { color: C.text, fontSize: 18, fontWeight: "800", marginBottom: 10 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginTop: 16, marginBottom: 8 },
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  vazio: { color: C.mut, fontSize: 13 },
  linha: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 9, padding: 12, marginBottom: 8, gap: 10 },
  linhaL: { color: C.text, fontSize: 13, flex: 1 },
  linhaV: { color: C.text, fontSize: 13, fontWeight: "700" },
  totalBox: { marginTop: 10, borderTopColor: C.border, borderTopWidth: 1, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  totalLbl: { color: C.mut, fontSize: 13, fontWeight: "700" },
  totalVal: { color: C.text, fontSize: 18, fontWeight: "800" },
  pagar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  pagarTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
