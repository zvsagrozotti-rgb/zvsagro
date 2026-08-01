import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, ScrollView, InteractionManager } from "react-native";
import { filtrar, total, TIPOS } from "../logic/agrofit";
import { salvar } from "../logic/store";
import { avisar } from "../logic/confirm";
import { C } from "../theme";

export default function CatalogoScreen({ navigation }) {
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [sel, setSel] = useState(null);

  useEffect(() => {
    const t = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => t.cancel && t.cancel();
  }, []);

  const lista = useMemo(() => (ready ? filtrar({ q, tipo }) : []), [ready, q, tipo]);

  async function adicionar(p) {
    await salvar("produtos", {
      nome: p.n, tipo: p.t || "", formulacao: p.fc || "", classe: p.ct || "",
      observacao: [
        "Ingrediente ativo: " + p.i, "Formulação: " + p.f,
        p.c ? "Classe: " + p.c : "", p.ct ? "Classe toxicológica: " + p.ct : "",
        p.ca ? "Classe ambiental: " + p.ca : "", p.ma ? "Modo de ação: " + p.ma : "",
        p.emp ? "Empresa: " + p.emp : "",
        (p.cul && p.cul.length) ? "Culturas registradas: " + p.cul.join(", ") : "",
        (p.prg && p.prg.length) ? "Pragas-alvo: " + p.prg.join(", ") : "",
        "Registro MAPA nº " + p.r + " · Fonte: AGROFIT/MAPA",
      ].filter(Boolean).join("\n"),
      em: new Date().toISOString(),
    });
    setSel(null);
    avisar("Adicionado", "\"" + p.n + "\" foi para os seus Produtos. Defina a dose pela bula.");
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.filtros}>
        <TextInput style={s.input} value={q} onChangeText={setQ}
          placeholder={"Buscar em " + total().toLocaleString("pt-BR") + " produtos (nome, ingrediente, cultura, praga)…"}
          placeholderTextColor="#5f7d69" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
          <Chip label="Todos" ativo={tipo === ""} onPress={() => setTipo("")} />
          {TIPOS.map((t) => <Chip key={t} label={t} ativo={tipo === t} onPress={() => setTipo(t)} />)}
        </ScrollView>
        {ready ? <Text style={s.cont}>{lista.length.toLocaleString("pt-BR")} produto(s)</Text> : null}
      </View>

      {!ready ? (
        <Text style={s.carregando}>Carregando catálogo oficial…</Text>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => item.r}
          initialNumToRender={15}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} onPress={() => setSel(item)}>
              <Text style={s.rNome}>{item.n}</Text>
              <Text style={s.rIng} numberOfLines={2}>{item.i}</Text>
              <View style={s.rTags}>
                <Text style={s.tag}>{item.c || item.t}</Text>
                {item.fc ? <Text style={[s.tag, s.tagForm]}>{item.fc}</Text> : null}
                {item.cul && item.cul.length ? <Text style={[s.tag, s.tagCul]}>{item.cul.length} culturas</Text> : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.carregando}>Nenhum produto encontrado.</Text>}
        />
      )}

      <Modal visible={!!sel} animationType="slide" onRequestClose={() => setSel(null)}>
        {sel ? (
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={s.dTop}>
              <Text style={s.dTitulo} numberOfLines={2}>{sel.n}</Text>
              <TouchableOpacity onPress={() => setSel(null)}><Text style={s.fechar}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Campo l="Ingrediente ativo" v={sel.i} />
              <Campo l="Tipo / Classe" v={[sel.c, sel.t].filter(Boolean).join(" · ")} />
              <Campo l="Formulação" v={sel.f + (sel.fc ? "  (" + sel.fc + ")" : "")} />
              <Campo l="Modo de ação" v={sel.ma} />
              <Campo l="Classe toxicológica" v={sel.ct} />
              <Campo l="Classe ambiental" v={sel.ca} />
              <Campo l="Empresa / titular" v={sel.emp} />
              <Campo l={"Culturas registradas (" + (sel.cul ? sel.cul.length : 0) + ")"} v={sel.cul && sel.cul.length ? sel.cul.join(", ") : "—"} />
              <Campo l={"Pragas-alvo (" + (sel.prg ? sel.prg.length : 0) + ")"} v={sel.prg && sel.prg.length ? sel.prg.join(", ") : "—"} />
              <Campo l="Registro MAPA" v={"nº " + sel.r + " · Fonte: AGROFIT/MAPA"} />
              <Text style={s.aviso}>⚠️ A dose de aplicação NÃO consta no AGROFIT — consulte a bula do produto.</Text>
              <TouchableOpacity style={s.add} onPress={() => adicionar(sel)}>
                <Text style={s.addTxt}>＋ Adicionar aos meus produtos</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Chip({ label, ativo, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.chip, ativo && s.chipOn]}>
      <Text style={[s.chipTxt, ativo && s.chipTxtOn]}>{label}</Text>
    </TouchableOpacity>
  );
}
function Campo({ l, v }) {
  if (!v) return null;
  return (
    <View style={s.campo}>
      <Text style={s.campoL}>{l}</Text>
      <Text style={s.campoV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  filtros: { paddingHorizontal: 12, paddingTop: 10, borderBottomColor: C.border, borderBottomWidth: 1, backgroundColor: C.card },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 10, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  cont: { color: C.mut, fontSize: 11, paddingBottom: 8 },
  chip: { borderColor: C.line, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { color: C.mut, fontSize: 12, fontWeight: "700" },
  chipTxtOn: { color: "#06210b" },
  carregando: { color: C.mut, textAlign: "center", marginTop: 40, fontSize: 14 },
  row: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rNome: { color: C.text, fontSize: 15, fontWeight: "700" },
  rIng: { color: C.mut, fontSize: 12, marginTop: 3, lineHeight: 16 },
  rTags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { color: "#bff0cf", backgroundColor: "#1c4a30", fontSize: 10, fontWeight: "700", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  tagForm: { color: "#cfe0ff", backgroundColor: "#22406a" },
  tagCul: { color: "#f0e6bf", backgroundColor: "#4a3f16" },
  dTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 44, borderBottomColor: C.border, borderBottomWidth: 1, backgroundColor: C.card },
  dTitulo: { color: C.text, fontSize: 18, fontWeight: "800", flex: 1, marginRight: 10 },
  fechar: { color: C.mut, fontSize: 22, paddingHorizontal: 8 },
  campo: { marginBottom: 12 },
  campoL: { color: C.greenClaro, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  campoV: { color: C.text, fontSize: 14, lineHeight: 20 },
  aviso: { color: "#ffe08a", fontSize: 12, backgroundColor: "#3a3410", borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 14, lineHeight: 17 },
  add: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  addTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
