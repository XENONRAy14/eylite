'use client';

import type { ReactNode } from 'react';
import { cnedStates, money, programs, type Kind, type RecordRow } from '@/lib/model';
import { Pick, type PickOption } from './primitives';

export function RecordFields({ kind, form, set, rows }: { kind: Kind; form: Record<string, unknown>; set: (key: string, value: unknown) => void; rows: RecordRow[] }) {
  const byKind = <K extends Kind>(value: K) => rows.filter((row) => row.kind === value) as RecordRow<K>[];

  const field = (key: string, label: string, type = 'text', required = true) => (
    <label key={key}>{label}<input type={type} required={required} value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value)} step={type === 'number' ? '0.01' : undefined} maxLength={type === 'text' ? 300 : undefined} /></label>
  );

  const pick = (key: string, label: string, options: PickOption[]) => (
    <label key={key}>{label}<Pick value={String(form[key] ?? '')} onChange={(value) => set(key, value)} options={options} label={label} /></label>
  );

  const student = pick('student', 'Élève', byKind('students').map((row) => ({ id: row.id, name: row.data.name })));
  const group = pick('group', 'Classe / groupe', byKind('groups').map((row) => ({ id: row.id, name: row.data.name })));
  const campuses = [...new Set(rows.flatMap((row) => 'campus' in row.data ? [row.data.campus] : []))];
  const campus = pick('campus', 'Campus', campuses.length ? campuses : ['Campus principal']);
  const name = field('name', 'Nom et prénom');
  const subject = field('subject', 'Matière');
  const due = field('due', 'Date limite', 'date');
  const title = field('title', 'Intitulé');
  let fields: ReactNode[] = [];

  switch (kind) {
    case 'students':
      fields = [name, group, pick('program', 'Programme', programs), field('guardian', 'Responsable légal', 'text', false), field('phone', 'Téléphone', 'tel', false), pick('status', 'Statut', ['Actif', 'Préinscrit', 'Archivé'])];
      break;
    case 'teachers':
      fields = [name, subject, field('phone', 'Téléphone', 'tel', false)];
      break;
    case 'groups':
      fields = [field('name', 'Nom du groupe'), pick('program', 'Programme', programs), field('capacity', 'Capacité', 'number')];
      break;
    case 'sessions':
      fields = [subject, group, pick('teacher', 'Enseignant', byKind('teachers').map((row) => ({ id: row.id, name: row.data.name }))), field('room', 'Salle'), field('date', 'Date', 'date'), field('start', 'Début', 'time'), field('end', 'Fin', 'time')];
      break;
    case 'grades':
      fields = [student, subject, title, field('score', 'Note', 'number'), field('scale', 'Barème', 'number'), field('coefficient', 'Coefficient', 'number'), pick('source', 'Origine', ['INTERNAL', 'CNED', 'OFFICIAL_EXAM', 'EXTERNAL'])];
      break;
    case 'homework':
      fields = [title, subject, group, due, <label key="instructions">Consignes<textarea value={String(form.instructions || '')} onChange={(event) => set('instructions', event.target.value)} maxLength={1000} /></label>];
      break;
    case 'cned':
      fields = [student, subject, title, pick('formula', 'Formule CNED', ['Classe complète réglementée', 'Classe complète libre', 'Cours à la carte réglementés', 'Cours à la carte libres', 'Scolarité complémentaire internationale']), due, pick('status', 'Statut', cnedStates), field('score', 'Note CNED / 20 (facultatif)', 'number', false)];
      break;
    case 'invoices':
      fields = [student, field('label', 'Libellé'), field('amount', 'Montant (DA)', 'number'), due];
      break;
    case 'payments':
      fields = [student, pick('invoice', 'Échéance', byKind('invoices').filter((row) => row.data.student === form.student).map((row) => ({ id: row.id, name: `${row.data.label} · ${money(row.data.amount)}` }))), field('amount', 'Montant reçu (DA)', 'number'), pick('method', 'Mode de règlement', ['Espèces', 'Chèque', 'Virement', 'CCP', 'BaridiMob', 'BaridPay', 'CIB', 'Edahabia', 'Autre']), field('date', 'Date du paiement', 'date')];
      break;
    case 'leads':
      fields = [name, pick('program', 'Programme', programs), field('phone', 'Téléphone', 'tel', false), pick('source', 'Source', ['Facebook', 'Instagram', 'Téléphone', 'Recommandation', 'Passage sur place', 'Site', 'Autre']), pick('status', 'Étape', ['Prospect', 'Contacté', 'Dossier incomplet', 'Dossier complet', 'Accepté', 'Inscrit'])];
      break;
    case 'announcements':
      fields = [title, <label key="body">Message<textarea required value={String(form.body || '')} onChange={(event) => set('body', event.target.value)} maxLength={300} /></label>, pick('target', 'Destinataires', ['Tous', 'Parents', 'Enseignants', 'Élèves'])];
      break;
  }

  return <div className="fields">{fields}{campus}</div>;
}
