'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookPlus, ChevronRight, Globe, RefreshCw, Send, Hand, BadgeCheck, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { TableCell, TableRow } from '@/components/ui/table';
import type { RecordRow } from '@/lib/model';
import { DataTable, Pill } from './primitives';
import {
  cnedAction, createStudent, errorMessage,
  loadCnedBoard, loadCnedTemplates, loadGroups, loadNotifications, loadStudents,
  type CnedItem, type CnedTemplate, type CnedTemplateSubject, type CnedDefinition,
  type GroupSummary, type NotificationItem, type Role, type SchoolYearSummary, type StudentSummary,
} from '@/lib/workspace-api';

const submitted = ['Envoyé', 'Correction en attente', 'Corrigé'];

const statusLabels: Record<CnedItem['status'], string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  ready: 'Prêt à envoyer',
  sent_declared: 'Envoi déclaré',
  verified: 'Vérifié par l’école',
  corrected: 'Correction reçue',
  not_required: 'Non requis',
};

const statusTone: Record<CnedItem['status'], string> = {
  todo: 'orange', in_progress: 'blue', ready: 'blue', sent_declared: 'blue',
  verified: 'green', corrected: 'green', not_required: 'gray',
};

const sourceLabels: Record<CnedItem['targetSource'], string> = {
  group: 'objectif du groupe', individual: 'objectif individuel', none: 'sans date',
};

function DemoList({ rows, late, studentName, onEdit }: { rows: RecordRow<'cned'>[]; late: RecordRow<'cned'>[]; studentName: (id: string) => string; onEdit: (row: RecordRow<'cned'>) => void }) {
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

export function CnedView({ demo = false, rows = [], late = [], studentName = () => '', onEdit = () => {}, role = 'viewer', schoolYears = [] }: {
  demo?: boolean;
  rows?: RecordRow<'cned'>[];
  late?: RecordRow<'cned'>[];
  studentName?: (id: string) => string;
  onEdit?: (row: RecordRow<'cned'>) => void;
  role?: Role;
  schoolYears?: SchoolYearSummary[];
}) {
  const [items, setItems] = useState<CnedItem[]>([]);
  const [templates, setTemplates] = useState<CnedTemplate[]>([]);
  const [subjects, setSubjects] = useState<CnedTemplateSubject[]>([]);
  const [definitions, setDefinitions] = useState<CnedDefinition[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [newGroup, setNewGroup] = useState({ name: '', type: 'class', level: '', schoolYearId: '' });
  const [enrollDraft, setEnrollDraft] = useState({ studentId: '', groupId: '', schoolYearId: '' });
  const [targetDraft, setTargetDraft] = useState<Record<string, string>>({});
  const [targetGroup, setTargetGroup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [draftName, setDraftName] = useState('');
  const [draftLevel, setDraftLevel] = useState('');
  const [draftYear, setDraftYear] = useState('');
  const [subjectName, setSubjectName] = useState<Record<string, string>>({});
  const [defDraft, setDefDraft] = useState<Record<string, { reference: string; title: string }>>({});
  const [assignSelection, setAssignSelection] = useState<Record<string, boolean>>({});
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '' });
  const [busy, setBusy] = useState(false);

  const isStaff = role === 'owner' || role === 'admin' || role === 'staff';
  const isAdmin = role === 'owner' || role === 'admin';

  const refresh = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    try {
      const [board, catalog, studentList, groupList, notifList] = await Promise.all([loadCnedBoard(), isStaff ? loadCnedTemplates() : Promise.resolve(null), isStaff ? loadStudents() : Promise.resolve(null), isStaff ? loadGroups() : Promise.resolve(null), loadNotifications()]);
      setItems(board.items);
      setNotifications(notifList.notifications);
      if (catalog) { setTemplates(catalog.templates); setSubjects(catalog.subjects); setDefinitions(catalog.definitions); }
      if (studentList) setStudents(studentList.students);
      if (groupList) setGroups(groupList.groups);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [demo, isStaff]);

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);

  async function run(actionBody: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      await cnedAction(actionBody);
      toast.success(success);
      await refresh();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (demo) return <DemoList rows={rows} late={late} studentName={studentName} onEdit={onEdit} />;

  const filtered = filter === 'Tous' ? items : filter === 'Aide' ? items.filter((item) => item.helpRequested) : items.filter((item) => item.status === filter);

  return (
    <>
      <div className="cned-banner">
        <div className="cned-badge"><Globe size={28} /></div>
        <div><h2>Suivi CNED, déclaré et vérifié.</h2><p>Le dépôt et la correction restent sur le site du CNED. Eylite suit où chacun en est.</p></div>
        <div className="cned-progress"><b>{items.filter((item) => ['sent_declared', 'verified', 'corrected'].includes(item.status)).length} / {items.filter((item) => item.status !== 'not_required').length}</b><span>envois déclarés ou validés</span></div>
      </div>

      {notifications.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>À traiter</h2><Pill tone="orange">{notifications.length}</Pill></div>
          {notifications.slice(0, 8).map((notification) => (
            <div key={notification.id} className="agenda-row">
              <Pill tone={notification.type === 'help' ? 'orange' : notification.type === 'stale' ? 'gray' : 'blue'}>{notification.type === 'help' ? 'Aide' : notification.type === 'stale' ? 'À actualiser' : 'Rappel'}</Pill>
              <div className="lesson-info"><span>{notification.message}</span></div>
            </div>
          ))}
        </section>
      )}

      {isStaff && (
        <section className="panel">
          <div className="panel-head"><h2>Suivi des devoirs</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Tous', 'todo', 'in_progress', 'sent_declared', 'verified', 'corrected', 'Aide'].map((key) => (
                <button key={key} className={`text-button${filter === key ? ' selected' : ''}`} onClick={() => setFilter(key)}>{key === 'Tous' || key === 'Aide' ? key : statusLabels[key as CnedItem['status']]}</button>
              ))}
              <button className="text-button" onClick={() => void refresh()}><RefreshCw size={14} /></button>
            </div>
          </div>
          <DataTable headers={['Élève', 'Matière / devoir', 'Objectif', 'Officiel CNED', 'Statut', 'Actions']}>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell><strong>{item.student}</strong>{item.helpRequested && <Pill tone="orange">Aide demandée</Pill>}</TableCell>
                <TableCell>{item.subject} · {item.reference}<small className="block muted">{item.title}</small></TableCell>
                <TableCell>{item.targetDate ? item.targetDate.split('-').reverse().join('/') : '—'}<small className="block muted">{sourceLabels[item.targetSource]}</small></TableCell>
                <TableCell>{item.officialDueDate ? item.officialDueDate.split('-').reverse().join('/') : '—'}</TableCell>
                <TableCell><Pill tone={statusTone[item.status]}>{statusLabels[item.status]}</Pill>{item.score && <small className="block muted">{item.score}</small>}</TableCell>
                <TableCell>
                  {item.status === 'sent_declared' && <button className="text-button" disabled={busy} onClick={() => void run({ action: 'cned-update-status', studentAssignmentId: item.id, status: 'verified', version: item.version }, 'Envoi vérifié par l’école')}><BadgeCheck size={14} /> Vérifier</button>}
                  {['sent_declared', 'verified'].includes(item.status) && <button className="text-button" disabled={busy} onClick={() => { const score = window.prompt('Note CNED (ex : 14/20)', item.score ?? ''); if (score !== null) void run({ action: 'cned-set-correction', studentAssignmentId: item.id, score }, 'Correction enregistrée'); }}>Correction</button>}
                  <input type="date" aria-label="Objectif individuel" value={item.targetSource === 'individual' ? (item.targetDate ?? '') : ''} onChange={(event) => void run({ action: 'cned-set-target', studentAssignmentId: item.id, targetDate: event.target.value || null }, 'Objectif individuel enregistré')} />
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableRow><TableCell colSpan={6}>{loading ? 'Chargement…' : 'Aucun devoir dans ce filtre.'}</TableCell></TableRow>}
          </DataTable>
        </section>
      )}

      {!isStaff && (
        <section className="panel">
          <div className="panel-head"><h2>Mes devoirs CNED</h2><Pill>{items.length} suivis</Pill></div>
          {items.map((item) => (
            <div key={item.id} className="agenda-row" style={{ alignItems: 'center' }}>
              <div className="lesson-info">
                <strong>{item.subject} — {item.reference}</strong>
                <span>{item.title || 'Devoir'} · {item.targetDate ? `objectif ${item.targetDate.split('-').reverse().join('/')}` : 'sans date'}</span>
              </div>
              <Pill tone={statusTone[item.status]}>{statusLabels[item.status]}</Pill>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!['sent_declared', 'verified', 'corrected', 'not_required'].includes(item.status) && (
                  <>
                    <button className="button secondary" disabled={busy} onClick={() => void run({ action: 'cned-update-status', studentAssignmentId: item.id, status: 'in_progress', version: item.version }, 'Avancement enregistré')}>Je travaille dessus</button>
                    <button className="button primary" disabled={busy} onClick={() => void run({ action: 'cned-update-status', studentAssignmentId: item.id, status: 'sent_declared', version: item.version }, 'Envoi déclaré — merci !')}><Send size={14} /> Je l’ai envoyé au CNED</button>
                  </>
                )}
                <button className="button secondary" disabled={busy} onClick={() => void run({ action: 'cned-set-help', studentAssignmentId: item.id, help: !item.helpRequested }, item.helpRequested ? 'Demande retirée' : 'Un professeur sera prévenu')}><Hand size={14} /> {item.helpRequested ? 'Aide demandée' : 'J’ai besoin d’aide'}</button>
              </div>
            </div>
          ))}
          {!items.length && !loading && <p className="muted" style={{ padding: 16 }}>Aucun devoir CNED ne vous est encore attribué.</p>}
        </section>
      )}

      {isAdmin && (
        <section className="panel">
          <div className="panel-head"><h2><BookPlus size={18} /> Catalogue des parcours CNED</h2></div>
          <div className="record-form" style={{ padding: '0 20px 16px' }}>
            <div className="fields" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
              <label>Nom du parcours<input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Ex : 3e — CNED 2026-2027" /></label>
              <label>Niveau<input value={draftLevel} onChange={(event) => setDraftLevel(event.target.value)} placeholder="3e" /></label>
              <label>Année<select value={draftYear} onChange={(event) => setDraftYear(event.target.value)}><option value="">Choisir…</option>{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label>
              <button className="button secondary" disabled={busy || !draftName || !draftYear} onClick={() => void run({ action: 'cned-create-template', name: draftName, level: draftLevel, schoolYearId: draftYear }, 'Parcours créé en brouillon')}>Créer</button>
            </div>
          </div>

          {templates.map((template) => (
            <div key={template.id} style={{ borderTop: '1px solid #e5eae7', padding: '14px 20px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{template.name}</strong>
                <Pill tone={template.status === 'published' ? 'green' : template.status === 'draft' ? 'orange' : 'gray'}>{template.status === 'published' ? 'Publié' : template.status === 'draft' ? 'Brouillon' : 'Archivé'}</Pill>
                <small className="muted">v{template.version}{template.level ? ` · ${template.level}` : ''}</small>
                {template.status === 'draft' && <button className="text-button" disabled={busy} onClick={() => void run({ action: 'cned-publish-template', templateId: template.id }, 'Parcours publié')}>Publier</button>}
              </div>

              {subjects.filter((subject) => subject.template_id === template.id).map((subject) => (
                <div key={subject.id} style={{ margin: '8px 0 8px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <GraduationCap size={14} /><strong>{subject.name}</strong>
                    <small className="muted">{definitions.filter((def) => def.template_subject_id === subject.id).length} devoir(s)</small>
                  </div>
                  <ul style={{ margin: '4px 0 4px 22px' }}>
                    {definitions.filter((def) => def.template_subject_id === subject.id).map((def) => <li key={def.id}><b>{def.reference}</b> {def.title}{def.official_due_date ? ` · officiel ${def.official_due_date}` : ''}</li>)}
                  </ul>
                  {template.status === 'draft' && (
                    <div style={{ display: 'flex', gap: 8, marginLeft: 22 }}>
                      <input placeholder="Réf. (D1)" style={{ width: 90 }} value={defDraft[subject.id]?.reference ?? ''} onChange={(event) => setDefDraft((current) => ({ ...current, [subject.id]: { reference: event.target.value, title: current[subject.id]?.title ?? '' } }))} />
                      <input placeholder="Intitulé" value={defDraft[subject.id]?.title ?? ''} onChange={(event) => setDefDraft((current) => ({ ...current, [subject.id]: { reference: current[subject.id]?.reference ?? '', title: event.target.value } }))} />
                      <button className="text-button" disabled={busy || !defDraft[subject.id]?.reference} onClick={() => void run({ action: 'cned-add-assignment', templateSubjectId: subject.id, reference: defDraft[subject.id].reference, title: defDraft[subject.id].title }, 'Devoir ajouté')}>+ Devoir</button>
                    </div>
                  )}
                </div>
              ))}

              {template.status === 'draft' && (
                <div style={{ display: 'flex', gap: 8, margin: '10px 0 0 18px' }}>
                  <input placeholder="Nouvelle matière" value={subjectName[template.id] ?? ''} onChange={(event) => setSubjectName((current) => ({ ...current, [template.id]: event.target.value }))} />
                  <button className="text-button" disabled={busy || !subjectName[template.id]} onClick={() => void run({ action: 'cned-add-subject', templateId: template.id, name: subjectName[template.id] }, 'Matière ajoutée')}>+ Matière</button>
                </div>
              )}

              {template.status === 'published' && students.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <small className="muted">Affecter aux élèves :</small>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    {students.map((student) => (
                      <label key={student.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="checkbox" checked={Boolean(assignSelection[student.id])} onChange={(event) => setAssignSelection((current) => ({ ...current, [student.id]: event.target.checked }))} />
                        {student.first_name} {student.last_name}
                      </label>
                    ))}
                    <button className="button secondary" disabled={busy} onClick={() => void run({ action: 'cned-assign', templateId: template.id, studentIds: Object.keys(assignSelection).filter((id) => assignSelection[id]) }, 'Parcours affecté')}>Affecter</button>
                  </div>
                </div>
              )}

              {template.status === 'published' && groups.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <small className="muted">Objectifs d’envoi par groupe :</small>
                  <select value={targetGroup[template.id] ?? ''} onChange={(event) => setTargetGroup((current) => ({ ...current, [template.id]: event.target.value }))} aria-label="Groupe">
                    <option value="">Choisir un groupe…</option>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                  {targetGroup[template.id] && subjects.filter((subject) => subject.template_id === template.id).map((subject) => (
                    <div key={subject.id} style={{ margin: '6px 0 0 18px' }}>
                      <strong>{subject.name}</strong>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                        {definitions.filter((def) => def.template_subject_id === subject.id).map((def) => {
                          const key = `${targetGroup[template.id]}:${def.id}`;
                          return (
                            <label key={def.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              {def.reference}
                              <input type="date" value={targetDraft[key] ?? ''} onChange={(event) => setTargetDraft((current) => ({ ...current, [key]: event.target.value }))} onBlur={() => { if (targetDraft[key]) void run({ action: 'cned-set-target', groupId: targetGroup[template.id], assignmentDefinitionId: def.id, targetDate: targetDraft[key] }, `Objectif ${def.reference} enregistré`); }} />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5eae7', padding: '14px 20px' }}>
            <strong>Classes & groupes ({groups.length})</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'end' }}>
              <label>Nom<input value={newGroup.name} onChange={(event) => setNewGroup((current) => ({ ...current, name: event.target.value }))} placeholder="3e A" /></label>
              <label>Type<select value={newGroup.type} onChange={(event) => setNewGroup((current) => ({ ...current, type: event.target.value }))}><option value="class">Classe</option><option value="support">Soutien</option><option value="language">Langue</option><option value="activity">Activité</option></select></label>
              <label>Niveau<input value={newGroup.level} onChange={(event) => setNewGroup((current) => ({ ...current, level: event.target.value }))} placeholder="3e" /></label>
              <label>Année<select value={newGroup.schoolYearId} onChange={(event) => setNewGroup((current) => ({ ...current, schoolYearId: event.target.value }))}><option value="">Choisir…</option>{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select></label>
              <button className="button secondary" disabled={busy || !newGroup.name || !newGroup.schoolYearId} onClick={() => void run({ action: 'group-create', ...newGroup }, 'Groupe créé')}>Créer le groupe</button>
            </div>
            {groups.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'end' }}>
                <label>Élève<select value={enrollDraft.studentId} onChange={(event) => setEnrollDraft((current) => ({ ...current, studentId: event.target.value }))}><option value="">Choisir…</option>{students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}</select></label>
                <label>Groupe<select value={enrollDraft.groupId} onChange={(event) => setEnrollDraft((current) => ({ ...current, groupId: event.target.value, schoolYearId: groups.find((group) => group.id === event.target.value)?.school_year_id ?? current.schoolYearId }))}><option value="">Choisir…</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.members})</option>)}</select></label>
                <button className="button secondary" disabled={busy || !enrollDraft.studentId || !enrollDraft.groupId} onClick={() => void run({ action: 'student-enroll', ...enrollDraft }, 'Élève inscrit au groupe')}>Inscrire</button>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e5eae7', padding: '14px 20px', display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
            <label>Prénom élève<input value={newStudent.firstName} onChange={(event) => setNewStudent((current) => ({ ...current, firstName: event.target.value }))} /></label>
            <label>Nom élève<input value={newStudent.lastName} onChange={(event) => setNewStudent((current) => ({ ...current, lastName: event.target.value }))} /></label>
            <button className="button secondary" disabled={busy || !newStudent.firstName || !newStudent.lastName} onClick={async () => { setBusy(true); try { await createStudent(newStudent); toast.success('Élève créé'); setNewStudent({ firstName: '', lastName: '' }); await refresh(); } catch (error: unknown) { toast.error(errorMessage(error)); } finally { setBusy(false); } }}>Ajouter un élève</button>
          </div>
        </section>
      )}
    </>
  );
}
