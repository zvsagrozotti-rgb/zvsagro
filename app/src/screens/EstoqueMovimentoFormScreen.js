import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar as listarAgro } from "../logic/store";
import {
  criarEntrada, criarSaida, criarTransferencia, criarContagem, editarMovimentacao,
  listarMovimentacoes, saldoDe, saldoPorProdutoLocal, custoMedioPonderado, lancamentoDaMovimentacao,
} from "../logic/estoque/movimentacoes";
import { avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

const TIPOS = [
  { chave: "entrada", label: "Entrada" },
  { chave: "saida", label: "Saída" },
  { chave: "transferencia", label: "Transferência" },
  { chave: "contagem", label: "Contagem (ajuste)" },
];

export default function EstoqueMovimentoFormScreen({ navigation, route }) {
  const editando = route.params?.movimentacao || null;

  const [produtos, setProdutos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);

  const [tipo, setTipo] = useState(() => (editando ? TIPOS.find((t) => t.chave === editando.tipo) || TIPOS[0] : TIPOS[0]));
  const [produtoId, setProdutoId] = useState(editando?.produtoId || null);
  const [produtoNome, setProdutoNome] = useState("");
  const [localId, setLocalId] = useState(editando?.localId || null);
  const [localNome, setLocalNome] = useState("");
  const [localOrigemId, setLocalOrigemId] = useState(editando?.localOrigemId || null);
  const [localOrigemNome, setLocalOrigemNome] = useState("");
  const [localDestinoId, setLocalDestinoId] = useState(editando?.localDestinoId || null);
  const [localDestinoNome, setLocalDestinoNome] = useState("");
  const [quantidade, setQuantidade] = useState(editando ? String(editando.quantidade ?? "") : "");
  const [custoUnitario, setCustoUnitario] = useState(editando ? String(editando.custoUnitario ?? "") : "");
  const [precoVenda, setPrecoVenda] = useState(editando ? String(editando.precoVenda ?? "") : "");
  const [observacao, setObservacao] = useState(editando?.observacao || "");
  const [saldoAtual, setSaldoAtual] = useState(null);
  const [custoMedioAtual, setCustoMedioAtual] = useState(null);

  const [lancamento, setLancamento] = useState(undefined); // undefined = ainda carregando; null = não tem
  const bloqueado = lancamento && lancamento.status === "baixado";

  const [pickerAberto, setPickerAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useFocusEffect(useCallback(() => {
    listarAgro("produtos").then((lista) => {
      setProdutos(lista);
      if (editando) { const p = lista.find((x) => x.id === editando.produtoId); if (p) setProdutoNome(p.nome); }
    });
    listarAgro("locais").then((lista) => {
      setLocais(lista);
      if (editando) {
        if (editando.localId) { const l = lista.find((x) => x.id === editando.localId); if (l) setLocalNome(l.nome); }
        if (editando.localOrigemId) { const l = lista.find((x) => x.id === editando.localOrigemId); if (l) setLocalOrigemNome(l.nome); }
        if (editando.localDestinoId) { const l = lista.find((x) => x.id === editando.localDestinoId); if (l) setLocalDestinoNome(l.nome); }
      }
    });
    listarMovimentacoes().then(setMovimentacoes);
  }, []));

  useFocusEffect(useCallback(() => {
    if (editando) lancamentoDaMovimentacao(editando).then(setLancamento);
  }, []));

  useFocusEffect(useCallback(() => {
    if (tipo.chave === "contagem" && produtoId && localId) {
      listarMovimentacoes().then((movs) => setSaldoAtual(saldoDe(movs, produtoId, localId)));
    } else {
      setSaldoAtual(null);
    }
    if (tipo.chave === "saida" && produtoId && localId) {
      setCustoMedioAtual(custoMedioPonderado(movimentacoes, produtoId, localId));
    } else {
      setCustoMedioAtual(null);
    }
  }, [tipo, produtoId, localId, movimentacoes]));

  // Na saída só faz sentido escolher produto que tem saldo positivo em
  // algum local — escolher da lista geral (a maioria sem estoque nenhum)
  // só atrapalha.
  const produtosParaEscolher = (() => {
    if (tipo.chave !== "saida" || editando) return produtos;
    const saldos = saldoPorProdutoLocal(movimentacoes);
    const comEstoque = new Set();
    Object.entries(saldos).forEach(([chave, saldo]) => { if (saldo > 0) comEstoque.add(chave.split("|")[0]); });
    return produtos.filter((p) => comEstoque.has(p.id));
  })();

  function trocarTipo(t) {
    setTipo(t);
    setQuantidade(""); setCustoUnitario(""); setPrecoVenda(""); setObservacao("");
  }

  function irParaCadastroDeProduto() {
    setPickerAberto(null);
    navigation.navigate("CrudForm", {
      entidade: "produtos",
      aoSalvar: (novo) => { setProdutoId(novo.id); setProdutoNome(novo.nome); },
    });
  }

  async function onSalvar() {
    setSalvando(true);
    try {
      if (editando) {
        await editarMovimentacao(editando, {
          quantidade: parseFloat(quantidade),
          custoUnitario: parseFloat(custoUnitario) || 0,
          precoVenda: parseFloat(precoVenda) || 0,
          observacao,
        });
        avisar("Movimento corrigido", "As alterações foram salvas.", () => navigation.goBack());
        setSalvando(false); return;
      }
      if (tipo.chave === "entrada") {
        const r = await criarEntrada({ produtoId, produtoNome, localId, quantidade: parseFloat(quantidade), custoUnitario: parseFloat(custoUnitario) || 0, observacao });
        if (r.avisoFinanceiro) { avisar("Atenção", r.avisoFinanceiro); setSalvando(false); return; }
        if (parseFloat(custoUnitario) > 0) avisar("Entrada registrada", "A conta \"Estoque\" já foi creditada pelo custo. Também criei uma despesa pendente em Financeiro → Despesas, pra você dar baixa quando pagar.", () => navigation.goBack());
        else navigation.goBack();
        setSalvando(false); return;
      } else if (tipo.chave === "saida") {
        const r = await criarSaida({ produtoId, produtoNome, localId, quantidade: parseFloat(quantidade), precoVenda: parseFloat(precoVenda) || 0, observacao });
        if (r.avisoFinanceiro) { avisar("Atenção", r.avisoFinanceiro); setSalvando(false); return; }
        if (parseFloat(precoVenda) > 0) avisar("Saída registrada", "A conta \"Estoque\" já foi debitada pelo custo. Também criei uma receita pendente em Financeiro → Receitas, pra você dar baixa quando receber.", () => navigation.goBack());
        else navigation.goBack();
        setSalvando(false); return;
      } else if (tipo.chave === "transferencia") {
        await criarTransferencia({ produtoId, localOrigemId, localDestinoId, quantidade: parseFloat(quantidade), observacao });
      } else if (tipo.chave === "contagem") {
        const r = await criarContagem({ produtoId, localId, quantidadeContada: parseFloat(quantidade), observacao });
        if (!r) { avisar("Sem diferença", "O saldo já batia com a contagem — nada foi lançado."); setSalvando(false); return; }
      }
      navigation.goBack();
    } catch (e) {
      avisar("Erro", e.message || "Não foi possível salvar.");
    }
    setSalvando(false);
  }

  const labelQuantidade = tipo.chave === "contagem" ? "Quantidade contada agora" : "Quantidade";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {editando ? (
        <View style={[s.avisoEdicao, bloqueado && s.avisoBloqueado]}>
          <Text style={s.avisoEdicaoTxt}>
            {bloqueado
              ? "🔒 Este movimento já tem um lançamento financeiro baixado. Para editar, estorne a baixa em Financeiro primeiro."
              : "✏️ Corrigindo um movimento já lançado — tipo, produto e local não podem mudar aqui."}
          </Text>
        </View>
      ) : null}

      <Text style={s.label}>Tipo de movimento</Text>
      {editando ? (
        <View style={s.selectFixo}><Text style={s.selTxt}>{tipo.label}</Text></View>
      ) : (
        <TouchableOpacity style={s.select} onPress={() => setPickerAberto("tipo")}>
          <Text style={s.selTxt}>{tipo.label}</Text>
          <Text style={s.selChev}>▾</Text>
        </TouchableOpacity>
      )}

      <Text style={[s.label, { marginTop: 14 }]}>Produto</Text>
      {editando ? (
        <View style={s.selectFixo}><Text style={s.selTxt}>{produtoNome || "—"}</Text></View>
      ) : (
        <TouchableOpacity style={s.select} onPress={() => setPickerAberto("produto")}>
          <Text style={[s.selTxt, !produtoNome && { color: "#5f7d69" }]}>{produtoNome || "Escolher produto"}</Text>
          <Text style={s.selChev}>▾</Text>
        </TouchableOpacity>
      )}

      {!editando && tipo.chave === "transferencia" ? (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Local de origem</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickerAberto("localOrigem")}>
            <Text style={[s.selTxt, !localOrigemNome && { color: "#5f7d69" }]}>{localOrigemNome || "Escolher local"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
          <Text style={[s.label, { marginTop: 14 }]}>Local de destino</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickerAberto("localDestino")}>
            <Text style={[s.selTxt, !localDestinoNome && { color: "#5f7d69" }]}>{localDestinoNome || "Escolher local"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
        </>
      ) : !editando ? (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Local</Text>
          <TouchableOpacity style={s.select} onPress={() => setPickerAberto("local")}>
            <Text style={[s.selTxt, !localNome && { color: "#5f7d69" }]}>{localNome || "Escolher local"}</Text>
            <Text style={s.selChev}>▾</Text>
          </TouchableOpacity>
        </>
      ) : tipo.chave === "transferencia" ? (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Local de origem → destino</Text>
          <View style={s.selectFixo}><Text style={s.selTxt}>{localOrigemNome} → {localDestinoNome}</Text></View>
        </>
      ) : (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Local</Text>
          <View style={s.selectFixo}><Text style={s.selTxt}>{localNome || "—"}</Text></View>
        </>
      )}

      {tipo.chave === "contagem" && saldoAtual !== null ? (
        <Text style={s.saldoInfo}>Saldo atual nesse local: {saldoAtual}</Text>
      ) : null}
      {tipo.chave === "saida" && !editando && custoMedioAtual !== null ? (
        <Text style={s.saldoInfo}>Custo médio hoje: R$ {custoMedioAtual.toFixed(2)}/un — é isso que vai sair do valor em estoque</Text>
      ) : null}

      <Text style={[s.label, { marginTop: 14 }]}>{labelQuantidade}</Text>
      <TextInput style={s.input} value={quantidade} onChangeText={setQuantidade} placeholder="0" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" editable={!bloqueado} />

      {tipo.chave === "entrada" ? (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Custo unitário (R$)</Text>
          <TextInput style={s.input} value={custoUnitario} onChangeText={setCustoUnitario} placeholder="0,00" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" editable={!bloqueado} />
        </>
      ) : null}

      {tipo.chave === "saida" ? (
        <>
          <Text style={[s.label, { marginTop: 14 }]}>Preço de venda unitário (R$)</Text>
          <TextInput style={s.input} value={precoVenda} onChangeText={setPrecoVenda} placeholder="0,00" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" editable={!bloqueado} />
          {editando ? (
            <>
              <Text style={[s.label, { marginTop: 14 }]}>Custo unitário (o que sai do estoque)</Text>
              <TextInput style={s.input} value={custoUnitario} onChangeText={setCustoUnitario} placeholder="0,00" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" editable={!bloqueado} />
            </>
          ) : null}
        </>
      ) : null}

      <Text style={[s.label, { marginTop: 14 }]}>Observação</Text>
      <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={observacao} onChangeText={setObservacao} placeholder="Opcional" placeholderTextColor="#5f7d69" multiline editable={!bloqueado} />

      <TouchableOpacity style={[s.salvar, (salvando || bloqueado) && { opacity: 0.6 }]} onPress={onSalvar} disabled={salvando || bloqueado}>
        <Text style={s.salvarTxt}>{salvando ? "Salvando…" : "💾 Salvar"}</Text>
      </TouchableOpacity>

      <PickerModal
        visible={pickerAberto === "tipo"}
        titulo="Tipo de movimento"
        itens={TIPOS.map((t) => ({ id: t.chave, label: t.label }))}
        onSelect={(it) => { trocarTipo(TIPOS.find((t) => t.chave === it.id)); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
      />
      <PickerModal
        visible={pickerAberto === "produto"}
        titulo="Escolher produto"
        itens={produtosParaEscolher.map((p) => ({ id: p.id, label: p.nome, sub: p.tipo }))}
        onSelect={(it) => { setProdutoId(it.id); setProdutoNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg={tipo.chave === "saida" ? "Nenhum produto com saldo em estoque no momento." : "Nenhum produto cadastrado. Cadastre em Cadastros → Produtos primeiro."}
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
      <PickerModal
        visible={pickerAberto === "localOrigem"}
        titulo="Local de origem"
        itens={locais.map((l) => ({ id: l.id, label: l.nome }))}
        onSelect={(it) => { setLocalOrigemId(it.id); setLocalOrigemNome(it.label); setPickerAberto(null); }}
        onClose={() => setPickerAberto(null)}
        vazioMsg="Nenhum local cadastrado. Cadastre em Cadastros → Locais de Estoque primeiro."
      />
      <PickerModal
        visible={pickerAberto === "localDestino"}
        titulo="Local de destino"
        itens={locais.map((l) => ({ id: l.id, label: l.nome }))}
        onSelect={(it) => { setLocalDestinoId(it.id); setLocalDestinoNome(it.label); setPickerAberto(null); }}
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
  selectFixo: { backgroundColor: "#0f2417", borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13 },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  saldoInfo: { color: "#F4C430", fontSize: 12, marginTop: 8, fontWeight: "700" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  avisoEdicao: { backgroundColor: "#12301F", borderColor: C.green, borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 16 },
  avisoBloqueado: { backgroundColor: "#3a1f28", borderColor: C.red },
  avisoEdicaoTxt: { color: C.text, fontSize: 13, fontWeight: "600" },
});
