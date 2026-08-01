// Conexão com o Supabase (banco compartilhado entre todos os aparelhos do usuário).
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wlgggyvfjfspzgixaskw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Le8ZNu0r9-vePn2y6mwmcw_w9wgpNeA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    // Sessão só vive na memória do app enquanto ele está aberto — fechou (app,
    // aba do navegador ou o programa no PC), a sessão some e pede login de novo.
    // Evita que a próxima pessoa a abrir no mesmo aparelho entre direto na
    // conta de quem usou por último.
    persistSession: false,
    detectSessionInUrl: false,
  },
});
