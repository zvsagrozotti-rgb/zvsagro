// Teste das regras de saldo: node --no-warnings test/saldo.test.mjs
import { resumoFuncionario, idsParaFechar, gastoPorFuncionario } from "../src/logic/saldo.js";
import assert from "node:assert/strict";

const cr = [{ id: "c1", funcionarioId: "f1", valor: 1000 }, { id: "c2", funcionarioId: "f2", valor: 500 }, { id: "c0", funcionarioId: "f1", valor: 300, fechadoEm: "2026-09-30" }];
const cp = [
  { id: "p1", funcionarioId: "f1", tipo: "Combustível", valor: "250,50", data: "2026-10-02" },
  { id: "p2", funcionarioId: "f1", tipo: "Alimentação", valor: 40, data: "2026-10-05" },
  { id: "p3", funcionarioId: "f1", tipo: "Alimentação", valor: 99, fechadoEm: "2026-09-30", data: "2026-09-10" },
  { id: "p4", funcionarioId: "f2", tipo: "Alimentação", valor: 600, data: "2026-10-06" },
];
let r = resumoFuncionario("f1", cr, cp);
assert.equal(r.adiantado, 1000); assert.equal(r.gasto, 290.5); assert.equal(r.saldo, 709.5);
assert.deepEqual(r.porTipo, { "Combustível": 250.5, "Alimentação": 40 });
r = resumoFuncionario("f2", cr, cp); assert.equal(r.saldo, -100); // gastou mais que o adiantado
const f = idsParaFechar("f1", cr, cp);
assert.deepEqual(f.creditos, ["c1"]); assert.deepEqual(f.cupons, ["p1", "p2"]);
assert.deepEqual(gastoPorFuncionario(cp, "2026-10-01", "2026-10-31"), { f1: 290.5, f2: 600 });
console.log("saldo ok");
