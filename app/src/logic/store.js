// Armazenamento dos cadastros/aplicações — nesta variante ONLINE, os dados
// moram no Supabase (banco compartilhado entre aparelhos), mas passam por um
// cache local + fila de pendências (syncStore.js): funciona offline e
// sincroniza sozinho quando a conexão volta. A versão puramente local
// original fica em storeLocal.js, sem uso por enquanto; a versão só-online
// (sem cache/fila) fica em onlineStore.js.
export { listar, salvar, remover, assinar, sincronizar, pendentes, assinarStatus, iniciarAutoSync } from "./syncStore";
