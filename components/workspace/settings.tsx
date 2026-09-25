'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Activity, Building2, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import type { DataByKind } from '@/lib/model';
import { errorMessage, loadGuardians, loadStudents, type AuditEntry, type GuardianSummary, type InvitationSummary, type MemberSummary, type Role, type StaffFunction, type StudentSummary } from '@/lib/workspace-api';

type Settings = DataByKind['settings'];
type TeamRole = Exclude<Role, 'owner'>;

const modules = [
  ['cned', 'Suivi CNED', 'Devoirs, corrections et progression'],
  ['finance', 'Finances', 'Échéances, paiements et reçus'],
  ['admissions', 'Admissions', 'Suivi des candidats et dossiers'],
] as const;

const roleLabels: Record<Role, string> = { owner: 'Propriétaire', admin: 'Administrateur', staff: 'Équipe', viewer: 'Lecture seule', student: 'Élève', guardian: 'Parent / responsable' };
const functionLabels: Record<StaffFunction, string> = { direction: 'Direction', teacher: 'Enseignant', secretariat: 'Secrétariat', compta: 'Comptabilité' };

export function SettingsView({
  settings,
  audit,
  organization,
  role,
  members,
  invitations,
  onUpdate,
  onInvite,
  onRole,
  onFunction,
  onBackup,
}: {
  settings: Settings;
  audit: AuditEntry[];
  organization: { id: string; name: string };
  role: Role;
  members: MemberSummary[];
  invitations: InvitationSummary[];
  onUpdate: (data: Settings) => Promise<unknown>;
  onInvite: (email: string, role: TeamRole, linkStudentId?: string, linkGuardianId?: string) => Promise<unknown>;
  onRole: (userId: string, role: Role) => Promise<unknown>;
  onFunction: (userId: string, staffFunction: StaffFunction | '') => Promise<unknown>;
  onBackup: () => Promise<unknown>;
}) {
  const canAdminister = role === 'owner' || role === 'admin';
  const [inviteRole, setInviteRole] = useState<TeamRole>('staff');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [guardians, setGuardians] = useState<GuardianSummary[]>([]);
  useEffect(() => {
    if (!canAdminister) return;
    void loadStudents().then((data) => setStudents(data.students)).catch(() => {});
    void loadGuardians().then((data) => setGuardians(data.guardians)).catch(() => {});
  }, [canAdminister]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await onUpdate({ ...settings, name: String(form.get('name') || settings.name), year: String(form.get('year') || settings.year) });
      toast.success('Établissement mis à jour');
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  }

  async function updateModule(key: keyof Pick<Settings, 'cned' | 'finance' | 'admissions'>, checked: boolean) {
    try {
      await onUpdate({ ...settings, [key]: checked });
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const inviteeRole = String(form.get('role') || 'staff') as TeamRole;
      await onInvite(
        String(form.get('email') || ''),
        inviteeRole,
        inviteeRole === 'student' ? String(form.get('linkStudent') || '') || undefined : undefined,
        inviteeRole === 'guardian' ? String(form.get('linkGuardian') || '') || undefined : undefined,
      );
      formElement.reset();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="settings-grid">
      <section className="panel">
        <div className="panel-head"><h2>Votre établissement</h2><Building2 size={20} /></div>
        <form className="settings-form" onSubmit={submit}>
          <label>Nom de l’organisation<input name="name" defaultValue={settings.name || organization.name} required /></label>
          <label>Année scolaire<input name="year" defaultValue={settings.year} required /></label>
          <button className="button primary" disabled={!canAdminister}>Enregistrer</button>
        </form>
        <div className="panel-head"><h2>Modules activables</h2></div>
        {modules.map(([key, name, description]) => (
          <div className="module-row" key={key}>
            <div><strong>{name}</strong><p>{description}</p></div>
            <Switch aria-label={name} checked={settings[key]} disabled={!canAdminister} onCheckedChange={(checked) => void updateModule(key, checked)} />
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Équipe & accès</h2><UserPlus size={20} /></div>
        <div className="member-list">
          {members.map((member) => (
            <div className="module-row" key={member.user_id}>
              <div><strong>{member.display_name}</strong><p>{member.email}</p></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {(member.role === 'staff' || member.role === 'admin') && (
                  <select aria-label="Fonction" value={member.staff_function ?? ''} disabled={!canAdminister} onChange={(event) => void onFunction(member.user_id, event.target.value as StaffFunction | '').catch((error: unknown) => toast.error(errorMessage(error)))}>
                    <option value="">Fonction…</option>
                    <option value="direction">Direction</option>
                    <option value="teacher">Enseignant</option>
                    <option value="secretariat">Secrétariat</option>
                    <option value="compta">Comptabilité</option>
                  </select>
                )}
                {member.role === 'owner' || member.role === 'student' || member.role === 'guardian' || !canAdminister ? <span className="muted">{roleLabels[member.role]}{member.staff_function ? ` · ${functionLabels[member.staff_function]}` : ''}</span> : (
                  <select value={member.role} onChange={(event) => void onRole(member.user_id, event.target.value as Role).catch((error: unknown) => toast.error(errorMessage(error)))}>
                    <option value="admin">Administrateur</option>
                    <option value="staff">Équipe</option>
                    <option value="viewer">Lecture seule</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
        {canAdminister && (
          <form className="settings-form" onSubmit={invite}>
            <label>Invitation par e-mail<input name="email" type="email" placeholder="collegue@ecole.dz" required /></label>
            <label>Rôle<select name="role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TeamRole)}><option value="staff">Équipe</option><option value="admin">Administrateur</option><option value="viewer">Lecture seule</option><option value="student">Élève</option><option value="guardian">Parent / responsable</option></select></label>
            {inviteRole === 'student' && (
              <label>Dossier élève<select name="linkStudent" required><option value="">Choisir…</option>{students.map((student) => <option key={student.id} value={student.id} disabled={!!student.user_id}>{student.first_name} {student.last_name}{student.user_id ? ' (compte lié)' : ''}</option>)}</select></label>
            )}
            {inviteRole === 'guardian' && (
              <label>Responsable<select name="linkGuardian" required><option value="">Choisir…</option>{guardians.map((guardian) => <option key={guardian.id} value={guardian.id} disabled={!!guardian.user_id}>{guardian.name}{guardian.user_id ? ' (compte lié)' : ''}</option>)}</select></label>
            )}
            <button className="button secondary">Créer une invitation</button>
            {(inviteRole === 'student' || inviteRole === 'guardian') && <p className="muted">À l’acceptation, le compte sera automatiquement rattaché au dossier sélectionné et limité à ses données.</p>}
          </form>
        )}
        {invitations.length > 0 && <div className="member-list">{invitations.map((invitation) => <div className="module-row" key={invitation.id}><div><strong>{invitation.email}</strong><p>Invitation {roleLabels[invitation.role]} · en attente</p></div></div>)}</div>}
        {canAdminister && <button className="button secondary" onClick={() => void onBackup().catch((error: unknown) => toast.error(errorMessage(error)))}>Exporter une sauvegarde JSON</button>}
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Journal des opérations</h2><ShieldCheck size={20} /></div>
        <div className="audit-list">
          {audit.length ? audit.map((entry) => (
            <div className="audit-item" key={entry.id}>
              <Activity size={16} />
              <div><strong>{entry.action}</strong><small>{new Date(entry.created_at).toLocaleString('fr-FR')}</small></div>
            </div>
          )) : <div className="empty compact">Les modifications seront consignées ici.</div>}
        </div>
      </section>
    </div>
  );
}
