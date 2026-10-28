import React, { useState, useEffect, useLayoutEffect } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from "react-native";
import { listar } from "../logic/store";
import { TIPOS_CUPOM, listarFuncionarios, salvarCupom, removerCupom, tirarFoto, lerFoto, lerCupomPorIA } from "../logic/cupons";
import { num } from "../logic/fmt";
import { confirmar, avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
const txt = (v) => (v == null ? "" : String(v));

// Foto do cupom -> a IA preenche os dados -> a pessoa confere e salva.
// Cupom de combustível também gera o abastecimento na Frota.
export default function CupomFormScreen({ route, navigation }) {
  const { funcionarioId: fidParam, cupom } = route.params || {};
  const [funcionarios, setFuncionarios] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [funcionarioId, setFuncionarioId] = useState(cupom ? cupom.funcionarioId : fidParam || null);
  const [tipo, setTipo] = useState(cupom ? cupom.tipo : "Alimentação");
  const [estabelecimento, setEstabelecimento] = useState(txt(cupom && cupom.estabelecimento));
  const [cnpj, setCnpj] = useState(txt(cupom && cupom.cnpj));
  const [data, setData] = useState((cupom && cupom.data) || hoje());
  const [valor, setValor] = useState(txt(cupom && cupom.valor));
  const [observacao, setObservacao] = useState(txt(cupom && cupom.observacao));
  const [veiculoId, setVeiculoId] = useState(cupom ? cupom.veiculoId : null);
  const [odometro, setOdometro] = useState(txt(cupom && cupom.odometro));
  const [litros, setLitros] = useState(txt(cupom && cupom.litros));
  const [precoLitro, setPrecoLitro] = useState(txt(cupom && cupom.precoLitro));
  const [foto, setFoto] = useState(null);       // base64 novo (ainda não salvo)
  const [fotoSalva, setFotoSalva] = useState(null);
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [picker, setPicker] = useState(null);   // "func" | "veic"

  useLayoutEffect(() => { navigation.setOptions({ title: cupom ? "Editar cupom" : "Novo cupom" }); }, [navigation, cupom]);
  useEffect(() => {
    listarFuncionarios().then(setFuncionarios);
    listar("veiculos").then(setVeiculos);
    if (cupom) lerFoto(cupom.id).then(setFotoSalva).catch(() => {});
  }, []);

  const combustivel = tipo === "Combustível";
  const nomeFunc = (funcionarios.find((f) => f.id === funcionarioId) || {}).nome;
  const nomeVeic = (() => { const v = veiculos.find((x) => x.id === veiculoId); return v ? (v.apelido || v.placa) : null; })();

  async function pegarFoto(camera) {
    try {
      const b64 = await tirarFoto(camera);
      if (!b64) return;
      setFoto(b64); setAviso(""); setLendo(true);
      try {
        const r = await lerCupomPorIA(b64);
        if (r) {
          if (r.estabelecimento) setEstabelecimento(String(r.estabelecimento));
          if (r.cnpj) setCnpj(String(r.cnpj));
          if (r.data && /^\d{4}-\d{2}-\d{2}$/.test(r.data)) setData(r.data);
          if (r.total != null) setValor(String(r.total).replace(".", ","));
          if (r.tipo && TIPOS_CUPOM.includes(r.tipo)) setTipo(r.tipo);
          if (r.litros != null) setLitros(String(r.litros).replace(".", ","));
          if (r.preco_litro != null) setPrecoLitro(String(r.preco_litro).replace(".", ","));
          setAviso("Dados preenchidos pela leitura do cupom. Confira antes de salvar.");
        }
      } catch (e) { setAviso(e.message || "Não consegui ler o cupom. Preencha os dados à mão."); }
      finally { setLendo(false); }
    } catch (e) { avisar("Foto", e.message || "Não foi possível pegar a foto."); }
  }

  async function onSalvar() {
    if (!funcionarioId) { avisar("Atenção", "Escolha o funcionário."); return; }
    const v = num(valor);
    if (!(v > 0)) { avisar("Atenção", "Informe o valor total do cupom."); return; }
    if (combustivel) {
      if (!veiculoId) { avisar("Atenção", "Escolha o veículo abastecido."); return; }
      if (!odometro.trim()) { avisar("Atenção", "Informe o odômetro."); return; }
      if (!(num(litros) > 0)) { avisar("Atenção", "Informe os litros abastecidos."); return; }
    }
    try {
      const l = num(litros);
      const preco = num(precoLitro) > 0 ? num(precoLitro) : (l > 0 ? Math.round((v / l) * 1000) / 1000 : "");
      await salvarCupom({
        ...(cupom ? { id: cupom.id } : {}),
        funcionarioId, tipo, estabelecimento: estabelecimento.trim(), cnpj: cnpj.trim(), data, valor: v, observacao: observacao.trim(),
        ...(combustivel ? { veiculoId, odometro: odometro.replace(",", "."), litros: l, precoLitro: preco } : { veiculoId: null, odometro: "", litros: "", precoLitro: "" }),
      }, foto);
      navigation.goBack();
    } catch (e) { avisar("Erro", e.message || "Não foi possível salvar."); }
  }

  function onExcluir() {
    confirmar("Excluir", "Remover este cupom? O valor volta para o saldo do funcionário.", async () => {
      await removerCupom(cupom); navigation.goBack();
    });
  }

  const imagem = foto || fotoSalva;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={s.fotoBtns}>
        <TouchableOpacity style={s.fotoBtn} onPress={() => pegarFoto(true)}><Text style={s.fotoBtnTxt}>📷 Tirar foto</Text></TouchableOpacity>
        <TouchableOpacity style={s.fotoBtn} onPress={() => pegarFoto(false)}><Text style={s.fotoBtnTxt}>🖼️ Da galeria</Text></TouchableOpacity>
      </View>
      {lendo ? <View style={s.lendo}><ActivityIndicator color={C.greenClaro} /><Text style={s.lendoTxt}>Lendo o cupom…</Text></View> : null}
      {aviso ? <Text style={s.aviso}>{aviso}</Text> : null}
      {imagem ? <Image source={{ uri: "data:image/jpeg;base64," + imagem }} style={s.foto} resizeMode="contain" /> : null}

      <Text style={s.label}>Funcionário *</Text>
      <TouchableOpacity style={s.combo} onPress={() => setPicker("func")}>
        <Text style={nomeFunc ? s.comboTxt : s.comboVazio}>{nomeFunc || "Escolher funcionário"}</Text><Text style={s.chev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Tipo</Text>
      <View style={s.chips}>
        {TIPOS_CUPOM.map((t) => (
          <TouchableOpacity key={t} style={[s.chip, tipo === t && s.chipOn]} onPress={() => setTipo(t)}>
            <Text style={[s.chipTxt, tipo === t && s.chipTxtOn]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Estabelecimento</Text>
      <TextInput style={s.input} value={estabelecimento} onChangeText={setEstabelecimento} placeholder="Ex.: Posto Girassol" placeholderTextColor="#5f7d69" />
      <Text style={s.label}>CNPJ</Text>
      <TextInput style={s.input} value={cnpj} onChangeText={setCnpj} placeholder="00.000.000/0000-00" placeholderTextColor="#5f7d69" />
      <Text style={s.label}>Data</Text>
      <TextInput style={s.input} value={data} onChangeText={setData} placeholder="aaaa-mm-dd" placeholderTextColor="#5f7d69" />
      <Text style={s.label}>Valor total (R$) *</Text>
      <TextInput style={s.input} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="Ex.: 42,90" placeholderTextColor="#5f7d69" />

      {combustivel ? (
        <View style={s.bloco}>
          <Text style={s.blocoT}>⛽ Abastecimento (vai para a Frota)</Text>
          <Text style={s.label}>Veículo *</Text>
          <TouchableOpacity style={s.combo} onPress={() => setPicker("veic")}>
            <Text style={nomeVeic ? s.comboTxt : s.comboVazio}>{nomeVeic || "Escolher veículo"}</Text><Text style={s.chev}>▾</Text>
          </TouchableOpacity>
          <Text style={s.label}>Odômetro (km) *</Text>
          <TextInput style={s.input} value={odometro} onChangeText={setOdometro} keyboardType="decimal-pad" placeholder="Ex.: 12345" placeholderTextColor="#5f7d69" />
          <Text style={s.label}>Litros *</Text>
          <TextInput style={s.input} value={litros} onChangeText={setLitros} keyboardType="decimal-pad" placeholder="Ex.: 40,5" placeholderTextColor="#5f7d69" />
          <Text style={s.label}>Preço do litro (R$)</Text>
          <TextInput style={s.input} value={precoLitro} onChangeText={setPrecoLitro} keyboardType="decimal-pad" placeholder="Se vazio, calculo pelo total" placeholderTextColor="#5f7d69" />
        </View>
      ) : null}

      <Text style={s.label}>Observação</Text>
      <TextInput style={s.input} value={observacao} onChangeText={setObservacao} placeholder="Opcional" placeholderTextColor="#5f7d69" />

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {cupom ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}
      <View style={{ height: 30 }} />

      <PickerModal visible={picker === "func"} titulo="Funcionário" vazioMsg="Cadastre em Cadastros › Funcionários."
        itens={funcionarios.map((f) => ({ id: f.id, label: f.nome, sub: f.funcao }))}
        onSelect={(i) => { setFuncionarioId(i.id); setPicker(null); }} onClose={() => setPicker(null)} />
      <PickerModal visible={picker === "veic"} titulo="Veículo" vazioMsg="Cadastre o veículo na Frota."
        itens={veiculos.map((v) => ({ id: v.id, label: v.apelido || v.placa || "(sem nome)", sub: [v.placa, v.modelo].filter(Boolean).join(" · ") }))}
        onSelect={(i) => { setVeiculoId(i.id); setPicker(null); }} onClose={() => setPicker(null)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fotoBtns: { flexDirection: "row", gap: 10 },
  fotoBtn: { flex: 1, backgroundColor: C.green, borderRadius: 11, paddingVertical: 15, alignItems: "center" },
  fotoBtnTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  lendo: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  lendoTxt: { color: C.mut, fontSize: 13 },
  aviso: { color: C.greenClaro, fontSize: 12, lineHeight: 18, marginTop: 10 },
  foto: { width: "100%", height: 280, marginTop: 12, borderRadius: 10, backgroundColor: C.card },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 14, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  combo: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 12 },
  comboTxt: { flex: 1, color: C.text, fontSize: 15 },
  comboVazio: { flex: 1, color: "#5f7d69", fontSize: 15 },
  chev: { color: C.mut, fontSize: 16 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderColor: C.line, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { color: C.text, fontSize: 13, fontWeight: "700" },
  chipTxtOn: { color: "#06210b" },
  bloco: { borderColor: C.green, borderWidth: 1.5, borderRadius: 12, padding: 12, marginTop: 18 },
  blocoT: { color: C.text, fontSize: 14, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  excluir: { backgroundColor: "#3a1f28", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
