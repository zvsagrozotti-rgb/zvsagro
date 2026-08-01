import React, { useState, useCallback, useLayoutEffect, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ENTIDADES } from "../logic/entidades";
import { listar, assinar } from "../logic/store";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

export default function CrudListScreen({ route, navigation }) {
  const { entidade } = route.params;
  const cfg = ENTIDADES[entidade];
  const [itens, setItens] = useState([]);
  const [filtro, setFiltro] = useState("*");
  const [pickOpen, setPickOpen] = useState(false);

  const carregar = useCallback(() => { listar(entidade).then(setItens); }, [entidade]);
  useFocusEffect(carregar);

  // Recarrega sozinho quando outro aparelho muda algo dessa entidade.
  useEffect(() => assinar(entidade, carregar), [entidade, carregar]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: cfg.titulo,
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CrudForm", { entidade })} style={s.add}>
          <Text style={s.addTxt}>＋</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, entidade]);

  const valores = cfg.filtroCampo
    ? [...new Set(itens.map(i => i[cfg.filtroCampo] || "—"))].sort((a, b) => String(a).localeCompare(String(b)))
    : [];
  const filtrados = (cfg.filtroCampo && filtro !== "*")
    ? itens.filter(i => (i[cfg.filtroCampo] || "—") === filtro)
    : itens;
  const ordenar = cfg.ordenar || ((a, b) => String(cfg.label(a) || "").localeCompare(String(cfg.label(b) || "")));
  const ordenados = filtrados.slice().sort(ordenar);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {cfg.filtroCampo && valores.length > 1 ? (
        <View style={s.filtroWrap}>
          <TouchableOpacity style={s.combo} onPress={() => setPickOpen(true)}>
            <Text style={s.comboLbl}>{(cfg.filtroLabel || "Filtro")}:</Text>
            <Text style={s.comboVal} numberOfLines={1}>{filtro === "*" ? "Todos" : filtro}</Text>
            <Text style={s.comboChev}>▾</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={ordenados}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhum {cfg.singular.toLowerCase()} {filtro !== "*" ? "para este filtro" : "cadastrado"}.{filtro === "*" ? "\nToque em ＋ para adicionar." : ""}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate("CrudForm", { entidade, item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{cfg.label(item) || "(sem nome)"}</Text>
              {cfg.sub && cfg.sub(item) ? <Text style={s.sub}>{cfg.sub(item)}</Text> : null}
            </View>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        )}
      />

      <PickerModal
        visible={pickOpen}
        titulo={"Filtrar por " + (cfg.filtroLabel || "")}
        itens={[{ id: "*", label: "Todos" }, ...valores.map(v => ({ id: v, label: v }))]}
        onSelect={(it) => { setFiltro(it.id); setPickOpen(false); }}
        onClose={() => setPickOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  add: { paddingHorizontal: 14 },
  addTxt: { color: "#fff", fontSize: 26, fontWeight: "800" },
  filtroWrap: { padding: 12, borderBottomColor: C.border, borderBottomWidth: 1 },
  combo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11 },
  comboLbl: { color: C.mut, fontSize: 13, fontWeight: "700" },
  comboVal: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 },
  comboChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  nome: { color: C.text, fontSize: 15, fontWeight: "700" },
  sub: { color: C.mut, fontSize: 12, marginTop: 3 },
  chev: { color: C.mut, fontSize: 22, fontWeight: "800" },
});
