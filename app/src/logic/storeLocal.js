// Armazenamento local offline (AsyncStorage). CRUD simples por "entidade".
import AsyncStorage from "./asyncStorage";

const KEY = (e) => "dp:" + e;

export async function listar(entidade) {
  try {
    const r = await AsyncStorage.getItem(KEY(entidade));
    return r ? JSON.parse(r) : [];
  } catch (e) { return []; }
}

async function salvarTudo(entidade, items) {
  await AsyncStorage.setItem(KEY(entidade), JSON.stringify(items));
}

export async function salvar(entidade, item) {
  const items = await listar(entidade);
  // Marca quando foi a última alteração — usado pelo "Juntar backup de outro
  // aparelho" pra saber qual versão de um mesmo registro é a mais nova.
  item.atualizadoEm = new Date().toISOString();
  if (item.id) {
    const i = items.findIndex(x => x.id === item.id);
    if (i >= 0) items[i] = item; else items.push(item);
  } else {
    item.id = "id" + Date.now() + Math.floor(Math.random() * 1000);
    items.push(item);
  }
  await salvarTudo(entidade, items);
  return item;
}

export async function remover(entidade, id) {
  const items = (await listar(entidade)).filter(x => x.id !== id);
  await salvarTudo(entidade, items);
}

// Apaga TODOS os dados do app (todas as entidades). Para reiniciar testes.
export async function limparTudo() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const meus = (keys || []).filter(k => k && k.startsWith("dp:"));
    if (meus.length) await AsyncStorage.multiRemove(meus);
  } catch (e) {}
}
