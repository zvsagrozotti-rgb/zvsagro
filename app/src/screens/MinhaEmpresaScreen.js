import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { lerEmpresa, salvarEmpresa } from "../logic/empresa";
import { escolherArquivo, abrirArquivo } from "../logic/arquivos";
import { avisar } from "../logic/confirm";
import { C } from "../theme";

const CAMPOS = [
  { key: "nome", label: "Nome da empresa", ph: "Ex.: VZS Agro Soluções Integradas" },
  { key: "slogan", label: "Slogan", ph: "Ex.: Soluções Integradas" },
  { key: "agronomo", label: "Responsável", ph: "Nome do responsável" },
  { key: "documento", label: "CPF / CNPJ", ph: "00.000.000/0000-00" },
  { key: "telefone", label: "Telefone", ph: "(00) 00000-0000" },
  { key: "email", label: "E-mail", ph: "contato@empresa.com" },
  { key: "endereco", label: "Endereço", ph: "Rua, nº, cidade - UF", multi: true },
];

// Dados para recebimento — aparecem no relatório para o cliente saber pra onde pagar.
const CAMPOS_PAGAMENTO = [
  { key: "banco", label: "Banco", ph: "Ex.: 341 - Itaú" },
  { key: "agencia", label: "Agência", ph: "0000" },
  { key: "conta", label: "Conta", ph: "00000-0" },
  { key: "pix", label: "Chave PIX", ph: "CPF/CNPJ, e-mail, telefone ou chave aleatória" },
];

export default function MinhaEmpresaScreen({ navigation }) {
  const [form, setForm] = useState({});
  useFocusEffect(useCallback(() => { lerEmpresa().then(e => setForm(e || {})); }, []));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function escolherLogo() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      // Redimensiona antes de salvar: fotos de celular (3000px+) em base64 podem
      // passar de 5-10MB e estourar o limite do localStorage/AsyncStorage, o que
      // fazia o "Salvar" falhar silenciosamente sem nunca gravar a logo.
      const manip = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 480 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      set("logo", "data:image/jpeg;base64," + manip.base64);
    } catch (e) { avisar("Erro", "Não foi possível escolher a imagem."); }
  }

  async function anexar() {
    try {
      const f = await escolherArquivo();
      if (!f) return;
      const tamMB = (f.dados.length * 0.75) / 1e6;
      if (tamMB > 3) { avisar("Arquivo grande", "Máximo ~3 MB por arquivo."); return; }
      const atual = Array.isArray(form.documentos) ? form.documentos : [];
      set("documentos", [...atual, f]);
    } catch (e) { avisar("Erro", "Não foi possível anexar o arquivo."); }
  }

  async function onSalvar() {
    if (!String(form.nome || "").trim()) { avisar("Atenção", "Informe o nome da empresa."); return; }
    try {
      await salvarEmpresa(form);
      avisar("Salvo!", "Dados da empresa atualizados.", () => navigation.navigate("Home"));
    } catch (e) {
      avisar("Erro ao salvar", "Não deu para gravar os dados (armazenamento cheio ou logo grande demais). Tente uma logo menor ou remova documentos anexados.");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={s.logoBox}>
        {form.logo ? <Image source={{ uri: form.logo }} style={s.logo} resizeMode="contain" /> : <Text style={s.logoVazio}>sem logo</Text>}
      </View>
      <View style={s.logoBtns}>
        <TouchableOpacity style={s.btnSec} onPress={escolherLogo}><Text style={s.btnSecTxt}>🖼️ Escolher logo</Text></TouchableOpacity>
        {form.logo ? <TouchableOpacity style={s.btnRem} onPress={() => set("logo", "")}><Text style={{ color: C.red, fontWeight: "700" }}>Remover</Text></TouchableOpacity> : null}
      </View>

      {CAMPOS.map((c) => (
        <View key={c.key} style={{ marginBottom: 14 }}>
          <Text style={s.label}>{c.label}{c.key === "nome" ? " *" : ""}</Text>
          <TextInput
            style={[s.input, c.multi && { minHeight: 60, textAlignVertical: "top" }]}
            value={String(form[c.key] ?? "")}
            onChangeText={(v) => set(c.key, v)}
            placeholder={c.ph} placeholderTextColor="#5f7d69"
            multiline={!!c.multi}
          />
        </View>
      ))}

      <Text style={s.secao}>💰 Dados para recebimento</Text>
      <Text style={s.secaoSub}>Aparecem no relatório do serviço, para o cliente saber para onde pagar.</Text>
      {CAMPOS_PAGAMENTO.map((c) => (
        <View key={c.key} style={{ marginBottom: 14 }}>
          <Text style={s.label}>{c.label}</Text>
          <TextInput
            style={s.input}
            value={String(form[c.key] ?? "")}
            onChangeText={(v) => set(c.key, v)}
            placeholder={c.ph} placeholderTextColor="#5f7d69"
          />
        </View>
      ))}

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>Documentos (PDF)</Text>
        {(Array.isArray(form.documentos) ? form.documentos : []).map((f, fi) => (
          <View key={fi} style={s.fileRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirArquivo(f)}>
              <Text style={s.fileNome}>📄 {f.nome}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => set("documentos", (form.documentos || []).filter((_, j) => j !== fi))}>
              <Text style={{ color: C.red, fontWeight: "800", paddingHorizontal: 6 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={s.fileAdd} onPress={anexar}>
          <Text style={s.fileAddTxt}>＋ Anexar PDF</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar empresa</Text></TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  logoBox: { height: 110, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  logo: { width: "80%", height: 90 },
  logoVazio: { color: C.mut, fontSize: 13 },
  logoBtns: { flexDirection: "row", gap: 10, marginBottom: 18, justifyContent: "center" },
  btnSec: { backgroundColor: "#1c4a30", borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 },
  btnSecTxt: { color: "#bff0cf", fontWeight: "700" },
  btnRem: { backgroundColor: "#3a1f28", borderRadius: 9, paddingVertical: 10, paddingHorizontal: 16 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, textTransform: "uppercase" },
  secao: { color: C.text, fontSize: 15, fontWeight: "800", marginTop: 6, marginBottom: 3 },
  secaoSub: { color: C.mut, fontSize: 12, marginBottom: 12 },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  salvar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  salvarTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
  fileRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 },
  fileNome: { color: C.blue, fontSize: 14, fontWeight: "600" },
  fileAdd: { backgroundColor: "#1c4a30", borderRadius: 9, paddingVertical: 11, alignItems: "center" },
  fileAddTxt: { color: "#bff0cf", fontWeight: "700" },
});
