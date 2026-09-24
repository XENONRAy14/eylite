export type CnedStatus = 'todo' | 'in_progress' | 'ready' | 'sent_declared' | 'verified' | 'corrected' | 'not_required';
export type CnedSource = 'student' | 'guardian' | 'school' | 'import' | 'system';

const DECLARABLE: CnedStatus[] = ['in_progress', 'ready', 'sent_declared'];
const STAFF_ONLY: CnedStatus[] = ['verified', 'corrected', 'not_required'];

export function canTransition(from: CnedStatus, to: CnedStatus, byStaff: boolean): boolean {
  if (from === to) return false;
  if (to === 'todo') return byStaff;
  if (DECLARABLE.includes(to)) return true;
  if (STAFF_ONLY.includes(to)) return byStaff;
  return false;
}
