import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, assinar } from "../logic/store";
import { ENTIDADES } from "../logic/entidades";
import { C } from "../theme";

export default function FrotaScreen({ navigation }) {
  const [veiculos, setVeiculos] = useState([]);

  const carregar = useCallback(() => { listar("veiculos").then(setVeiculos); }, []);
  useFocusEffect(carregar);
  React.useEffect(() => assinar("veiculos", carregar), [carregar]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Frota",
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CrudForm", { entidade: "veiculos" })} style={s.add}>
          <Text style={s.addTxt}>＋</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const cfg = ENTIDADES.veiculos;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={veiculos}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhum veículo cadastrado.{"\n"}Toque em ＋ para adicionar.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate("VeiculoDetail", { veiculo: item })}>
            <Text style={s.icon}>{cfg.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{cfg.label(item)}</Text>
              {cfg.sub(item) ? <Text style={s.sub}>{cfg.sub(item)}</Text> : null}
            </View>
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  add: { paddingHorizontal: 14 },
  addTxt: { color: "#fff", fontSize: 26, fontWeight: "800" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  icon: { fontSize: 24, marginRight: 12 },
  nome: { color: C.text, fontSize: 15, fontWeight: "700" },
  sub: { color: C.mut, fontSize: 12, marginTop: 3 },
  chev: { color: C.mut, fontSize: 22, fontWeight: "800" },
});
