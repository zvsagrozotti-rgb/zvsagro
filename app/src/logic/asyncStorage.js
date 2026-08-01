// Envelope sobre o AsyncStorage real que isola os dados do Aegrofin.
//
// Por quê: no navegador, o AsyncStorage web usa localStorage, que é isolado por
// DOMÍNIO — não por pasta. Como o Aegrofin e o AegroPrecisão ficam hospedados no
// MESMO domínio (warleytavares.github.io/aegrofin/ e /aegroprecisao/), sem esse
// prefixo os dois enxergariam e sobrescreveriam o mesmo armazenamento. No app
// nativo (Android) e no desktop (Electron, porta própria) isso não aconteceria,
// mas o prefixo não atrapalha nesses casos — só garante isolamento sempre.
import RealAsyncStorage from "@react-native-async-storage/async-storage";

const NS = "aegrofin::";
const comNS = (k) => NS + k;
const semNS = (k) => (k.startsWith(NS) ? k.slice(NS.length) : k);

const AsyncStorage = {
  getItem: (key) => RealAsyncStorage.getItem(comNS(key)),
  setItem: (key, value) => RealAsyncStorage.setItem(comNS(key), value),
  removeItem: (key) => RealAsyncStorage.removeItem(comNS(key)),
  async getAllKeys() {
    const keys = await RealAsyncStorage.getAllKeys();
    return (keys || []).filter((k) => k && k.startsWith(NS)).map(semNS);
  },
  async multiGet(keys) {
    const pares = await RealAsyncStorage.multiGet(keys.map(comNS));
    return pares.map(([k, v]) => [semNS(k), v]);
  },
  multiSet: (pares) => RealAsyncStorage.multiSet(pares.map(([k, v]) => [comNS(k), v])),
  multiRemove: (keys) => RealAsyncStorage.multiRemove(keys.map(comNS)),
};

export default AsyncStorage;
