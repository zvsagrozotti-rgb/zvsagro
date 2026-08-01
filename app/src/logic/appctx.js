import React from "react";
// Contexto global: recarregar estado (sessão) e sair.
export const AppCtx = React.createContext({ recarregar: async () => {}, sair: async () => {} });
