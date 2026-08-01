import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { mapaHtml } from "../logic/leafletHtml";
import { importarKml } from "../logic/kml";
import { avisar } from "../logic/confirm";
import SalvarTalhaoControl from "../components/SalvarTalhaoControl";
import { C } from "../theme";

export default function MapaScreen({ navigation, route }) {
  const talhao = route.params?.talhao || null;
  const [area, setArea] = useState(talhao?.area || 0);
  const [coords, setCoords] = useState(talhao?.coords || []);
  const [base, setBase] = useState(talhao?.coords || null);
  const [mapKey, setMapKey] = useState(0);

  // Reinicia o mapa toda vez que a tela é aberta (corrige tela sólida ao reentrar).
  useFocusEffect(useCallback(() => { setMapKey((k) => k + 1); }, []));

  async function pedirKml() {
    const r = await importarKml();
    if (r.cancelado) return;
    if (!r.ok) { avisar("Importar KML", r.erro); return; }
    setBase(r.coords);
    setMapKey((k) => k + 1);
    avisar("KML importado!", "Talhão carregado com " + r.coords.length + " pontos. Ajuste os vértices se precisar e salve.");
  }

  useEffect(() => {
    function onMsg(e) {
      try {
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (d && d.tipo === "area") { setArea(d.area || 0); setCoords(d.coords || []); }
        else if (d && d.tipo === "pedirKml") { pedirKml(); }
      } catch (err) {}
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return React.createElement(
    SafeAreaView,
    { edges: ["bottom"], style: { flex: 1, backgroundColor: C.bg } },
    React.createElement("iframe", {
      key: mapKey,
      srcDoc: mapaHtml(base),
      allow: "geolocation",
      style: { border: "none", width: "100%", height: "100%" },
    }),
    React.createElement(SalvarTalhaoControl, { key: "save", navigation, area, coords, talhao })
  );
}
