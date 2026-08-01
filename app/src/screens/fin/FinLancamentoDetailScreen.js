import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarReceitas, baixarReceita, estornarReceita, cancelarReceita, excluirReceita } from "../../logic/fin/receitas";
import { listarDespesas, baixarDespesa, estornarDespesa, cancelarDespesa, excluirDespesa } from "../../logic/fin/despesas";
import { listarContasSelecionaveis } from "../../logic/fin/contas";
import { fmtMoeda } from "../../logic/fmt";
import { avisar, confirmar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

export default function FinLancamentoDetailScreen({ route, navigation }) {
  const { tipo, id } = route.params; // tipo: "receita" | "despesa"
  const [item, setItem] = useState(null);
  const [contas, setContas] = useState([]);
  const [pickConta, setPickConta] = useState(false);
  const [conta, setConta] = useState(null);
  const [dataBaixa, setDataBaixa] = useState(hoje());
  const [juros, setJuros] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(() => {
    const fn = tipo === "receita" ? listarReceitas : listarDespesas;
    fn({}).then((all) => setItem(all.find(x => x.id === id) || null));
    listarContasSelecionaveis().then(setContas);
  }, [tipo, id]);

  useFocusEffect(carregar);

  if (!item) return null;

  // Cor por status: pendente = amarelo, baixado = verde, atrasado = vermelho, cancelado = neutro.
  const atrasado = item.status === "pendente" && item.data_vencimento < hoje();
  const cor = item.status === "baixado" ? C.green
    : item.status === "cancelado" ? C.mut
    : atrasado ? C.red
    : C.amarelo;

  async function onBaixar() {
    setBusy(true);
    try {
      const fn = tipo === "receita" ? baixarReceita : baixarDespesa;
      await fn(item.id, { data_baixa: dataBaixa, juros, desconto, conta_id: conta?.id || null });
      carregar();
    } catch (e) { avisar("Erro", e.message); }
    setBusy(false);
  }

  function onEstornar() {
    confirmar("Estornar", "Voltar este lançamento para pendente?", async () => {
      const fn = tipo === "receita" ? estornarReceita : estornarDespesa;
      try { await fn(item.id); carregar(); } catch (e) { avisar("Erro", e.message); }
    });
  }

  function onCancelar() {
    confirmar("Cancelar lançamento", "Tem certeza?", async () => {
      const fn = tipo === "receita" ? cancelarReceita : cancelarDespesa;
      try { await fn(item.id); carregar(); } catch (e) { avisar("Erro", e.message); }
    });
  }

  function onExcluir() {
    confirmar("Excluir", "Remover este lançamento?", async () => {
      const fn = tipo === "receita" ? excluirReceita : excluirDespesa;
      try { await fn(item.id); navigation.goBack(); } catch (e) { avisar("Erro", e.message); }
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.desc}>{item.descricao}</Text>
      <Text style={[s.valor, { color: cor }]}>{fmtMoeda(item.status === "baixado" ? item.valor_baixa : item.valor)}</Text>

      <View style={s.card}>
        <Linha l="Status" v={item.status} />
        <Linha l="Vencimento" v={dataBR(item.data_vencimento)} />
        {item.categoria_nome ? <Linha l="Centro de custo" v={item.categoria_nome} /> : null}
        {item.cliente_nome ? <Linha l={tipo === "receita" ? "Cliente" : "Fornecedor"} v={item.cliente_nome} /> : null}
        {item.conta_nome ? <Linha l="Conta" v={item.conta_nome} /> : null}
        {item.parcela_atual ? <Linha l="Parcela" v={item.parcela_atual + "/" + item.total_parcelas} /> : null}
        {item.status === "baixado" ? <Linha l="Data da baixa" v={dataBR(item.data_baixa)} /> : null}
        {item.observacao ? <Linha l="Observação" v={item.observacao} /> : null}
      </View>

      {item.status === "pendente" ? (
        <View style={s.card}>
          <Text style={s.h}>Dar baixa</Text>
          <Text style={s.label}>Data da baixa</Text>
          <TextInput style={s.input} value={dataBaixa} onChangeText={setDataBaixa} placeholderTextColor="#9ca3af" />
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Juros</Text>
              <TextInput style={s.input} value={juros} onChangeText={setJuros} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Desconto</Text>
              <TextInput style={s.input} value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" placeholderTextColor="#9ca3af" />
            </View>
          </View>
          <Text style={s.label}>Conta</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickConta(true)}>
            <Text style={[s.selTxt, !conta && { color: "#9ca3af" }]}>{conta ? conta.nome : "Escolher conta"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.acao, { backgroundColor: C.green }, busy && { opacity: 0.6 }]} onPress={onBaixar} disabled={busy}>
            <Text style={s.acaoTxtEscuro}>{busy ? "Aguarde…" : "✔ Dar baixa"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {item.status === "baixado" ? (
        <TouchableOpacity style={[s.acao, { borderColor: C.blue, borderWidth: 1.5 }]} onPress={onEstornar}>
          <Text style={[s.acaoTxt, { color: C.blue }]}>↩ Estornar</Text>
        </TouchableOpacity>
      ) : null}

      {item.status !== "cancelado" ? (
        <TouchableOpacity style={[s.acao, { borderColor: C.amarelo, borderWidth: 1.5 }]} onPress={onCancelar}>
          <Text style={[s.acaoTxt, { color: C.amarelo }]}>✕ Cancelar</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity>

      <PickerModal theme={C} visible={pickConta} titulo="Escolher conta"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setConta(it._o); setPickConta(false); }}
        onClose={() => setPickConta(false)} vazioMsg="Nenhuma conta cadastrada." />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Linha({ l, v }) {
  return (<View style={s.linha}><Text style={s.linhaL}>{l}</Text><Text style={s.linhaV}>{v}</Text></View>);
}

const s = StyleSheet.create({
  desc: { color: C.text, fontSize: 18, fontWeight: "800" },
  valor: { fontSize: 26, fontWeight: "800", marginTop: 6, marginBottom: 14 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, gap: 12 },
  linhaL: { color: C.mut, fontSize: 12 },
  linhaV: { color: C.text, fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right", textTransform: "capitalize" },
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 10, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  row2: { flexDirection: "row", gap: 10 },
  select: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  acao: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  acaoTxt: { fontSize: 14, fontWeight: "800" },
  acaoTxtEscuro: { color: "#fff", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: C.redBg, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
