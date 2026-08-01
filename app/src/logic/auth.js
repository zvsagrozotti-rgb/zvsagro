// Autenticação local (offline). Padrão na 1ª instalação: admin / admin.
// Guardado em "ap:" para não ser apagado por limparTudo() (que só mexe em "dp:").
import AsyncStorage from "./asyncStorage";
import * as Crypto from "expo-crypto";

const K_AUTH = "ap:auth";
// Sessão só na memória: some quando o app é fechado → pede senha a cada abertura.
let sessaoAtiva = false;

async function hash(user, senha) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    "aegro-v1|" + String(user).toLowerCase().trim() + "|" + String(senha)
  );
}

export async function lerAuth() {
  try { const r = await AsyncStorage.getItem(K_AUTH); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}

// Garante o usuário padrão admin/admin na primeira vez.
export async function garantirAuthPadrao() {
  const a = await lerAuth();
  if (!a) {
    const h = await hash("admin", "admin");
    await AsyncStorage.setItem(K_AUTH, JSON.stringify({ user: "admin", hash: h }));
  }
}

export async function autenticar(user, senha) {
  const a = await lerAuth();
  if (!a) return false;
  if (String(user).toLowerCase().trim() !== a.user.toLowerCase()) return false;
  const h = await hash(user, senha);
  return h === a.hash;
}

// Troca usuário e/ou senha (exige a senha atual).
export async function trocarSenha(senhaAtual, novoUser, novaSenha) {
  const a = await lerAuth();
  if (!a) return { ok: false, erro: "Sem cadastro." };
  const ok = await autenticar(a.user, senhaAtual);
  if (!ok) return { ok: false, erro: "Senha atual incorreta." };
  const u = (novoUser || a.user).trim();
  if (!u) return { ok: false, erro: "Informe o usuário." };
  if (!novaSenha) return { ok: false, erro: "Informe a nova senha." };
  const h = await hash(u, novaSenha);
  await AsyncStorage.setItem(K_AUTH, JSON.stringify({ user: u, hash: h }));
  return { ok: true, user: u };
}

export async function iniciarSessao() { sessaoAtiva = true; }
export async function encerrarSessao() { sessaoAtiva = false; }
export async function temSessao() { return sessaoAtiva; }
