import React, { useState, useRef, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
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
  const webRef = useRef(null);
  const loc = useRef(null);
  const loaded = useRef(false);
  const baseRef = useRef(base);
  baseRef.current = base;

  // Reinicia o mapa toda vez que a tela é aberta (corrige tela sólida ao reentrar).
  useFocusEffect(useCallback(() => {
    loaded.current = false;
    setMapKey((k) => k + 1);
  }, []));

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        loc.current = [p.coords.latitude, p.coords.longitude];
        irParaLocal();
      } catch (e) {}
    })();
  }, []);

  function irParaLocal() {
    if (!webRef.current || !loc.current || !loaded.current) return;
    const b = baseRef.current;
    if (b && b.length > 2) return; // já tem polígono no mapa — não recentraliza
    const [la, ln] = loc.current;
    webRef.current.injectJavaScript(
      "try{ if(window.map){ map.setView([" + la + "," + ln + "],16);" +
      " if(window.__me){map.removeLayer(window.__me);}" +
      " window.__me=L.circleMarker([" + la + "," + ln + "],{radius:7,color:'#16A34A',fillColor:'#34D399',fillOpacity:1,weight:2}).addTo(map);" +
      " } }catch(e){} true;"
    );
  }

  async function pedirKml() {
    const r = await importarKml();
    if (r.cancelado) return;
    if (!r.ok) { avisar("Importar KML", r.erro); return; }
    loaded.current = false;
    setBase(r.coords);
    setMapKey((k) => k + 1);
    avisar("KML importado!", "Talhão carregado com " + r.coords.length + " pontos. Arraste os vértices se precisar e toque em Salvar.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["bottom"]}>
      <WebView
        key={mapKey}
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: mapaHtml(base) }}
        style={{ flex: 1, backgroundColor: C.bg }}
        geolocationEnabled
        onLoadEnd={() => { loaded.current = true; irParaLocal(); }}
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d && d.tipo === "area") { setArea(d.area || 0); setCoords(d.coords || []); }
            else if (d && d.tipo === "pedirKml") { pedirKml(); }
          } catch (err) {}
        }}
      />
      <SalvarTalhaoControl navigation={navigation} area={area} coords={coords} talhao={talhao} />
    </SafeAreaView>
  );
}
