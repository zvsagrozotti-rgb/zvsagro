import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarTransferencias, criarTransferencia } from "../../logic/fin/transferencias";
import { listarContasSelecionaveis } from "../../logic/fin/contas";
import { fmtMoeda } from "../../logic/calc";
import { avisar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C, FCStyles as CS } from "../../logic/fin/finTheme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function dataBR(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

export default function FinTransferenciasScreen() {
  const [itens, setItens] = useState([]);
  const [contas, setContas] = useState([]);
  const [origem, setOrigem] = useState(null);
  const [destino, setDestino] = useState(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");
  const [pick, setPick] = useState(null); // "origem" | "destino"
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(() => {
    listarTransferencias().then(setItens);
    listarContasSelecionaveis().then(setContas);
  }, []);
  useFocusEffect(carregar);

  async function onCriar() {
    if (!origem || !destino) { avisar("Atenção", "Escolha a conta de origem e a de destino."); return; }
    if (!valor || parseFloat(valor.replace(",", ".")) <= 0) { avisar("Atenção", "Informe um valor válido."); return; }
    setBusy(true);
    try {
      await criarTransferencia({ conta_origem_id: origem.id, conta_destino_id: destino.id, valor: valor.replace(",", "."), data, descricao });
      setValor(""); setDescricao(""); setOrigem(null); setDestino(null);
      carregar();
    } catch (e) { avisar("Erro", e.message); }
    setBusy(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.h}>Nova transferência</Text>
        <Text style={s.label}>De</Text>
        <TouchableOpacity style={s.select} onPress={() => setPick("origem")}>
          <Text style={[s.selTxt, !origem && { color: "#9ca3af" }]}>{origem ? origem.nome : "Conta de origem"}</Text>
          <Text style={s.selChev}>▾</Text>
        </TouchableOpacity>
        <Text style={s.label}>Para</Text>
        <TouchableOpacity style={s.select} onPress={() => setPick("destino")}>
          <Text style={[s.selTxt, !destino && { color: "#9ca3af" }]}>{destino ? destino.nome : "Conta de destino"}</Text>
          <Text style={s.selChev}>▾</Text>
        </TouchableOpacity>
        <Text style={s.label}>Valor</Text>
        <TextInput style={s.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#9ca3af" />
        <Text style={s.label}>Data</Text>
        <TextInput style={s.input} value={data} onChangeText={setData} placeholderTextColor="#9ca3af" />
        <Text style={s.label}>Descrição</Text>
        <TextInput style={s.input} value={descricao} onChangeText={setDescricao} placeholder="Opcional" placeholderTextColor="#9ca3af" />
        <TouchableOpacity style={[s.salvar, busy && { opacity: 0.6 }]} onPress={onCriar} disabled={busy}>
          <Text style={s.salvarTxt}>{busy ? "Aguarde…" : "🔁 Transferir"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.h}>Histórico</Text>
      {itens.length === 0 ? <Text style={s.vazio}>Nenhuma transferência ainda.</Text> : (
        <View style={CS.tabela}>
          <View style={CS.tabelaHead}>
            <Text style={[CS.tabelaHeadTxt, { flex: 1 }]}>De → Para</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 70, textAlign: "right" }]}>Data</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 90, textAlign: "right" }]}>Valor</Text>
          </View>
          {itens.map((t) => (
            <View key={t.id} style={CS.tabelaRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.linhaL}>{t.origem_nome} → {t.destino_nome}</Text>
                {t.descricao ? <Text style={s.linhaSub}>{t.descricao}</Text> : null}
              </View>
              <Text style={s.linhaData}>{dataBR(t.data)}</Text>
              <Text style={[s.linhaV, { width: 90 }]}>{fmtMoeda(t.valor)}</Text>
            </View>
          ))}
        </View>
      )}

      <PickerModal theme={C} visible={pick === "origem"} titulo="Conta de origem"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setOrigem(it._o); setPick(null); }}
        onClose={() => setPick(null)} vazioMsg="Nenhuma conta cadastrada." />
      <PickerModal theme={C} visible={pick === "destino"} titulo="Conta de destino"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setDestino(it._o); setPick(null); }}
        onClose={() => setPick(null)} vazioMsg="Nenhuma conta cadastrada." />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 10, marginTop: 4 },
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 10, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  salvarTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
  vazio: { color: C.mut, fontSize: 13 },
  linhaL: { color: C.text, fontSize: 13, fontWeight: "700" },
  linhaSub: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  linhaData: { width: 70, color: "#9ca3af", fontSize: 11, textAlign: "right" },
  linhaV: { color: C.text, fontSize: 13, fontWeight: "800", textAlign: "right" },
});
