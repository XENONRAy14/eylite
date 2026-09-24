'use client';

import type { ReactNode } from 'react';
import { ArrowRight, ChevronRight, Clock, Layers, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TableCell, TableRow } from '@/components/ui/table';
import { initials } from '@/lib/display';
import type { DataByKind, RecordRow } from '@/lib/model';
import { DataTable, Pill } from './primitives';

type EditHandler<K extends keyof DataByKind> = (row: RecordRow<K>) => void;

export function StudentsView({ rows, tools, groupName, onDetail, onEdit }: { rows: RecordRow<'students'>[]; tools: ReactNode; groupName: (id: string) => string; onDetail: (row: RecordRow<'students'>) => void; onEdit: EditHandler<'students'> }) {
  return (
    <section className="panel">
      {tools}
      <DataTable headers={['Élève', 'Programme', 'Classe / groupe', 'Campus', 'Statut', '']}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <button className="person" onClick={() => onDetail(row)}>
                <span className="avatar">{initials(row.data.name)}</span>
                <div><strong>{row.data.name}</strong><small>EYL-{row.id.slice(0, 8).toUpperCase()}</small></div>
              </button>
            </TableCell>
            <TableCell>{row.data.program}</TableCell>
            <TableCell>{groupName(row.data.group)}</TableCell>
            <TableCell>{row.data.campus}</TableCell>
            <TableCell><Pill tone={row.data.status === 'Actif' ? 'green' : 'gray'}>{row.data.status}</Pill></TableCell>
            <TableCell><button className="text-button" onClick={() => onEdit(row)}>Modifier <ChevronRight size={15} /></button></TableCell>
          </TableRow>
        ))}
      </DataTable>
      {!rows.length && <div className="empty compact">Aucun élève ne correspond à votre recherche.</div>}
      <div className="table-bottom">{rows.length} élèves · les dossiers archivés conservent leur historique</div>
    </section>
  );
}

export function GroupsView({ rows, students, tools, onEdit }: { rows: RecordRow<'groups'>[]; students: RecordRow<'students'>[]; tools: ReactNode; onEdit: EditHandler<'groups'> }) {
  return (
    <>
      {tools}
      <div className="card-grid">
        {rows.map((row, index) => {
          const count = students.filter((student) => student.data.group === row.id).length;
          return (
            <section className="panel group-card" key={row.id}>
              <div className="group-top"><span className={`notice-icon ${['green', 'blue', 'purple', 'orange'][index % 4]}`}><Layers size={24} /></span><Pill tone="gray">{row.data.campus}</Pill></div>
              <h2>{row.data.name}</h2>
              <p>{row.data.program}</p>
              <div className="capacity"><b>{count} élèves</b><span>Capacité : {row.data.capacity}</span></div>
              <Progress value={count / row.data.capacity * 100} />
              <button className="panel-footer" onClick={() => onEdit(row)}>Gérer le groupe <ArrowRight size={16} /></button>
            </section>
          );
        })}
      </div>
    </>
  );
}

export function TeachersView({ rows, tools, onEdit }: { rows: RecordRow<'teachers'>[]; tools: ReactNode; onEdit: EditHandler<'teachers'> }) {
  return (
    <section className="panel">
      {tools}
      <DataTable headers={['Enseignant', 'Matière', 'Campus', 'Téléphone', '']}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell><div className="person"><span className="avatar">{initials(row.data.name)}</span><strong>{row.data.name}</strong></div></TableCell>
            <TableCell>{row.data.subject}</TableCell>
            <TableCell>{row.data.campus}</TableCell>
            <TableCell>{row.data.phone || 'Non renseigné'}</TableCell>
            <TableCell><button className="text-button" onClick={() => onEdit(row)}>Modifier</button></TableCell>
          </TableRow>
        ))}
      </DataTable>
    </section>
  );
}

export function HomeworkView({ rows, tools, groupName, onEdit }: { rows: RecordRow<'homework'>[]; tools: ReactNode; groupName: (id: string) => string; onEdit: EditHandler<'homework'> }) {
  return (
    <>
      {tools}
      <div className="card-grid">
        {rows.map((row) => (
          <section className="panel homework-card" key={row.id}>
            <Pill tone="blue">{groupName(row.data.group)}</Pill>
            <small>{row.data.subject}</small>
            <h2>{row.data.title}</h2>
            <p>{row.data.instructions}</p>
            <div className="due"><Clock size={16} />Pour le {row.data.due.split('-').reverse().join('/')}</div>
            <button className="panel-footer" onClick={() => onEdit(row)}>Modifier le devoir <ArrowRight size={16} /></button>
          </section>
        ))}
      </div>
    </>
  );
}

export function LeadsView({ rows, tools, onEdit }: { rows: RecordRow<'leads'>[]; tools: ReactNode; onEdit: EditHandler<'leads'> }) {
  const statuses: DataByKind['leads']['status'][] = ['Prospect', 'Contacté', 'Dossier incomplet', 'Dossier complet', 'Accepté', 'Inscrit'];
  return (
    <>
      {tools}
      <div className="kanban">
        {statuses.map((status) => {
          const candidates = rows.filter((row) => row.data.status === status);
          return (
            <section className="kanban-column" key={status}>
              <h3>{status}<span>{candidates.length}</span></h3>
              {candidates.map((row) => (
                <button className="lead-card" key={row.id} onClick={() => onEdit(row)}>
                  <span className="avatar">{initials(row.data.name)}</span>
                  <strong>{row.data.name}</strong>
                  <p>{row.data.program}</p>
                  <small>{row.data.source}</small>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function AnnouncementsView({ rows, onEdit }: { rows: RecordRow<'announcements'>[]; onEdit: EditHandler<'announcements'> }) {
  return (
    <div className="announcements">
      {rows.map((row) => (
        <article className="panel announcement" key={row.id}>
          <div className="panel-head"><span className="notice-icon green"><MessageSquare size={20} /></span><Pill tone="blue">{row.data.target}</Pill></div>
          <h2>{row.data.title}</h2>
          <p>{row.data.body}</p>
          <div className="announcement-footer"><span>{row.data.campus} · annonce interne</span><button className="text-button" onClick={() => onEdit(row)}>Modifier</button></div>
        </article>
      ))}
    </div>
  );
}
