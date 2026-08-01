import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import { criarSaida, listarMovimentacoes, saldoPorProdutoLocal, custoMedioPonderado } from "../logic/estoque/movimentacoes";
import { avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

const AUTOMATICO = "🔀 Automático (usa de onde tiver)";

// Venda = saída de estoque vinculada a um Cliente. Debita a conta "Estoque"
// na hora, pelo CUSTO médio do produto (não o preço de venda — o lucro não
// sai do estoque, é dinheiro novo). Em paralelo, gera uma receita pendente
// em Contas a Receber pro valor cheio da venda; o dinheiro só entra de
// verdade numa conta quando você dá baixa nela, em Financeiro — a baixa não
// mexe mais na conta Estoque, ela já foi debitada aqui.
//
// Local "Automático" (padrão): se o produto tiver saldo espalhado em mais
// de um local, puxa de onde tiver, começando pelo que tem mais — sem
// precisar escolher local na mão. Escolhendo um local específico, a venda
// trava se não tiver saldo suficiente ali.
export default function VendaFormScreen({ navigation }) {
  const [produtos, setProdutos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);

  const [produtoId, setProdutoId] = useState(null);
  const [produtoNome, setProdutoNome] = useState("");
  const [localId, setLocalId] = useState(null);
  const [localNome, setLocalNome] = useState(AUTOMATICO);
  const [clienteId, setClienteId] = useState(null);
  const [clienteNome, setClienteNome] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [observacao, setObservacao] = useState("");
  const [custoMedioAtual, setCustoMedioAtual] = useState(null);

  const [pickerAberto, setPickerAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(useCallback(() => {
    listarAgro("produtos").then(setProdutos);
    listarAgro("locais").then(setLocais);
    listarAgro("clientes").then((cs) => setClientes(cs.filter((c) => !c.tipo || c.tipo === "Cliente" || c.tipo === "Ambos")));
    listarMovimentacoes().then(setMovimentacoes);
  }, []));

  useFocusEffect(useCallback(() => {
    if (produtoId && localId) setCustoMedioAtual(custoMedioPonderado(movimentacoes, produtoId, localId));
    else setCustoMedioAtual(null);
  }, [produtoId, localId, movimentacoes]));

  const nomeLocal = (id) => locais.find((l) => l.id === id)?.nome || "(local removido)";

  // Só produtos com saldo positivo em algum local — não faz sentido vender
  // o que não tem.
  const produtosComEstoque = (() => {
    const saldos = saldoPorProdutoLocal(movimentacoes);
    const comEstoque = new Set();
    Object.entries(saldos).forEach(([chave, saldo]) => { if (saldo > 0) comEstoque.add(chave.split("|")[0]); });
    return produtos.filter((p) => comEstoque.has(p.id));
  })();

  // Onde o produto escolhido tem saldo (pra mostrar antes de decidir
  // "Automático" ou um local específico).
  const saldoPorLocalDoProduto = (() => {
    if (!produtoId) return [];
    const saldos = saldoPorProdutoLocal(movimentacoes);
    return Object.entries(saldos)
      .filter(([chave, saldo]) => chave.split("|")[0] === produtoId && saldo > 0)
      .map(([chave, saldo]) => ({ localId: chave.split("|")[1], saldo }));
  })();

  function irParaCadastroDeCliente() {
    setPickerAberto(null);
    navigation.navigate("CrudForm", {
      entidade: "clientes",
      aoSalvar: (novo) => { setClienteId(novo.id); setClienteNome(novo.nome); },
    });
  }

  async function onSalvar() {
    setSalvando(true);
    try {
      const r = await criarSaida({
        produtoId, produtoNome, localId, clienteId,
        quantidade: parseFloat(quantidade), precoVenda: parseFloat(precoVenda) || 0,
        observacao,
      });
      if (r.avisoFinanceiro) { avisar("Atenção", r.avisoFinanceiro); setSalvando(false); return; }
      if (parseFloat(precoVenda) > 0) {
        avisar("Venda registrada", "A conta \"Estoque\" já foi debitada pelo custo. Também criei uma receita pendente em Financeiro → Receitas, pra você dar baixa quando receber.", () => navigation.goBack());
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
      <Text style={s.label}>Cliente</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("cliente")}>
        <Text style={[s.selTxt, !clienteNome && { color: "#5f7d69" }]}>{clienteNome || "Escolher cliente (opcional)"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={[s.label, { marginTop: 14 }]}>Produto</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("produto")}>
        <Text style={[s.selTxt, !produtoNome && { color: "#5f7d69" }]}>{produtoNome || "Escolher produto"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      {saldoPorLocalDoProduto.length > 0 ? (
        <Text style={s.saldoInfo}>
          Onde tem: {saldoPorLocalDoProduto.map((l) => nomeLocal(l.localId) + " (" + l.saldo + ")").join(" · ")}
        </Text>
      ) : null}

      <Text style={[s.label, { marginTop: 14 }]}>Local</Text>
      <TouchableOpacity style={s.select} onPress={() => setPickerAberto("local")}>
        <Text style={s.selTxt}>{localNome}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      {produtoId && localId && custoMedioAtual !== null ? (
        <Text style={s.saldoInfo}>Custo médio hoje: R$ {custoMedioAtual.toFixed(2)}/un — é isso que vai sair do valor em estoque</Text>
      ) : null}

      <Text style={[s.label, { marginTop: 14 }]}>Quantidade</Text>
      <TextInput style={s.input} value={quantidade} onChangeText={setQuantidade} placeholder="0" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" />

      <Text style={[s.label, { marginTop: 14 }]}>Preço de venda unitário (R$)</Text>
      <TextInput style={s.input} value={precoVenda} onChangeText={setPrecoVenda} placeholder="0,00" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" />

      <Text style={[s.label, { marginTop: 14 }]}>Observação</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={observacao} onChangeText={setObservacao} placeholder="Ex.: nº da nota fiscal" placeholderTextColor="#5f7d69" multiline />

      <TouchableOpacity style={[s.salvar, salvando && { opacity: 0.6 }]} onPress={onSalvar} disabled={salvando}>
        <Text style={s.salvarTxt}>{salvando ? "Salvando…" : "💰 Registrar venda"}</Text>
      </TouchableOpacity>

      <PickerModal
        visible={pickerAberto === "cliente"}
        titulo="Escolher cliente"
        itens={clientes.map((cl) => ({ id: cl.id, label: cl.nome, sub: cl.cidade || "" }))}
        onSelect={(it) => { setClienteId(it.id); setClienteNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum cliente cadastrado."
        acaoExtra={{ label: "+ Cadastrar novo cliente", onPress: irParaCadastroDeCliente }}
      />
      <PickerModal
        visible={pickerAberto === "produto"}
        titulo="Escolher produto"
        itens={produtosComEstoque.map((p) => ({ id: p.id, label: p.nome, sub: p.tipo }))}
        onSelect={(it) => { setProdutoId(it.id); setProdutoNome(it.label); setLocalId(null); setLocalNome(AUTOMATICO); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum produto com saldo em estoque no momento."
      />
      <PickerModal
        visible={pickerAberto === "local"}
        titulo="Escolher local"
        itens={[{ id: "__auto__", label: AUTOMATICO }, ...locais.map((l) => ({ id: l.id, label: l.nome }))]}
        onSelect={(it) => {
          if (it.id === "__auto__") { setLocalId(null); setLocalNome(AUTOMATICO); }
          else { setLocalId(it.id); setLocalNome(it.label); }
          setPickerAberto(null);
        }}
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
  saldoInfo: { color: "#F4C430", fontSize: 12, marginTop: 8, fontWeight: "700" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
