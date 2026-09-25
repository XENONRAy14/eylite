'use client';

import { useState } from 'react';
import { CalendarDays, Check, Layers, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createGroup, createSchoolYear, createStudent, enrollStudent, errorMessage, loadGroups, type GroupSummary, type SchoolYearSummary } from '@/lib/workspace-api';

const steps = [
  { icon: CalendarDays, label: 'Année scolaire' },
  { icon: Layers, label: 'Classes' },
  { icon: Users, label: 'Élèves' },
  { icon: Check, label: 'Récapitulatif' },
];

export function OnboardingWizard({ open, onClose, schoolYears, onDone }: {
  open: boolean;
  onClose: () => void;
  schoolYears: SchoolYearSummary[];
  onDone: () => Promise<unknown>;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [yearId, setYearId] = useState('');
  const [yearDraft, setYearDraft] = useState({ label: '', startsOn: '', endsOn: '', active: true });
  const [classLines, setClassLines] = useState('');
  const [createdGroups, setCreatedGroups] = useState<GroupSummary[]>([]);
  const [studentGroup, setStudentGroup] = useState('');
  const [studentLines, setStudentLines] = useState('');
  const [counts, setCounts] = useState({ groups: 0, students: 0 });

  async function saveYear() {
    setBusy(true);
    try {
      if (yearId) { setStep(1); return; }
      if (!yearDraft.label || !yearDraft.startsOn || !yearDraft.endsOn) { toast.error('Complétez le libellé et les dates'); return; }
      const result = await createSchoolYear(yearDraft);
      if (!result.id) throw new Error('Réponse inattendue');
      setYearId(result.id);
      setStep(1);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveClasses() {
    setBusy(true);
    try {
      const names = classLines.split('\n').map((line) => line.trim()).filter(Boolean);
      for (const name of names) await createGroup({ name, type: 'class', schoolYearId: yearId });
      const fresh = await loadGroups();
      setCreatedGroups(fresh.groups.filter((group) => group.school_year_id === yearId));
      setCounts((current) => ({ ...current, groups: names.length }));
      setStep(2);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveStudents() {
    setBusy(true);
    try {
      const lines = studentLines.split('\n').map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        const separator = line.lastIndexOf(' ');
        const firstName = separator > 0 ? line.slice(0, separator) : line;
        const lastName = separator > 0 ? line.slice(separator + 1) : '—';
        const created = await createStudent({ firstName, lastName });
        if (studentGroup && created.id) await enrollStudent({ studentId: created.id, groupId: studentGroup, schoolYearId: yearId });
      }
      setCounts((current) => ({ ...current, students: lines.length }));
      setStep(3);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    await onDone();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="form-dialog">
        <DialogTitle>Assistant de démarrage</DialogTitle>
        <DialogDescription>Année scolaire → classes → élèves. Le parcours CNED se configure ensuite depuis « Suivi CNED ».</DialogDescription>
        <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
          {steps.map((item, index) => (
            <span key={item.label} className={`pill ${index === step ? 'blue' : index < step ? 'green' : 'gray'}`}><item.icon size={13} /> {item.label}</span>
          ))}
        </div>
        {step === 0 && (
          <div className="settings-form">
            {schoolYears.length > 0 && (
              <label>Reprendre une année existante
                <select value={yearId} onChange={(event) => setYearId(event.target.value)}>
                  <option value="">Créer une nouvelle année…</option>
                  {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}
                </select>
              </label>
            )}
            {!yearId && (
              <>
                <label>Libellé<input value={yearDraft.label} onChange={(event) => setYearDraft((current) => ({ ...current, label: event.target.value }))} placeholder="2025-2026" /></label>
                <label>Début<input type="date" value={yearDraft.startsOn} onChange={(event) => setYearDraft((current) => ({ ...current, startsOn: event.target.value }))} /></label>
                <label>Fin<input type="date" value={yearDraft.endsOn} onChange={(event) => setYearDraft((current) => ({ ...current, endsOn: event.target.value }))} /></label>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={yearDraft.active} onChange={(event) => setYearDraft((current) => ({ ...current, active: event.target.checked }))} />Année active</label>
              </>
            )}
            <button className="button primary" disabled={busy} onClick={() => void saveYear()}>Continuer</button>
          </div>
        )}
        {step === 1 && (
          <div className="settings-form">
            <label>Classes — une par ligne<textarea rows={5} value={classLines} onChange={(event) => setClassLines(event.target.value)} placeholder={'3e A\n3e B\n1re Sciences'} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button secondary" disabled={busy} onClick={() => { setClassLines(''); setStep(2); }}>Passer</button>
              <button className="button primary" disabled={busy || !classLines.trim()} onClick={() => void saveClasses()}>Créer les classes</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="settings-form">
            <label>Groupe d’affectation
              <select value={studentGroup} onChange={(event) => setStudentGroup(event.target.value)}>
                <option value="">Aucun (inscrire plus tard)</option>
                {createdGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>
            </label>
            <label>Élèves — « Prénom Nom », un par ligne<textarea rows={6} value={studentLines} onChange={(event) => setStudentLines(event.target.value)} placeholder={'Lina Benali\nAdam Cherif'} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button secondary" disabled={busy} onClick={() => setStep(3)}>Passer</button>
              <button className="button primary" disabled={busy || !studentLines.trim()} onClick={() => void saveStudents()}>Créer les élèves</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="settings-form">
            <p><strong>{counts.groups}</strong> classe(s) et <strong>{counts.students}</strong> élève(s) créés pour l’année.</p>
            <p className="muted">Prochaine étape : ouvrez « Suivi CNED » pour créer le parcours (matières, devoirs) puis l’affecter aux élèves. Les comptes élèves et parents se créent depuis Paramètres → Équipe &amp; accès.</p>
            <button className="button primary" onClick={() => void finish()}>Terminer</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
