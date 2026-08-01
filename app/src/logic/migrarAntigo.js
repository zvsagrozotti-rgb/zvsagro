// Migração única: antes da correção do isolamento de armazenamento, o Aegrofin
// (no navegador) usava as MESMAS chaves "dp:"/"fin:" sem prefixo, compartilhadas
// com o AegroPrecisão no mesmo domínio. Dados criados nesse período ficaram
// "escondidos" atrás do novo prefixo "aegrofin::". Aqui trazemos eles de volta,
// uma única vez, sem tocar no que já estiver no namespace novo nem apagar as
// chaves antigas (o AegroPrecisão continua enxergando elas normalmente).
import RealAsyncStorage from "@react-native-async-storage/async-storage";
import AsyncStorage from "./asyncStorage";

const FLAG = "migracao_v1_feita";

export async function migrarArmazenamentoAntigo() {
  try {
    if (await AsyncStorage.getItem(FLAG)) return;

    const todasChaves = (await RealAsyncStorage.getAllKeys()) || [];
    const antigas = todasChaves.filter(
      (k) => k && (k.startsWith("dp:") || k.startsWith("fin:")) && !k.startsWith("aegrofin::")
    );

    if (antigas.length > 0) {
      const pares = await RealAsyncStorage.multiGet(antigas);
      for (const [k, v] of pares) {
        if (v == null) continue;
        const jaTem = await AsyncStorage.getItem(k);
        if (jaTem != null) continue; // não sobrescreve nada que já exista no namespace novo
        await AsyncStorage.setItem(k, v);
      }
    }

    await AsyncStorage.setItem(FLAG, "1");
  } catch (e) {
    // Não trava o boot do app por causa da migração.
  }
}
