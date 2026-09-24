import type { Kind, RecordRow } from './model';

export type AuditEntry = { id: string; action: string; created_at: string };
export type UserSummary = { displayName: string; email: string };
export type Role = 'owner' | 'admin' | 'staff' | 'viewer';
export type OrganizationSummary = { id: string; name: string };
export type MemberSummary = { user_id: string; email: string; display_name: string; role: Role; created_at: string };
export type InvitationSummary = { id: string; email: string; role: Exclude<Role, 'owner'>; status: 'pending' | 'accepted' | 'revoked'; created_at: string; accepted_at: string | null };
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

export async function updateMemberRole(userId: string, role: Role): Promise<void> {
  await action({ action: 'update-member-role', userId, role }, 'Rôle impossible à modifier.');
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
