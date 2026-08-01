import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { criarReceita } from "../../logic/fin/receitas";
import { criarDespesa } from "../../logic/fin/despesas";
import { listarContasSelecionaveis } from "../../logic/fin/contas";
import { listarCategorias } from "../../logic/fin/categorias";
import { listarCartoes } from "../../logic/fin/cartoes";
import { listar as listarAgro } from "../../logic/store";
import { avisar } from "../../logic/confirm";
import PickerModal from "../../components/PickerModal";
import { FC as C } from "../../logic/fin/finTheme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export default function FinLancamentoFormScreen({ route, navigation }) {
  const tipo = route.params.tipo; // "receita" | "despesa"
  const titulo = tipo === "receita" ? "receita" : "despesa";

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVenc, setDataVenc] = useState(hoje());
  const [observacao, setObservacao] = useState("");
  const [parcelas, setParcelas] = useState("1");

  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conta, setConta] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [cartao, setCartao] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [pick, setPick] = useState(null); // "conta" | "categoria" | "cartao" | "cliente"
  const [busy, setBusy] = useState(false);

  // Em receita mostra quem paga (Cliente); em despesa mostra quem recebe (Fornecedor) —
  // mesmo cadastro (Pessoas), filtrado pela flag "tipo" de cada um.
  // Cadastro sem a flag definida (registro antigo) aparece nos dois, pra não sumir da lista.
  const labelParceiro = tipo === "receita" ? "Cliente" : "Fornecedor";
  const tipoParceiro = tipo === "receita" ? "Cliente" : "Fornecedor";

  useFocusEffect(useCallback(() => {
    listarContasSelecionaveis().then(setContas);
    listarCategorias().then((cs) => setCategorias(cs.filter(c => c.tipo === tipo)));
    if (tipo === "despesa") listarCartoes().then(setCartoes);
    listarAgro("clientes").then((cs) => setClientes(cs.filter(c => !c.tipo || c.tipo === tipoParceiro || c.tipo === "Ambos")));
    // eslint-disable-next-line
  }, [tipo]));

  async function onSalvar() {
    if (!descricao.trim()) { avisar("Atenção", "Informe a descrição."); return; }
    if (!valor || parseFloat(valor.replace(",", ".")) <= 0) { avisar("Atenção", "Informe um valor válido."); return; }
    setBusy(true);
    const dados = {
      descricao, valor: valor.replace(",", "."), data_vencimento: dataVenc,
      categoria_id: categoria?.id || null, conta_id: conta?.id || null,
      cliente_id: cliente?.id || null,
      observacao, parcelas,
    };
    try {
      if (tipo === "receita") await criarReceita(dados);
      else await criarDespesa({ ...dados, cartao_id: cartao?.id || null });
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
    setBusy(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Descrição *</Text>
      <TextInput style={s.input} value={descricao} onChangeText={setDescricao} placeholder={"Ex.: " + (tipo === "receita" ? "Serviço de pulverização" : "Combustível")} placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Valor *</Text>
      <TextInput style={s.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Vencimento (AAAA-MM-DD)</Text>
      <TextInput style={s.input} value={dataVenc} onChangeText={setDataVenc} placeholderTextColor="#9ca3af" />

      <Text style={s.label}>{labelParceiro}</Text>
      <TouchableOpacity style={s.select} onPress={() => setPick("cliente")}>
        <Text style={[s.selTxt, !cliente && { color: "#9ca3af" }]}>{cliente ? cliente.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Centro de custo</Text>
      <TouchableOpacity style={s.select} onPress={() => setPick("categoria")}>
        <Text style={[s.selTxt, !categoria && { color: "#9ca3af" }]}>{categoria ? categoria.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      {tipo === "despesa" ? (
        <>
          <Text style={s.label}>Cartão de crédito</Text>
          <TouchableOpacity style={s.select} onPress={() => setPick("cartao")}>
            <Text style={[s.selTxt, !cartao && { color: "#9ca3af" }]}>{cartao ? cartao.nome : "Nenhum (débito direto)"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {!cartao ? (
        <>
          <Text style={s.label}>Conta</Text>
          <TouchableOpacity style={s.select} onPress={() => setPick("conta")}>
            <Text style={[s.selTxt, !conta && { color: "#9ca3af" }]}>{conta ? conta.nome : "Opcional (define ao baixar)"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={s.label}>Parcelas</Text>
      <TextInput style={s.input} value={parcelas} onChangeText={setParcelas} keyboardType="number-pad" placeholderTextColor="#9ca3af" />

      <Text style={s.label}>Observação</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} multiline value={observacao} onChangeText={setObservacao} placeholderTextColor="#9ca3af" />

      <TouchableOpacity style={[s.salvar, busy && { opacity: 0.6 }]} onPress={onSalvar} disabled={busy}>
        <Text style={s.salvarTxt}>{busy ? "Salvando…" : "💾 Salvar " + titulo}</Text>
      </TouchableOpacity>

      <PickerModal theme={C} visible={pick === "conta"} titulo="Escolher conta"
        itens={contas.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setConta(it._o); setPick(null); }}
        onClose={() => setPick(null)} vazioMsg="Nenhuma conta cadastrada." />
      <PickerModal theme={C} visible={pick === "categoria"} titulo="Escolher centro de custo"
        itens={categorias.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setCategoria(it._o); setPick(null); }}
        onClose={() => setPick(null)} vazioMsg="Nenhum centro de custo cadastrado." />
      <PickerModal theme={C} visible={pick === "cartao"} titulo="Escolher cartão"
        itens={cartoes.map(c => ({ id: c.id, label: c.nome, _o: c }))}
        onSelect={(it) => { setCartao(it._o); setPick(null); }}
        onClose={() => setPick(null)} vazioMsg="Nenhum cartão cadastrado." />
      <PickerModal theme={C} visible={pick === "cliente"} titulo={"Escolher " + labelParceiro.toLowerCase()}
        itens={clientes.map(c => ({ id: c.id, label: c.nome, sub: c.cidade || "", _o: c }))}
        onSelect={(it) => { setCliente(it._o); setPick(null); }}
        onClose={() => setPick(null)}
        vazioMsg={"Nenhum " + labelParceiro.toLowerCase() + " cadastrado em Pessoas."} />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#374151", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  salvarTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
