import React, { useLayoutEffect } from "react";
import { TouchableOpacity, Text } from "react-native";
import { salvar } from "../logic/store";
import { confirmar, avisar } from "../logic/confirm";
import { C } from "../theme";

// Botão "Salvar" no header do mapa.
//  - Talhão NOVO → abre a tela de nomear/vincular.
//  - Talhão EXISTENTE (edição) → atualiza o desenho (área + contorno) direto.
export default function SalvarTalhaoControl({ navigation, area, coords, talhao }) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ paddingHorizontal: 14 }}
          onPress={() => {
            if (!area || !coords || !coords.length) { avisar("Atenção", "Desenhe o talhão no mapa primeiro."); return; }
            if (talhao && talhao.id) {
              confirmar("Salvar alterações", "Atualizar o desenho do talhão \"" + talhao.nome + "\"?", async () => {
                const ha = Number((area || 0).toFixed(2));
                await salvar("talhoes", { ...talhao, area: ha, coords });
                avisar("Salvo!", "Talhão atualizado — " + ha + " ha.", () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }));
              });
            } else {
              navigation.navigate("SalvarTalhao", { area, coords });
            }
          }}
        >
          <Text style={{ color: C.green, fontWeight: "800", fontSize: 15 }}>💾 Salvar</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, area, coords, talhao]);
  return null;
}
