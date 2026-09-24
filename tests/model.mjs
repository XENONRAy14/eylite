import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = process.cwd();
const tmp = path.join(root, '.sites-runtime/test-model');
fs.mkdirSync(tmp, { recursive: true });

function compile(file, out, change = (value) => value) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  fs.writeFileSync(path.join(tmp, out), change(source));
}

compile('lib/model.ts', 'model.mjs');
compile('lib/display.ts', 'display.mjs');
compile('lib/seed.ts', 'seed.mjs', (source) => source.replaceAll("'./model'", "'./model.mjs'"));

const model = await import(pathToFileURL(path.join(tmp, 'model.mjs')));
const display = await import(pathToFileURL(path.join(tmp, 'display.mjs')));
const { demoRecords } = await import(pathToFileURL(path.join(tmp, 'seed.mjs')));

assert.equal(model.schemas.sessions.safeParse({ subject: 'Maths', group: 'g1', teacher: 't1', room: 'S1', date: '2026-09-23', start: '10:00', end: '08:00', campus: 'Centre' }).success, false);
assert.equal(model.schemas.grades.safeParse({ student: 's1', subject: 'Maths', title: 'Contrôle', score: 25, scale: 20, coefficient: 1, source: 'INTERNAL', campus: 'Centre' }).success, false);
assert.equal(model.schemas.payments.safeParse({ student: 's1', invoice: 'i1', amount: 500, method: 'Espèces', date: '2026-09-23', campus: 'Centre' }).success, true);
assert.equal(display.initials('Naima Zerrouki'), 'NZ');
assert.equal(display.weekDates('2026-09-23').length, 7);
assert.equal(display.weekDates('2026-09-23')[0], '2026-09-20');

const rows = demoRecords();
const groupIds = new Set(rows.filter((row) => row.kind === 'groups').map((row) => row.id));
const teacherIds = new Set(rows.filter((row) => row.kind === 'teachers').map((row) => row.id));
assert.ok(rows.filter((row) => row.kind === 'students').every((row) => groupIds.has(row.data.group)));
assert.ok(rows.filter((row) => row.kind === 'sessions').every((row) => groupIds.has(row.data.group) && teacherIds.has(row.data.teacher)));
assert.ok(rows.filter((row) => row.kind === 'homework').every((row) => groupIds.has(row.data.group)));

console.log('PASS: 10 model checks — validation Zod, dates, semaine, initiales et références immuables.');
