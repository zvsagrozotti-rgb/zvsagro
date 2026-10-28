// Teste do uso de veículos: node --no-warnings test/uso.test.mjs
import assert from "node:assert/strict";

// As regras puras ficam no mesmo arquivo da gravação; para testar sem o app, extrai só as funções puras.
import { readFileSync } from "node:fs";
const fonte = readFileSync(new URL("../src/logic/usoVeiculo.js", import.meta.url), "utf8");
const puro = fonte.slice(fonte.indexOf("export function usoAberto"), fonte.indexOf("// ---- gravação ----"));
const { usoAberto, historicoDoVeiculo, quemUsavaEm } = await import("data:text/javascript," + encodeURIComponent(puro));

const usos = [
  { id: "1", veiculoId: "v1", funcionarioId: "f1", funcionarioNome: "Ana", inicio: "2026-10-01", fim: "2026-10-10" },
  { id: "2", veiculoId: "v1", funcionarioId: "f2", funcionarioNome: "Bruno", inicio: "2026-10-10", fim: null },
  { id: "3", veiculoId: "v2", funcionarioId: "f1", funcionarioNome: "Ana", inicio: "2026-10-05", fim: null },
];
assert.equal(usoAberto(usos, "v1").funcionarioNome, "Bruno");
assert.equal(usoAberto(usos, "v3"), null);
assert.deepEqual(historicoDoVeiculo(usos, "v1").map((u) => u.id), ["2", "1"]);
assert.equal(quemUsavaEm(usos, "v1", "2026-10-05").funcionarioNome, "Ana");
assert.equal(quemUsavaEm(usos, "v1", "2026-10-20").funcionarioNome, "Bruno");
assert.equal(quemUsavaEm(usos, "v1", "2026-09-01"), null);
console.log("uso ok");
