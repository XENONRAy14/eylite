import type { Kind, RecordRow } from './model';

export type AuditEntry = { id: string; action: string; created_at: string };
export type UserSummary = { displayName: string; email: string };
export type Role = 'owner' | 'admin' | 'staff' | 'viewer';
export type OrganizationSummary = { id: string; name: string };
export type MemberSummary = { user_id: string; email: string; display_name: string; role: Role; created_at: string };
export type InvitationSummary = { id: string; email: string; role: Exclude<Role, 'owner'>; status: 'pending' | 'accepted' | 'revoked'; created_at: string; expires_at: string; accepted_at: string | null };
export type CampusSummary = { id: string; name: string };
export type SchoolYearSummary = { id: string; label: string; starts_on: string; ends_on: string; active: number };
export type WorkspaceSnapshot = {
  records: RecordRow[];
  audit: AuditEntry[];
  user: UserSummary;
  organization: OrganizationSummary;
  role: Role;
  members: MemberSummary[];
  invitations: InvitationSummary[];
  campuses: CampusSummary[];
  schoolYears: SchoolYearSummary[];
};
type ErrorResponse = { error?: string };
type MutationResponse = ErrorResponse & { id?: string; token?: string };

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';

async function parseResponse<T extends ErrorResponse>(response: Response, fallback: string): Promise<T> {
  const data = await response.json() as T;
  if (!response.ok) throw new Error(data.error || fallback);
  return data;
}

async function action(body: Record<string, unknown>, fallback: string): Promise<MutationResponse> {
  const response = await fetch('/api/v1/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<MutationResponse>(response, fallback);
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot> {
  const response = await fetch('/api/v1/data');
  return parseResponse<WorkspaceSnapshot & ErrorResponse>(response, 'Chargement impossible.');
}

export async function writeRecord(kind: Kind, data: unknown, id?: string, version?: number): Promise<MutationResponse> {
  return action({ kind, data, id, version }, 'Enregistrement impossible.');
}

export async function seedWorkspace(): Promise<void> {
  await action({ action: 'seed' }, 'Chargement impossible.');
}

export async function inviteMember(email: string, role: Exclude<Role, 'owner'>): Promise<MutationResponse> {
  return action({ action: 'invite', email, role }, 'Invitation impossible.');
}

export async function revokeInvitation(id: string): Promise<void> {
  await action({ action: 'revoke-invite', id }, 'Révocation impossible.');
}

export async function migrateLegacyReferences(): Promise<MutationResponse> {
  return action({ action: 'migrate-legacy' }, 'Migration impossible.');
}

export async function updateMemberRole(userId: string, role: Role): Promise<void> {
  await action({ action: 'update-member-role', userId, role }, 'Rôle impossible à modifier.');
}

export type CnedItem = {
  id: string; studentId: string; student: string; subject: string; reference: string; title: string;
  status: 'todo' | 'in_progress' | 'ready' | 'sent_declared' | 'verified' | 'corrected' | 'not_required';
  targetDate: string | null; targetSource: 'group' | 'individual' | 'none'; officialDueDate: string | null;
  declaredSentAt: string | null; declaredBy: string | null; verifiedBy: string | null; verifiedAt: string | null;
  correctedAt: string | null; score: string | null; helpRequested: boolean; lastEventAt: string | null; version: number;
};
export type CnedTemplate = { id: string; name: string; level: string | null; formula: string | null; status: 'draft' | 'published' | 'archived'; version: number; school_year_id: string };
export type CnedTemplateSubject = { id: string; template_id: string; name: string; owner_teacher_id: string | null; state: 'to_fill' | 'submitted' | 'validated' };
export type CnedDefinition = { id: string; template_subject_id: string; reference: string; title: string; position: number; official_due_date: string | null };
export type StudentSummary = { id: string; first_name: string; last_name: string; campus_id: string | null; status: string; user_id: string | null };

export async function loadCnedBoard(): Promise<{ items: CnedItem[] }> {
  const response = await fetch('/api/v1/data?domain=cned');
  return parseResponse<{ items: CnedItem[] } & ErrorResponse>(response, 'Chargement du suivi CNED impossible.');
}

export async function loadCnedTemplates(): Promise<{ templates: CnedTemplate[]; subjects: CnedTemplateSubject[]; definitions: CnedDefinition[] }> {
  const response = await fetch('/api/v1/data?domain=cned-templates');
  return parseResponse<{ templates: CnedTemplate[]; subjects: CnedTemplateSubject[]; definitions: CnedDefinition[] } & ErrorResponse>(response, 'Chargement du catalogue impossible.');
}

export async function loadStudents(): Promise<{ students: StudentSummary[] }> {
  const response = await fetch('/api/v1/data?domain=students');
  return parseResponse<{ students: StudentSummary[] } & ErrorResponse>(response, 'Chargement des élèves impossible.');
}

export type GroupSummary = { id: string; name: string; type: 'class' | 'support' | 'language' | 'activity'; level: string | null; school_year_id: string; campus_id: string | null; members: number };

export async function loadGroups(): Promise<{ groups: GroupSummary[] }> {
  const response = await fetch('/api/v1/data?domain=groups');
  return parseResponse<{ groups: GroupSummary[] } & ErrorResponse>(response, 'Chargement des groupes impossible.');
}

export async function createStudent(data: { firstName: string; lastName: string; campusId?: string; birthDate?: string }): Promise<MutationResponse> {
  return action({ action: 'student-create', ...data }, 'Création de l’élève impossible.');
}

export async function createGroup(data: { name: string; schoolYearId: string; type?: string; level?: string; campusId?: string }): Promise<MutationResponse> {
  return action({ action: 'group-create', ...data }, 'Création du groupe impossible.');
}

export async function enrollStudent(data: { studentId: string; groupId: string; schoolYearId: string; startsOn?: string }): Promise<MutationResponse> {
  return action({ action: 'student-enroll', ...data }, 'Inscription au groupe impossible.');
}

export async function cnedAction(body: Record<string, unknown>): Promise<MutationResponse> {
  return action(body, 'Opération CNED impossible.');
}

export async function downloadBackup(): Promise<void> {
  const response = await fetch('/api/v1/data?backup=1');
  if (!response.ok) {
    const data = await response.json() as ErrorResponse;
    throw new Error(data.error || 'Export impossible.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = `eylite-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
