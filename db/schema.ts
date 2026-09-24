import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
});

export const memberships = sqliteTable('memberships', {
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['owner', 'admin', 'staff', 'viewer'] }).notNull(),
  createdAt: text('created_at').notNull(),
  lastAccessedAt: text('last_accessed_at'),
}, (table) => [
  primaryKey({ columns: [table.organizationId, table.userId] }),
  index('memberships_user').on(table.userId),
]);

export const campuses = sqliteTable('campuses', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('campuses_org_name').on(table.organizationId, table.name)]);

export const schoolYears = sqliteTable('school_years', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
}, (table) => [uniqueIndex('school_years_org_label').on(table.organizationId, table.label)]);

export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'staff', 'viewer'] }).notNull(),
  token: text('token').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'revoked'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull().default(''),
  acceptedAt: text('accepted_at'),
}, (table) => [
  uniqueIndex('invitations_token').on(table.token),
  index('invitations_org_status').on(table.organizationId, table.status),
]);

export const authUsers = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('user_email').on(table.email)]);

export const authSessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
}, (table) => [uniqueIndex('session_token').on(table.token), index('session_user').on(table.userId)]);

export const authAccounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [index('account_user').on(table.userId)]);

export const authVerifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp_ms' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp_ms' }),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  campusId: text('campus_id').references(() => campuses.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  birthDate: text('birth_date'),
  status: text('status', { enum: ['active', 'inactive', 'alumni'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('students_org').on(table.organizationId), index('students_user').on(table.userId)]);

export const guardians = sqliteTable('guardians', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('guardians_org').on(table.organizationId), index('guardians_user').on(table.userId)]);

export const studentGuardians = sqliteTable('student_guardians', {
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  guardianId: text('guardian_id').notNull().references(() => guardians.id, { onDelete: 'cascade' }),
  relationship: text('relationship').notNull().default(''),
  canDeclare: integer('can_declare', { mode: 'boolean' }).notNull().default(false),
}, (table) => [primaryKey({ columns: [table.studentId, table.guardianId] })]);

export const teachers = sqliteTable('teachers', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  campusId: text('campus_id').references(() => campuses.id, { onDelete: 'set null' }),
  userId: text('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('teachers_org').on(table.organizationId), index('teachers_user').on(table.userId)]);

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
}, (table) => [uniqueIndex('subjects_org_name').on(table.organizationId, table.name)]);

export const classGroups = sqliteTable('class_groups', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  schoolYearId: text('school_year_id').notNull().references(() => schoolYears.id, { onDelete: 'cascade' }),
  campusId: text('campus_id').references(() => campuses.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['class', 'support', 'language', 'activity'] }).notNull().default('class'),
  level: text('level'),
  capacity: integer('capacity'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('class_groups_year_name').on(table.schoolYearId, table.name),
  index('class_groups_org').on(table.organizationId),
]);

export const studentEnrollments = sqliteTable('student_enrollments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  schoolYearId: text('school_year_id').notNull().references(() => schoolYears.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references(() => classGroups.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['enrolled', 'left', 'completed'] }).notNull().default('enrolled'),
  startsOn: text('starts_on'),
  endsOn: text('ends_on'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('enrollments_student_year_group').on(table.studentId, table.schoolYearId, table.groupId),
  index('enrollments_org').on(table.organizationId),
]);

export const teacherAssignments = sqliteTable('teacher_assignments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => teachers.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  schoolYearId: text('school_year_id').notNull().references(() => schoolYears.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('teacher_assignments_unique').on(table.teacherId, table.groupId, table.subjectId, table.schoolYearId),
  index('teacher_assignments_org').on(table.organizationId),
]);

export const cnedTemplates = sqliteTable('cned_templates', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  schoolYearId: text('school_year_id').notNull().references(() => schoolYears.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: text('level'),
  formula: text('formula'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  sourceTemplateId: text('source_template_id'),
  createdAt: text('created_at').notNull(),
  publishedAt: text('published_at'),
}, (table) => [
  uniqueIndex('cned_templates_year_name_version').on(table.schoolYearId, table.name, table.version),
  index('cned_templates_org').on(table.organizationId),
]);

export const cnedTemplateSubjects = sqliteTable('cned_template_subjects', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull().references(() => cnedTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ownerTeacherId: text('owner_teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  state: text('state', { enum: ['to_fill', 'submitted', 'validated'] }).notNull().default('to_fill'),
  position: integer('position').notNull().default(0),
}, (table) => [
  uniqueIndex('cned_subjects_template_name').on(table.templateId, table.name),
  index('cned_subjects_teacher').on(table.ownerTeacherId),
]);

export const cnedAssignmentDefinitions = sqliteTable('cned_assignment_definitions', {
  id: text('id').primaryKey(),
  templateSubjectId: text('template_subject_id').notNull().references(() => cnedTemplateSubjects.id, { onDelete: 'cascade' }),
  reference: text('reference').notNull(),
  title: text('title').notNull().default(''),
  position: integer('position').notNull().default(0),
  officialDueDate: text('official_due_date'),
}, (table) => [
  uniqueIndex('cned_defs_subject_ref').on(table.templateSubjectId, table.reference),
  index('cned_defs_subject').on(table.templateSubjectId),
]);

export const cnedGroupSchedules = sqliteTable('cned_group_schedules', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => classGroups.id, { onDelete: 'cascade' }),
  assignmentDefinitionId: text('assignment_definition_id').notNull().references(() => cnedAssignmentDefinitions.id, { onDelete: 'cascade' }),
  targetDate: text('target_date'),
}, (table) => [uniqueIndex('cned_group_sched_unique').on(table.groupId, table.assignmentDefinitionId)]);

export const studentCnedEnrollments = sqliteTable('student_cned_enrollments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull().references(() => cnedTemplates.id, { onDelete: 'restrict' }),
  schoolYearId: text('school_year_id').notNull().references(() => schoolYears.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'closed'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('cned_enroll_student_template').on(table.studentId, table.templateId),
  index('cned_enroll_org').on(table.organizationId),
]);

export const studentCnedSubjects = sqliteTable('student_cned_subjects', {
  enrollmentId: text('enrollment_id').notNull().references(() => studentCnedEnrollments.id, { onDelete: 'cascade' }),
  templateSubjectId: text('template_subject_id').notNull().references(() => cnedTemplateSubjects.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.enrollmentId, table.templateSubjectId] })]);

export const studentCnedAssignments = sqliteTable('student_cned_assignments', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  enrollmentId: text('enrollment_id').notNull().references(() => studentCnedEnrollments.id, { onDelete: 'cascade' }),
  assignmentDefinitionId: text('assignment_definition_id').notNull().references(() => cnedAssignmentDefinitions.id, { onDelete: 'restrict' }),
  status: text('status', { enum: ['todo', 'in_progress', 'ready', 'sent_declared', 'verified', 'corrected', 'not_required'] }).notNull().default('todo'),
  targetDate: text('target_date'),
  targetOverride: integer('target_override', { mode: 'boolean' }).notNull().default(false),
  declaredSentAt: text('declared_sent_at'),
  declaredBy: text('declared_by'),
  verifiedBy: text('verified_by'),
  verifiedAt: text('verified_at'),
  correctedAt: text('corrected_at'),
  score: text('score'),
  helpRequested: integer('help_requested', { mode: 'boolean' }).notNull().default(false),
  lastEventAt: text('last_event_at'),
  version: integer('version').notNull().default(1),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('sca_enrollment_def').on(table.enrollmentId, table.assignmentDefinitionId),
  index('sca_org_status').on(table.organizationId, table.status),
]);

export const cnedStatusEvents = sqliteTable('cned_status_events', {
  id: text('id').primaryKey(),
  studentAssignmentId: text('student_assignment_id').notNull().references(() => studentCnedAssignments.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  source: text('source', { enum: ['student', 'guardian', 'school', 'import', 'system'] }).notNull(),
  actorUserId: text('actor_user_id'),
  note: text('note'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('cned_events_assignment').on(table.studentAssignmentId, table.createdAt)]);

export const records = sqliteTable('records', {
  tenantId: text('tenant_id').notNull(),
  id: text('id').notNull(),
  kind: text('kind').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull(),
  version: integer('version').notNull().default(1),
}, (table) => [
  primaryKey({ columns: [table.tenantId, table.id] }),
  index('records_tenant_kind').on(table.tenantId, table.kind),
  index('records_tenant_created').on(table.tenantId, table.createdAt),
]);

export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  recordId: text('record_id').notNull(),
  before: text('before'),
  after: text('after'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('audit_tenant_created').on(table.tenantId, table.createdAt)]);
