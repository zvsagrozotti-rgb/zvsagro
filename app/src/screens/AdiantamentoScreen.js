import React, { useState, useCallback, useLayoutEffect } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { carregarTudo, lancarAdiantamento, fecharCiclo } from "../logic/cupons";
import { resumoFuncionario } from "../logic/saldo";
import { fmtMoeda, num } from "../logic/fmt";
import { confirmar, avisar } from "../logic/confirm";
import { C } from "../theme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

// modo "adiantamento": lança uma receita para o funcionário.
// modo "fechar": o administrador dá a receita como paga e sobe o novo valor.
export default function AdiantamentoScreen({ route, navigation }) {
  const { funcionarioId, modo } = route.params;
  const fechar = modo === "fechar";
  const [func, setFunc] = useState(null);
  const [res, setRes] = useState(null);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");

  useFocusEffect(useCallback(() => {
    carregarTudo().then(({ funcionarios, cupons, creditos }) => {
      setFunc(funcionarios.find((f) => f.id === funcionarioId) || null);
      setRes(resumoFuncionario(funcionarioId, creditos, cupons));
    });
  }, [funcionarioId]));

  useLayoutEffect(() => { navigation.setOptions({ title: fechar ? "Fechar ciclo" : "Lançar adiantamento" }); }, [navigation, fechar]);

  async function onSalvar() {
    const v = num(valor);
    try {
      if (!fechar) {
        if (!(v > 0)) { avisar("Atenção", "Informe o valor do adiantamento."); return; }
        await lancarAdiantamento({ funcionarioId, valor: v, data, descricao });
        navigation.goBack();
        return;
      }
      const novo = isFinite(v) && v > 0 ? v : 0;
      const msg = "Dar o ciclo de " + (func ? func.nome : "este funcionário") + " como pago?\n\nAdiantado " + fmtMoeda(res.adiantado) +
        "\nGasto " + fmtMoeda(res.gasto) + "\nSaldo " + fmtMoeda(res.saldo) +
        (novo ? "\n\nUm novo adiantamento de " + fmtMoeda(novo) + " será lançado." : "\n\nNenhum novo adiantamento será lançado.");
      confirmar("Fechar ciclo", msg, async () => {
        try { await fecharCiclo(funcionarioId, { novoValor: novo, hoje: hoje() }); navigation.goBack(); }
        catch (e) { avisar("Erro", e.message || "Não foi possível fechar o ciclo."); }
      });
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  if (!res) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.func}>{func ? func.nome : ""}</Text>
      {fechar ? (
        <>
          <Text style={s.info}>Adiantado {fmtMoeda(res.adiantado)}  ·  Gasto {fmtMoeda(res.gasto)}</Text>
          <Text style={[s.saldo, { color: res.saldo < 0 ? C.red : C.greenClaro }]}>Saldo {fmtMoeda(res.saldo)}</Text>
          <Text style={s.help}>Ao fechar, os cupons e adiantamentos deste ciclo ficam guardados como pagos e o saldo recomeça do zero. Se quiser, já lance o novo adiantamento abaixo.</Text>
        </>
      ) : null}

      <Text style={s.label}>{fechar ? "Novo adiantamento (R$) - opcional" : "Valor (R$) *"}</Text>
      <TextInput style={s.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="Ex.: 1500,00" placeholderTextColor="#5f7d69" />

      {!fechar ? (
        <>
          <Text style={s.label}>Data</Text>
          <TextInput style={s.input} value={data} onChangeText={setData} placeholder="aaaa-mm-dd" placeholderTextColor="#5f7d69" />
          <Text style={s.label}>Descrição</Text>
          <TextInput style={s.input} value={descricao} onChangeText={setDescricao} placeholder="Ex.: Adiantamento de viagem" placeholderTextColor="#5f7d69" />
        </>
      ) : null}

      <TouchableOpacity style={s.salvar} onPress={onSalvar}>
        <Text style={s.salvarTxt}>{fechar ? "✅ Fechar ciclo" : "💾 Lançar"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  func: { color: C.text, fontSize: 18, fontWeight: "800" },
  info: { color: C.mut, fontSize: 13, marginTop: 8 },
  saldo: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  help: { color: C.mut, fontSize: 12, lineHeight: 18, marginTop: 10 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 16, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
