import React, { useState, useLayoutEffect, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ENTIDADES } from "../logic/entidades";
import { salvar, remover, listar } from "../logic/store";
import { confirmar, avisar } from "../logic/confirm";
import { escolherArquivo, abrirArquivo } from "../logic/arquivos";
import PickerModal from "../components/PickerModal";
import { tipoDocumento, validarCPF, formatarDocumento, buscarCNPJ, buscarCEP } from "../logic/documento";
import { C } from "../theme";

export default function CrudFormScreen({ route, navigation }) {
  const { entidade, item, aoSalvar } = route.params;
  const cfg = ENTIDADES[entidade];
  const [form, setForm] = useState({ ...(item || {}) });
  const [refData, setRefData] = useState({});
  const [pickerField, setPickerField] = useState(null);
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Busca automática de dados: CNPJ (Receita Federal, público) preenche nome
  // e endereço. CPF só é validado (dígito verificador) — não existe busca
  // pública/legal de nome ou endereço por CPF (dado protegido por LGPD).
  async function buscarDocumentoAction() {
    const doc = form.documento;
    const tipo = tipoDocumento(doc);
    if (!tipo) { avisar("CPF/CNPJ", "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) primeiro."); return; }
    if (tipo === "CPF") {
      if (!validarCPF(doc)) { avisar("CPF inválido", "Confira o número digitado."); return; }
      set("documento", formatarDocumento(doc));
      avisar("CPF válido", "Não existe busca automática de nome/endereço por CPF (dado protegido por LGPD) — preencha manualmente, ou use o campo CEP para completar o endereço.");
      return;
    }
    setBuscandoDoc(true);
    try {
      const d = await buscarCNPJ(doc);
      setForm(f => ({
        ...f, documento: formatarDocumento(doc), nome: d.nome || f.nome,
        contato: d.contato || f.contato, cep: d.cep, endereco: d.endereco,
        numero: d.numero, bairro: d.bairro, cidade: d.cidade, uf: d.uf,
      }));
      avisar("CNPJ encontrado!", (d.razaoSocial || d.nome) + " — dados preenchidos automaticamente.");
    } catch (e) {
      avisar("Erro na busca", e.message);
    } finally {
      setBuscandoDoc(false);
    }
  }

  async function buscarEnderecoAction() {
    setBuscandoCep(true);
    try {
      const d = await buscarCEP(form.cep);
      setForm(f => ({ ...f, endereco: d.endereco || f.endereco, bairro: d.bairro || f.bairro, cidade: d.cidade || f.cidade, uf: d.uf || f.uf }));
    } catch (e) {
      avisar("Erro no CEP", e.message);
    } finally {
      setBuscandoCep(false);
    }
  }

  useFocusEffect(useCallback(() => {
    cfg.campos.filter(c => c.tipo === "ref").forEach(c => {
      listar(c.ref).then(items => setRefData(d => ({ ...d, [c.ref]: items })));
    });
  }, []));

  useLayoutEffect(() => {
    navigation.setOptions({ title: (item ? "Editar " : "Novo ") + cfg.singular });
  }, [navigation]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function anexar(key) {
    try {
      const f = await escolherArquivo();
      if (!f) return;
      const tamMB = (f.dados.length * 0.75) / 1e6;
      if (tamMB > 3) { avisar("Arquivo grande", "Máximo ~3 MB por arquivo."); return; }
      const atual = Array.isArray(form[key]) ? form[key] : [];
      set(key, [...atual, f]);
    } catch (e) { avisar("Erro", "Não foi possível anexar o arquivo."); }
  }

  async function onSalvar() {
    for (const c of cfg.campos) {
      if (c.req && !String(form[c.key] || "").trim()) { avisar("Atenção", c.label + " é obrigatório."); return; }
    }
    const salvo = await salvar(entidade, { ...form });
    if (aoSalvar) aoSalvar(salvo);
    navigation.goBack();
  }
  function onExcluir() {
    confirmar("Excluir", "Remover este " + cfg.singular.toLowerCase() + "?", async () => { await remover(entidade, item.id); navigation.goBack(); });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {cfg.campos.map((campo) => (
        <View key={campo.key} style={{ marginBottom: 14 }}>
          <Text style={s.label}>{campo.label}{campo.req ? " *" : ""}</Text>
          {campo.tipo === "ref" ? (
            <TouchableOpacity style={s.select} onPress={() => setPickerField(campo)}>
              <Text style={[s.selTxt, !form[campo.key] && { color: "#5f7d69" }]}>{form[campo.key] || ("Escolher " + campo.label.toLowerCase())}</Text>
              <Text style={s.selChev}>▾</Text>
            </TouchableOpacity>
          ) : campo.tipo === "select" ? (
            <TouchableOpacity style={s.select} onPress={() => setPickerField(campo)}>
              <Text style={[s.selTxt, !form[campo.key] && { color: "#5f7d69" }]}>{form[campo.key] || "Toque para escolher"}</Text>
              <Text style={s.selChev}>▾</Text>
            </TouchableOpacity>
          ) : campo.tipo === "selectTexto" ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={String(form[campo.key] ?? "")}
                onChangeText={(v) => set(campo.key, v)}
                placeholder={campo.label} placeholderTextColor="#5f7d69"
              />
              <TouchableOpacity style={s.selectTextoBtn} onPress={() => setPickerField(campo)}>
                <Text style={s.selChev}>▾</Text>
              </TouchableOpacity>
            </View>
          ) : campo.tipo === "documento" ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={String(form[campo.key] ?? "")}
                onChangeText={(v) => set(campo.key, v)}
                onBlur={() => { if (form[campo.key]) set(campo.key, formatarDocumento(form[campo.key])); }}
                placeholder="CPF ou CNPJ" placeholderTextColor="#5f7d69"
                keyboardType="number-pad"
              />
              <TouchableOpacity style={s.buscarBtn} onPress={buscarDocumentoAction} disabled={buscandoDoc}>
                <Text style={s.buscarBtnTxt}>{buscandoDoc ? "…" : "🔎"}</Text>
              </TouchableOpacity>
            </View>
          ) : campo.tipo === "cep" ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={String(form[campo.key] ?? "")}
                onChangeText={(v) => set(campo.key, v)}
                placeholder="CEP" placeholderTextColor="#5f7d69"
                keyboardType="number-pad"
              />
              <TouchableOpacity style={s.buscarBtn} onPress={buscarEnderecoAction} disabled={buscandoCep}>
                <Text style={s.buscarBtnTxt}>{buscandoCep ? "…" : "📍"}</Text>
              </TouchableOpacity>
            </View>
          ) : campo.tipo === "arquivos" ? (
            <View>
              {(Array.isArray(form[campo.key]) ? form[campo.key] : []).map((f, fi) => (
                <View key={fi} style={s.fileRow}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => abrirArquivo(f)}>
                    <Text style={s.fileNome}>📄 {f.nome}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => set(campo.key, (form[campo.key] || []).filter((_, j) => j !== fi))}>
                    <Text style={{ color: C.red, fontWeight: "800", paddingHorizontal: 6 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.fileAdd} onPress={() => anexar(campo.key)}>
                <Text style={s.fileAddTxt}>＋ Anexar PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={[s.input, campo.multi && { minHeight: 70, textAlignVertical: "top" }]}
              value={String(form[campo.key] ?? "")}
              onChangeText={(v) => set(campo.key, v)}
              placeholder={campo.label} placeholderTextColor="#5f7d69"
              keyboardType={campo.tipo === "number" ? "decimal-pad" : "default"}
              multiline={!!campo.multi}
            />
          )}
        </View>
      ))}
      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar</Text></TouchableOpacity>
      {item ? <TouchableOpacity style={s.excluir} onPress={onExcluir}><Text style={s.excluirTxt}>🗑 Excluir</Text></TouchableOpacity> : null}

      <PickerModal
        visible={!!pickerField}
        titulo={pickerField ? "Escolher " + pickerField.label : ""}
        itens={!pickerField ? [] : (pickerField.tipo === "select" || pickerField.tipo === "selectTexto")
          ? (pickerField.opcoes || []).map(o => ({ id: o, label: o }))
          : (refData[pickerField.ref] || []).map(it => ({
              id: it.id,
              label: (ENTIDADES[pickerField.ref].label(it) || "(sem nome)"),
              sub: ENTIDADES[pickerField.ref].sub ? ENTIDADES[pickerField.ref].sub(it) : "",
            }))}
        onSelect={(it) => {
          if (pickerField.tipo === "select" || pickerField.tipo === "selectTexto") { set(pickerField.key, it.label); }
          else { set(pickerField.key, it.label); set(pickerField.key + "Id", it.id); }
          setPickerField(null);
        }}
        onClose={() => setPickerField(null)}
        vazioMsg={pickerField && pickerField.tipo === "ref" ? "Nenhum cadastro em " + ENTIDADES[pickerField.ref].titulo + ". Cadastre primeiro." : "Sem opções."}
      />

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  select: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selectTextoBtn: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginLeft: 8 },
  buscarBtn: { backgroundColor: "#12301F", borderColor: C.green, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 11, marginLeft: 8 },
  buscarBtnTxt: { fontSize: 16 },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  salvar: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  salvarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  fileRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 },
  fileNome: { color: C.blue, fontSize: 14, fontWeight: "600" },
  fileAdd: { backgroundColor: "#1c4a30", borderRadius: 9, paddingVertical: 11, alignItems: "center" },
  fileAddTxt: { color: "#bff0cf", fontWeight: "700" },
  excluir: { backgroundColor: "#3a1f28", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  excluirTxt: { color: C.red, fontSize: 14, fontWeight: "700" },
});
