import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import { criarEntrada } from "../logic/estoque/movimentacoes";
import { avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

// Compra = entrada de estoque vinculada a um Fornecedor. Credita a conta
// "Estoque" na hora, pelo custo informado. Em paralelo, gera uma despesa
// pendente em Contas a Pagar; o dinheiro só sai de verdade de uma conta
// quando você dá baixa nela, em Financeiro — a baixa não mexe mais na conta
// Estoque, ela já foi creditada aqui.
export default function CompraFormScreen({ navigation }) {
  const [produtos, setProdutos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);

  const [produtoId, setProdutoId] = useState(null);
  const [produtoNome, setProdutoNome] = useState("");
  const [localId, setLocalId] = useState(null);
  const [localNome, setLocalNome] = useState("");
  const [fornecedorId, setFornecedorId] = useState(null);
  const [fornecedorNome, setFornecedorNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [observacao, setObservacao] = useState("");

  const [pickerAberto, setPickerAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(useCallback(() => {
    listarAgro("produtos").then(setProdutos);
    listarAgro("locais").then(setLocais);
    listarAgro("clientes").then((cs) => setFornecedores(cs.filter((c) => !c.tipo || c.tipo === "Fornecedor" || c.tipo === "Ambos")));
  }, []));

  function irParaCadastroDeProduto() {
    setPickerAberto(null);
    navigation.navigate("CrudForm", {
      entidade: "produtos",
      aoSalvar: (novo) => { setProdutoId(novo.id); setProdutoNome(novo.nome); },
    });
  }

  function irParaCadastroDeFornecedor() {
    setPickerAberto(null);
    navigation.navigate("CrudForm", {
      entidade: "clientes",
      aoSalvar: (novo) => { setFornecedorId(novo.id); setFornecedorNome(novo.nome); },
    });
  }

  async function onSalvar() {
    setSalvando(true);
    try {
      const r = await criarEntrada({
        produtoId, produtoNome, localId, fornecedorId,
        quantidade: parseFloat(quantidade), custoUnitario: parseFloat(custoUnitario) || 0,
        observacao,
      });
      if (r.avisoFinanceiro) { avisar("Atenção", r.avisoFinanceiro); setSalvando(false); return; }
      if (parseFloat(custoUnitario) > 0) {
        avisar("Compra registrada", "A conta \"Estoque\" já foi creditada pelo custo. Também criei uma despesa pendente em Financeiro → Despesas, pra você dar baixa quando pagar.", () => navigation.goBack());
      } else {
        navigation.goBack();
      }
    } catch (e) {
      avisar("Erro", e.message || "Não foi possível salvar.");
    }
    setSalvando(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Fornecedor</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("fornecedor")}>
        <Text style={[s.selTxt, !fornecedorNome && { color: "#5f7d69" }]}>{fornecedorNome || "Escolher fornecedor (opcional)"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={[s.label, { marginTop: 14 }]}>Produto</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("produto")}>
        <Text style={[s.selTxt, !produtoNome && { color: "#5f7d69" }]}>{produtoNome || "Escolher produto"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={[s.label, { marginTop: 14 }]}>Local</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("local")}>
        <Text style={[s.selTxt, !localNome && { color: "#5f7d69" }]}>{localNome || "Escolher local"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={[s.label, { marginTop: 14 }]}>Quantidade</Text>
      <TextInput style={s.input} value={quantidade} onChangeText={setQuantidade} placeholder="0" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" />

      <Text style={[s.label, { marginTop: 14 }]}>Custo unitário (R$)</Text>
      <TextInput style={s.input} value={custoUnitario} onChangeText={setCustoUnitario} placeholder="0,00" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" />

      <Text style={[s.label, { marginTop: 14 }]}>Observação</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={observacao} onChangeText={setObservacao} placeholder="Ex.: nº da nota fiscal" placeholderTextColor="#5f7d69" multiline />

      <TouchableOpacity style={[s.salvar, salvando && { opacity: 0.6 }]} onPress={onSalvar} disabled={salvando}>
        <Text style={s.salvarTxt}>{salvando ? "Salvando…" : "🧾 Registrar compra"}</Text>
      </TouchableOpacity>

      <PickerModal
        visible={pickerAberto === "fornecedor"}
        titulo="Escolher fornecedor"
        itens={fornecedores.map((f) => ({ id: f.id, label: f.nome, sub: f.cidade || "" }))}
        onSelect={(it) => { setFornecedorId(it.id); setFornecedorNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum fornecedor cadastrado."
        acaoExtra={{ label: "+ Cadastrar novo fornecedor", onPress: irParaCadastroDeFornecedor }}
      />
      <PickerModal
        visible={pickerAberto === "produto"}
        titulo="Escolher produto"
        itens={produtos.map((p) => ({ id: p.id, label: p.nome, sub: p.tipo }))}
        onSelect={(it) => { setProdutoId(it.id); setProdutoNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum produto cadastrado."
        acaoExtra={{ label: "+ Cadastrar novo produto", onPress: irParaCadastroDeProduto }}
      />
      <PickerModal
        visible={pickerAberto === "local"}
        titulo="Escolher local"
        itens={locais.map((l) => ({ id: l.id, label: l.nome }))}
        onSelect={(it) => { setLocalId(it.id); setLocalNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum local cadastrado. Cadastre em Cadastros → Locais de Estoque primeiro."
      />

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
