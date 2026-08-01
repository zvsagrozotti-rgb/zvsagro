import React from "react";
import { View } from "react-native";
import { mapaViewHtml } from "../logic/leafletHtml";
import { C } from "../theme";

export default function MapaView({ coords, height = 240 }) {
  return React.createElement(
    View,
    { style: { height, borderRadius: 10, overflow: "hidden", backgroundColor: C.bg, borderColor: C.border, borderWidth: 1 } },
    React.createElement("iframe", {
      srcDoc: mapaViewHtml(coords),
      style: { border: "none", width: "100%", height: "100%" },
    })
  );
}
