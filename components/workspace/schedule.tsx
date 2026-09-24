'use client';

import { ClipboardCheck } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { initials } from '@/lib/display';
import type { DataByKind, RecordRow } from '@/lib/model';
import { DataTable, Pick, Pill } from './primitives';

const attendanceStatuses: DataByKind['attendance']['status'][] = ['Présent', 'Absent', 'Retard', 'Excusé', 'Sortie anticipée', 'Absence justifiée'];

export function SessionsView({ rows, date, setDate, groupName, teacherName, onEdit, onCall }: { rows: RecordRow<'sessions'>[]; date: string; setDate: (date: string) => void; groupName: (id: string) => string; teacherName: (id: string) => string; onEdit: (row: RecordRow<'sessions'>) => void; onCall: (row: RecordRow<'sessions'>) => void }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div><h2>Planning des séances</h2><span className="muted">Contrôle des conflits à chaque enregistrement</span></div>
        <input type="date" className="date-input" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <DataTable headers={['Horaire', 'Matière', 'Classe / groupe', 'Enseignant', 'Salle', '']}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell><b>{row.data.start} – {row.data.end}</b></TableCell>
            <TableCell>{row.data.subject}</TableCell>
            <TableCell>{groupName(row.data.group)}</TableCell>
            <TableCell>{teacherName(row.data.teacher)}</TableCell>
            <TableCell>{row.data.room}</TableCell>
            <TableCell><div className="row-actions"><button className="text-button" onClick={() => onEdit(row)}>Modifier</button><button className="button secondary" onClick={() => onCall(row)}>Faire l’appel</button></div></TableCell>
          </TableRow>
        ))}
      </DataTable>
      {!rows.length && <div className="empty compact">Aucune séance. Ajoutez un cours pour cette date.</div>}
    </section>
  );
}

export function AttendanceView({
  sessions,
  currentSession,
  students,
  attendance,
  groupName,
  date,
  setDate,
  setSelectedSession,
  onStatus,
}: {
  sessions: RecordRow<'sessions'>[];
  currentSession?: RecordRow<'sessions'>;
  students: RecordRow<'students'>[];
  attendance: RecordRow<'attendance'>[];
  groupName: (id: string) => string;
  date: string;
  setDate: (date: string) => void;
  setSelectedSession: (id: string) => void;
  onStatus: (student: RecordRow<'students'>, current: RecordRow<'attendance'> | undefined, status: DataByKind['attendance']['status']) => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div><h2>Feuille d’appel</h2><span className="muted">Chaque statut est enregistré individuellement</span></div>
        <div className="row-actions">
          <input type="date" className="date-input" value={date} onChange={(event) => setDate(event.target.value)} />
          <Pick value={currentSession?.id || ''} onChange={setSelectedSession} options={sessions.map((row) => ({ id: row.id, name: `${row.data.start} · ${row.data.subject} · ${groupName(row.data.group)}` }))} label="Séance" />
        </div>
      </div>
      {currentSession ? (
        <>
          <div className="call-summary"><ClipboardCheck size={20} /><strong>{currentSession.data.subject} · {groupName(currentSession.data.group)}</strong><span>{students.length} élèves</span></div>
          <DataTable headers={['Élève', 'Statut de présence']}>
            {students.map((student) => {
              const current = attendance.find((row) => row.data.student === student.id && row.data.session === currentSession.id);
              return (
                <TableRow key={student.id}>
                  <TableCell><div className="person"><span className="avatar">{initials(student.data.name)}</span><strong>{student.data.name}</strong></div></TableCell>
                  <TableCell><Pick value={current?.data.status || ''} options={attendanceStatuses} label="Non renseigné" onChange={(status) => void onStatus(student, current, status as DataByKind['attendance']['status'])} /></TableCell>
                </TableRow>
              );
            })}
          </DataTable>
        </>
      ) : <div className="empty compact">Aucune séance à cette date.</div>}
    </section>
  );
}

export function GradesView({ rows, filter, setFilter, studentName, onEdit }: { rows: RecordRow<'grades'>[]; filter: string; setFilter: (value: string) => void; studentName: (id: string) => string; onEdit: (row: RecordRow<'grades'>) => void }) {
  return (
    <section className="panel">
      <div className="panel-head"><h2>Registre des évaluations</h2><Pick value={filter} onChange={setFilter} options={['Tous', 'INTERNAL', 'CNED', 'OFFICIAL_EXAM', 'EXTERNAL']} label="Origine de la note" /></div>
      <div className="info-line">Les notes internes et les notes du CNED restent séparées. Aucune moyenne mélangée.</div>
      <DataTable headers={['Élève', 'Matière', 'Évaluation', 'Note', 'Coefficient', 'Origine', '']}>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{studentName(row.data.student)}</TableCell>
            <TableCell>{row.data.subject}</TableCell>
            <TableCell>{row.data.title}</TableCell>
            <TableCell><b>{row.data.score} / {row.data.scale}</b></TableCell>
            <TableCell>{row.data.coefficient}</TableCell>
            <TableCell><Pill tone={row.data.source === 'CNED' ? 'purple' : 'blue'}>{row.data.source === 'INTERNAL' ? 'Interne' : row.data.source}</Pill></TableCell>
            <TableCell><button className="text-button" onClick={() => onEdit(row)}>Modifier</button></TableCell>
          </TableRow>
        ))}
      </DataTable>
    </section>
  );
}
