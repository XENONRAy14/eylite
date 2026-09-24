import { env } from 'cloudflare:workers';
import { getChatGPTUserFromRequest, type ChatGPTUser } from '../../../chatgpt-auth';
import { getSessionUser } from '@/lib/auth';
import { schemas, type Kind } from '@/lib/model';
import { demoRecords } from '@/lib/seed';

type StoredRecord = {
  tenant_id: string;
  id: string;
  kind: Kind;
  payload: string;
  created_at: string;
  version: number;
};

type StoredData = {
  group?: string;
  campus?: string;
  teacher?: string;
  student?: string;
  session?: string;
  invoice?: string;
  amount?: number;
  date?: string;
  start?: string;
  end?: string;
  room?: string;
  name?: string;
};

type ParsedRecord = StoredRecord & { data: StoredData };
type Role = 'owner' | 'admin' | 'staff' | 'viewer';
type Organization = { id: string; name: string };
type Membership = { organization_id: string; user_id: string; email: string; display_name: string; role: Role; created_at: string };
type MembershipWithOrganization = Membership & { organization_name: string };
type Invitation = { id: string; email: string; role: Exclude<Role, 'owner'>; status: 'pending' | 'accepted' | 'revoked'; created_at: string; expires_at: string; accepted_at: string | null };
type Campus = { id: string; name: string };
type SchoolYear = { id: string; label: string; starts_on: string; ends_on: string; active: number };
type MutationRequest = {
  action?: unknown;
  kind?: unknown;
  data?: unknown;
  id?: unknown;
  version?: unknown;
  email?: unknown;
  role?: unknown;
  token?: unknown;
  userId?: unknown;
};

type Access = {
  db: D1Database;
  tenant: string;
  user: ChatGPTUser;
  role: Role;
  organization: Organization;
};

const writeRoles: Role[] = ['owner', 'admin', 'staff'];
const adminRoles: Role[] = ['owner', 'admin'];
const respond = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  },
});

function currentSchoolYear() {
  const now = new Date();
  const start = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return { label: `${start}–${start + 1}`, startsOn: `${start}-09-01`, endsOn: `${start + 1}-08-31` };
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function migrateLegacyReferences(db: D1Database, tenant: string) {
  await db.batch([
    db.prepare(`UPDATE records SET payload=json_set(payload,'$.group',(SELECT groups.id FROM records AS groups WHERE groups.tenant_id=records.tenant_id AND groups.kind='groups' AND json_extract(groups.payload,'$.name')=json_extract(records.payload,'$.group') LIMIT 1)) WHERE tenant_id=? AND kind IN ('students','sessions','homework') AND EXISTS (SELECT 1 FROM records AS groups WHERE groups.tenant_id=records.tenant_id AND groups.kind='groups' AND json_extract(groups.payload,'$.name')=json_extract(records.payload,'$.group'))`).bind(tenant),
    db.prepare(`UPDATE records SET payload=json_set(payload,'$.teacher',(SELECT teachers.id FROM records AS teachers WHERE teachers.tenant_id=records.tenant_id AND teachers.kind='teachers' AND json_extract(teachers.payload,'$.name')=json_extract(records.payload,'$.teacher') LIMIT 1)) WHERE tenant_id=? AND kind='sessions' AND EXISTS (SELECT 1 FROM records AS teachers WHERE teachers.tenant_id=records.tenant_id AND teachers.kind='teachers' AND json_extract(teachers.payload,'$.name')=json_extract(records.payload,'$.teacher'))`).bind(tenant),
  ]);
}

async function ensureOrganization(db: D1Database, user: ChatGPTUser): Promise<{ tenant: string; role: Role; organization: Organization }> {
  const existing = await db.prepare(`SELECT m.organization_id,m.user_id,m.email,m.display_name,m.role,m.created_at,o.name AS organization_name FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=? ORDER BY COALESCE(m.last_accessed_at,m.created_at) DESC,m.organization_id ASC LIMIT 1`).bind(user.userId).first<MembershipWithOrganization>();
  if (existing) {
    return { tenant: existing.organization_id, role: existing.role, organization: { id: existing.organization_id, name: existing.organization_name } };
  }

  const organizationId = `org-${user.userId}`;
  const now = new Date().toISOString();
  const year = currentSchoolYear();
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO organizations (id,name,created_at) VALUES (?,?,?)').bind(organizationId, 'Mon établissement', now),
    db.prepare('INSERT OR IGNORE INTO memberships (organization_id,user_id,email,display_name,role,created_at) VALUES (?,?,?,?,?,?)').bind(organizationId, user.userId, user.email, user.displayName, 'owner', now),
    db.prepare('INSERT OR IGNORE INTO campuses (id,organization_id,name,created_at) VALUES (?,?,?,?)').bind(`${organizationId}-campus-principal`, organizationId, 'Campus principal', now),
    db.prepare('INSERT OR IGNORE INTO school_years (id,organization_id,label,starts_on,ends_on,active) VALUES (?,?,?,?,?,1)').bind(`${organizationId}-year-${year.label}`, organizationId, year.label, year.startsOn, year.endsOn),
    db.prepare('UPDATE records SET tenant_id=? WHERE tenant_id=?').bind(organizationId, user.userId),
    db.prepare('UPDATE audit SET tenant_id=? WHERE tenant_id=?').bind(organizationId, user.userId),
  ]);
  return { tenant: organizationId, role: 'owner', organization: { id: organizationId, name: 'Mon établissement' } };
}

async function context(request: Request, write = false): Promise<Access> {
  const user = (await getSessionUser(request).catch(() => null)) ?? getChatGPTUserFromRequest(request);
  if (!user) throw new Error('AUTH');
  if (write) {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) throw new Error('ORIGIN');
  }
  if (!env.DB) throw new Error('STORAGE');
  const access = await ensureOrganization(env.DB, user);
  return { db: env.DB, user, ...access };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  if (message === 'AUTH') return respond({ error: 'Connexion requise.' }, 401);
  if (message === 'ORIGIN') return respond({ error: 'Origine non autorisée.' }, 403);
  if (message === 'FORBIDDEN') return respond({ error: 'Droits insuffisants.' }, 403);
  if (message === 'CONFLICT') return respond({ error: 'Ce dossier a été modifié. Actualisez avant de réessayer.' }, 409);
  if (message === 'VALIDATION') return respond({ error: 'Données invalides ou référence introuvable.' }, 400);
  if (message === 'OVERPAY') return respond({ error: 'Le paiement dépasse le solde restant.' }, 400);
  if (message === 'SCHEDULE') return respond({ error: 'Conflit : professeur, salle ou groupe déjà occupé.' }, 409);
  console.error('Eylite operation failed', message);
  return respond({ error: 'Enregistrement indisponible. Réessayez dans un instant.' }, 503);
}

function requireWrite(access: Access) {
  if (!writeRoles.includes(access.role)) throw new Error('FORBIDDEN');
}

function requireAdmin(access: Access) {
  if (!adminRoles.includes(access.role)) throw new Error('FORBIDDEN');
}

function pagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1);
  const pageSize = Math.min(500, Math.max(1, Number(url.searchParams.get('pageSize') || 100) || 100));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function teamSnapshot(access: Access) {
  const members = await access.db.prepare('SELECT user_id,email,display_name,role,created_at FROM memberships WHERE organization_id=? ORDER BY created_at').bind(access.tenant).all();
  const invitations = await access.db.prepare("SELECT id,email,role,status,created_at,accepted_at FROM invitations WHERE organization_id=? AND status='pending' ORDER BY created_at DESC").bind(access.tenant).all<Invitation>();
  const campuses = await access.db.prepare('SELECT id,name FROM campuses WHERE organization_id=? ORDER BY name').bind(access.tenant).all<Campus>();
  const schoolYears = await access.db.prepare('SELECT id,label,starts_on,ends_on,active FROM school_years WHERE organization_id=? ORDER BY starts_on DESC').bind(access.tenant).all<SchoolYear>();
  return { members: members.results, invitations: invitations.results, campuses: campuses.results, schoolYears: schoolYears.results };
}

export async function GET(request: Request) {
  try {
    const access = await context(request);
    const url = new URL(request.url);
    if (url.searchParams.get('backup') === '1') {
      requireAdmin(access);
      const [recordRows, auditRows, team] = await Promise.all([
        access.db.prepare('SELECT * FROM records WHERE tenant_id=? ORDER BY created_at').bind(access.tenant).all<StoredRecord>(),
        access.db.prepare('SELECT * FROM audit WHERE tenant_id=? ORDER BY created_at').bind(access.tenant).all(),
        teamSnapshot(access),
      ]);
      return respond({ version: 1, exportedAt: new Date().toISOString(), organization: access.organization, records: recordRows.results, audit: auditRows.results, ...team });
    }
    const kind = url.searchParams.get('kind');
    if (kind && !Object.hasOwn(schemas, kind)) throw new Error('VALIDATION');
    const campus = url.searchParams.get('campus');
    const query = url.searchParams.get('q');
    const paged = url.searchParams.has('page') || url.searchParams.has('kind') || url.searchParams.has('q') || url.searchParams.has('campus');
    const { page, pageSize, offset } = pagination(url);
    const filters = ['tenant_id=?'];
    const params: unknown[] = [access.tenant];
    if (kind) { filters.push('kind=?'); params.push(kind); }
    if (campus && campus !== 'Tous les campus') { filters.push("json_extract(payload,'$.campus')=?"); params.push(campus); }
    if (query) { filters.push('LOWER(payload) LIKE ?'); params.push(`%${query.toLowerCase()}%`); }
    const where = filters.join(' AND ');
    const recordsQuery = paged
      ? access.db.prepare(`SELECT * FROM records WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, pageSize, offset)
      : access.db.prepare(`SELECT * FROM records WHERE ${where} ORDER BY created_at DESC`).bind(...params);
    const { results } = await recordsQuery.all<StoredRecord>();
    const total = paged ? Number((await access.db.prepare(`SELECT COUNT(*) AS total FROM records WHERE ${where}`).bind(...params).first<{ total: number }>())?.total || 0) : results.length;
    const audit = await access.db.prepare('SELECT id, action, record_id, created_at FROM audit WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 60').bind(access.tenant).all();
    const team = await teamSnapshot(access);
    return respond({
      records: results.map((record) => ({ id: record.id, kind: record.kind, data: JSON.parse(record.payload), createdAt: record.created_at, version: record.version })),
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      audit: audit.results,
      user: { displayName: access.user.displayName, email: access.user.email },
      organization: access.organization,
      role: access.role,
      ...team,
    });
  } catch (error) {
    return failure(error);
  }
}

async function invite(access: Access, body: MutationRequest) {
  requireAdmin(access);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role === 'admin' || body.role === 'staff' || body.role === 'viewer' ? body.role : 'staff';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('VALIDATION');
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date();
  await access.db.batch([
    access.db.prepare("INSERT INTO invitations (id,organization_id,email,role,token,status,created_at,expires_at) VALUES (?,?,?,?,?,'pending',?,?)").bind(id, access.tenant, email, role, await hashToken(token), now.toISOString(), new Date(now.getTime() + INVITATION_TTL_MS).toISOString()),
    access.db.prepare('INSERT INTO audit (id,tenant_id,actor,action,record_id,after,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), access.tenant, access.user.email, `INVITER ${email}`, id, JSON.stringify({ email, role }), now.toISOString()),
  ]);
  return respond({ ok: true, id, token });
}

async function acceptInvite(access: Access, body: MutationRequest) {
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) throw new Error('VALIDATION');
  const hashed = await hashToken(token);
  const invitation = (await access.db.prepare("SELECT * FROM invitations WHERE token=? AND status='pending'").bind(hashed).first<Invitation & { organization_id: string }>())
    ?? await access.db.prepare("SELECT * FROM invitations WHERE token=? AND status='pending'").bind(token).first<Invitation & { organization_id: string }>();
  if (!invitation || invitation.email !== access.user.email.toLowerCase()) throw new Error('VALIDATION');
  if (invitation.expires_at && invitation.expires_at <= new Date().toISOString()) throw new Error('VALIDATION');
  const now = new Date().toISOString();
  const claimed = await access.db.prepare("UPDATE invitations SET status='accepted',accepted_at=? WHERE id=? AND status='pending'").bind(now, invitation.id).run();
  if (!claimed.meta.changes) throw new Error('CONFLICT');
  const member = await access.db.prepare('SELECT role FROM memberships WHERE organization_id=? AND user_id=?').bind(invitation.organization_id, access.user.userId).first<{ role: Role }>();
  await access.db.batch([
    access.db.prepare('INSERT INTO memberships (organization_id,user_id,email,display_name,role,created_at,last_accessed_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT (organization_id,user_id) DO UPDATE SET last_accessed_at=excluded.last_accessed_at').bind(invitation.organization_id, access.user.userId, access.user.email, access.user.displayName, member?.role ?? invitation.role, now, new Date(Date.now() + 1).toISOString()),
    access.db.prepare('INSERT INTO audit (id,tenant_id,actor,action,record_id,after,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), invitation.organization_id, access.user.email, 'ACCEPTER invitation', invitation.id, JSON.stringify({ role: member?.role ?? invitation.role, keptExistingRole: Boolean(member) }), now),
  ]);
  return respond({ ok: true });
}

async function revokeInvite(access: Access, body: MutationRequest) {
  requireAdmin(access);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) throw new Error('VALIDATION');
  const now = new Date().toISOString();
  await access.db.batch([
    access.db.prepare("UPDATE invitations SET status='revoked' WHERE id=? AND organization_id=? AND status='pending'").bind(id, access.tenant),
    access.db.prepare('INSERT INTO audit (id,tenant_id,actor,action,record_id,after,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), access.tenant, access.user.email, 'RÉVOQUER invitation', id, null, now),
  ]);
  return respond({ ok: true });
}

async function migrateLegacy(access: Access) {
  requireAdmin(access);
  await migrateLegacyReferences(access.db, access.tenant);
  const unresolved = await access.db.prepare(`SELECT COUNT(*) AS total FROM records WHERE tenant_id=? AND (kind IN ('students','sessions','homework') AND json_extract(payload,'$.group') IS NOT NULL AND json_extract(payload,'$.group') NOT IN (SELECT id FROM records AS g WHERE g.tenant_id=records.tenant_id AND g.kind='groups') OR kind='sessions' AND json_extract(payload,'$.teacher') IS NOT NULL AND json_extract(payload,'$.teacher') NOT IN (SELECT id FROM records AS t WHERE t.tenant_id=records.tenant_id AND t.kind='teachers'))`).bind(access.tenant).first<{ total: number }>();
  return respond({ ok: true, unresolvedReferences: unresolved?.total ?? 0 });
}

async function updateMember(access: Access, body: MutationRequest) {
  requireAdmin(access);
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const role = body.role === 'admin' || body.role === 'staff' || body.role === 'viewer' || body.role === 'owner' ? body.role : '';
  if (!userId || !role) throw new Error('VALIDATION');
  const target = await access.db.prepare('SELECT role FROM memberships WHERE organization_id=? AND user_id=?').bind(access.tenant, userId).first<{ role: Role }>();
  if (!target) throw new Error('VALIDATION');
  if ((role === 'owner' || target.role === 'owner') && access.role !== 'owner') throw new Error('FORBIDDEN');
  if (target.role === 'owner' && role !== 'owner') {
    const owners = await access.db.prepare("SELECT COUNT(*) AS total FROM memberships WHERE organization_id=? AND role='owner'").bind(access.tenant).first<{ total: number }>();
    if ((owners?.total ?? 0) <= 1) throw new Error('FORBIDDEN');
  }
  await access.db.batch([
    access.db.prepare('UPDATE memberships SET role=? WHERE organization_id=? AND user_id=?').bind(role, access.tenant, userId),
    access.db.prepare('INSERT INTO audit (id,tenant_id,actor,action,record_id,after,created_at) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(), access.tenant, access.user.email, `RÔLE ${userId}`, userId, JSON.stringify({ role }), new Date().toISOString()),
  ]);
  return respond({ ok: true });
}

export async function POST(request: Request) {
  try {
    const access = await context(request, true);
    if (Number(request.headers.get('content-length') || 0) > 100000) return respond({ error: 'Requête trop volumineuse.' }, 413);
    const body = await request.json() as MutationRequest;

    if (body.action === 'invite') return await invite(access, body);
    if (body.action === 'accept-invite') return await acceptInvite(access, body);
    if (body.action === 'revoke-invite') return await revokeInvite(access, body);
    if (body.action === 'update-member-role') return await updateMember(access, body);
    if (body.action === 'migrate-legacy') return await migrateLegacy(access);
    requireWrite(access);

    if (body.action === 'seed') {
      const existing = await access.db.prepare('SELECT id FROM records WHERE tenant_id=? LIMIT 1').bind(access.tenant).first();
      if (existing) return respond({ error: 'La démonstration nécessite un espace vide.' }, 409);
      const rows = demoRecords();
      for (let start = 0; start < rows.length; start += 50) {
        await access.db.batch(rows.slice(start, start + 50).map((record) =>
          access.db.prepare('INSERT OR IGNORE INTO records (tenant_id,id,kind,payload,created_at,version) VALUES (?,?,?,?,?,1)')
            .bind(access.tenant, record.id, record.kind, JSON.stringify(record.data), record.createdAt),
        ));
      }
      return respond({ ok: true });
    }

    if (typeof body.kind !== 'string' || !Object.hasOwn(schemas, body.kind)) throw new Error('VALIDATION');
    const kind = body.kind as Kind;
    const parsed = schemas[kind].safeParse(body.data);
    if (!parsed.success) return respond({ error: parsed.error.issues.map((issue) => issue.message).join(' · ') }, 400);
    const data = parsed.data as StoredData;

    const all = await access.db.prepare('SELECT * FROM records WHERE tenant_id=?').bind(access.tenant).all<StoredRecord>();
    const records: ParsedRecord[] = all.results.map((record) => ({ ...record, data: JSON.parse(record.payload) as StoredData }));

    if (data.group && ['students', 'sessions', 'homework'].includes(kind) && !records.some((record) => record.kind === 'groups' && record.id === data.group && record.data.campus === data.campus)) throw new Error('VALIDATION');
    if (kind === 'sessions' && !records.some((record) => record.kind === 'teachers' && record.id === data.teacher)) throw new Error('VALIDATION');
    if (data.student && !records.some((record) => record.id === data.student && record.kind === 'students' && record.data.campus === data.campus)) throw new Error('VALIDATION');

    if (kind === 'attendance') {
      const session = records.find((record) => record.id === data.session && record.kind === 'sessions');
      const student = records.find((record) => record.id === data.student && record.kind === 'students');
      if (!session || !student || session.data.group !== student.data.group || session.data.campus !== student.data.campus) throw new Error('VALIDATION');
    }

    if (kind === 'payments') {
      const invoice = records.find((record) => record.id === data.invoice && record.kind === 'invoices' && record.data.student === data.student);
      if (!invoice || typeof data.amount !== 'number' || typeof invoice.data.amount !== 'number') throw new Error('VALIDATION');
      const paid = records.filter((record) => record.kind === 'payments' && record.data.invoice === data.invoice).reduce((sum, record) => sum + (typeof record.data.amount === 'number' ? record.data.amount : 0), 0);
      if (paid + data.amount > invoice.data.amount) throw new Error('OVERPAY');
    }

    if (kind === 'sessions' && records.some((record) => record.kind === 'sessions' && record.id !== body.id && record.data.date === data.date && typeof record.data.start === 'string' && typeof record.data.end === 'string' && typeof data.start === 'string' && typeof data.end === 'string' && record.data.start < data.end && record.data.end > data.start && (record.data.teacher === data.teacher || record.data.group === data.group || (record.data.room === data.room && record.data.campus === data.campus)))) throw new Error('SCHEDULE');

    if (body.id !== undefined && (typeof body.id !== 'string' || body.id.length > 150)) throw new Error('VALIDATION');
    let id = typeof body.id === 'string' ? body.id : crypto.randomUUID();
    if (kind === 'attendance') id = `attendance-${data.session}-${data.student}`;
    if (kind === 'settings') id = 'settings';

    const prior = records.find((record) => record.id === id);
    if (prior && prior.kind !== kind) throw new Error('VALIDATION');
    if (prior && kind === 'payments') throw new Error('VALIDATION');
    if (prior && body.version !== prior.version) throw new Error('CONFLICT');
    if (kind === 'settings' && !adminRoles.includes(access.role)) throw new Error('FORBIDDEN');

    const now = new Date().toISOString();
    const payload = JSON.stringify(data);
    let statement = prior
      ? access.db.prepare('UPDATE records SET payload=?,version=version+1 WHERE tenant_id=? AND id=? AND version=?').bind(payload, access.tenant, id, prior.version)
      : access.db.prepare('INSERT INTO records (tenant_id,id,kind,payload,created_at,version) VALUES (?,?,?,?,?,1)').bind(access.tenant, id, kind, payload, now);

    if (kind === 'payments') {
      statement = access.db.prepare(`INSERT INTO records (tenant_id,id,kind,payload,created_at,version) SELECT ?,?,?,?,?,1 WHERE ? <= (SELECT CAST(json_extract(payload,'$.amount') AS REAL) FROM records WHERE tenant_id=? AND id=? AND kind='invoices') - COALESCE((SELECT SUM(CAST(json_extract(payload,'$.amount') AS REAL)) FROM records WHERE tenant_id=? AND kind='payments' AND json_extract(payload,'$.invoice')=?),0)`)
        .bind(access.tenant, id, kind, payload, now, data.amount, access.tenant, data.invoice, access.tenant, data.invoice);
    }

    const result = await access.db.batch([
      statement,
      access.db.prepare('INSERT INTO audit (id,tenant_id,actor,action,record_id,before,after,created_at) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0')
        .bind(crypto.randomUUID(), access.tenant, access.user.email, `${prior ? 'MODIFIER' : 'CRÉER'} ${kind}`, id, prior?.payload || null, payload, now),
    ]);
    if (!result[0].meta.changes) throw new Error('CONFLICT');
    return respond({ ok: true, id });
  } catch (error) {
    return failure(error);
  }
}
