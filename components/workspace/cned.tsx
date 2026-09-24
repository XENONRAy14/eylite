'use client';

import { ChevronRight, Globe } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import type { RecordRow } from '@/lib/model';
import { DataTable, Pill } from './primitives';

const submitted = ['Envoyé', 'Correction en attente', 'Corrigé'];

export function CnedView({ rows, late, studentName, onEdit }: { rows: RecordRow<'cned'>[]; late: RecordRow<'cned'>[]; studentName: (id: string) => string; onEdit: (row: RecordRow<'cned'>) => void }) {
  return (
    <>
      <div className="cned-banner">
        <div className="cned-badge"><Globe size={28} /></div>
        <div><h2>Un suivi clair, matière par matière.</h2><p>Accompagnement local · le dépôt des copies reste sur le CNED.</p></div>
        <div className="cned-progress"><b>{rows.filter((row) => submitted.includes(row.data.status)).length} / {rows.length}</b><span>devoirs transmis</span></div>
      </div>
      <section className="panel">
        <div className="panel-head"><h2>Devoirs & corrections</h2><Pill tone="orange">{late.length} en retard</Pill></div>
        <DataTable headers={['Élève', 'Matière / devoir', 'Échéance', 'Statut', 'Note CNED', '']}>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell><strong>{studentName(row.data.student)}</strong><small className="block muted">{row.data.formula}</small></TableCell>
              <TableCell>{row.data.subject}<small className="block muted">{row.data.title}</small></TableCell>
              <TableCell>{row.data.due.split('-').reverse().join('/')}</TableCell>
              <TableCell><Pill tone={row.data.status === 'Corrigé' ? 'green' : row.data.status === 'Envoyé' ? 'blue' : 'orange'}>{row.data.status}</Pill></TableCell>
              <TableCell>{row.data.score !== '' ? `${row.data.score} / 20` : '—'}</TableCell>
              <TableCell><button className="text-button" onClick={() => onEdit(row)}>Mettre à jour <ChevronRight size={15} /></button></TableCell>
            </TableRow>
          ))}
        </DataTable>
      </section>
    </>
  );
}
