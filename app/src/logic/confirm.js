// Confirmação/aviso que funciona no WEB e no celular.
// (No react-native-web o Alert.alert não dispara os botões/onPress.)
import { Platform, Alert } from "react-native";

export function confirmar(titulo, msg, onSim, onNao) {
  if (Platform.OS === "web") {
    const ok = window.confirm((titulo ? titulo + "\n\n" : "") + (msg || ""));
    if (ok) { if (onSim) onSim(); } else { if (onNao) onNao(); }
  } else {
    Alert.alert(titulo, msg, [
      { text: "Cancelar", style: "cancel", onPress: () => { if (onNao) onNao(); } },
      { text: "OK", style: "destructive", onPress: () => { if (onSim) onSim(); } },
    ]);
  }
}

export function avisar(titulo, msg, onOk) {
  if (Platform.OS === "web") {
    window.alert((titulo ? titulo + "\n\n" : "") + (msg || ""));
    if (onOk) onOk();
  } else {
    Alert.alert(titulo, msg, onOk ? [{ text: "OK", onPress: onOk }] : undefined);
  }
}
