import React from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { mapaViewHtml } from "../logic/leafletHtml";
import { C } from "../theme";

export default function MapaView({ coords, height = 240 }) {
  return (
    <View style={{ height, borderRadius: 10, overflow: "hidden", backgroundColor: C.bg, borderColor: C.border, borderWidth: 1 }}>
      <WebView originWhitelist={["*"]} source={{ html: mapaViewHtml(coords) }} style={{ flex: 1, backgroundColor: C.bg }} />
    </View>
  );
}
