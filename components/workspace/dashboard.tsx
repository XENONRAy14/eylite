'use client';

import { ArrowRight, ArrowUpRight, CalendarDays, Globe, Layers, UserPlus, Wallet, type LucideIcon } from 'lucide-react';
import { initials, shortDay } from '@/lib/display';
import { money, programs, type RecordRow } from '@/lib/model';
export type DashboardStat = [string, string | number, string, LucideIcon, string];

export function DashboardView({
  stats,
  sessions,
  date,
  selectedWeek,
  overdue,
  cnedLate,
  pendingLeads,
  students,
  payments,
  studentName,
  groupName,
  teacherName,
  setDate,
  onCall,
  onNavigate,
  onReceipt,
}: {
  stats: DashboardStat[];
  sessions: RecordRow<'sessions'>[];
  date: string;
  selectedWeek: string[];
  overdue: RecordRow<'invoices'>[];
  cnedLate: RecordRow<'cned'>[];
  pendingLeads: number;
  students: RecordRow<'students'>[];
  payments: RecordRow<'payments'>[];
  studentName: (id: string) => string;
  groupName: (id: string) => string;
  teacherName: (id: string) => string;
  setDate: (date: string) => void;
  onCall: (session: RecordRow<'sessions'>) => void;
  onNavigate: (view: string) => void;
  onReceipt: (payment: RecordRow<'payments'>) => void;
}) {
  return (
    <>
      <div className="stat-grid">
        {stats.map(([label, value, sub, Icon, tone]) => (
          <div className="stat" key={label}>
            <div className="stat-label">{label}<span className={`stat-icon ${tone}`}><Icon size={18} /></span></div>
            <div className="stat-value">{value}</div>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel agenda">
          <div className="panel-head">
            <div><h2>Le programme du jour</h2><span className="muted">{sessions.length} séances prévues</span></div>
            <input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Date du planning" />
          </div>
          <div className="day-ribbon">
            {selectedWeek.map((day) => (
              <button className={date === day ? 'active' : ''} key={day} onClick={() => setDate(day)}>
                <small>{shortDay(day)}</small><b>{Number(day.slice(-2))}</b>
              </button>
            ))}
          </div>
          <div className="agenda-list">
            {sessions.length ? sessions.map((session, index) => (
              <div className="agenda-row" key={session.id}>
                <div className="time"><b>{session.data.start}</b><small>{session.data.end}</small></div>
                <div className={`lesson-stripe color-${index}`} />
                <div className="lesson-info"><strong>{session.data.subject}</strong><span>{groupName(session.data.group)} <span className="separator">·</span> {teacherName(session.data.teacher)}</span></div>
                <span className="room">{session.data.room}</span>
                <button className="text-button" onClick={() => onCall(session)}>Faire l’appel <ArrowRight size={15} /></button>
              </div>
            )) : <div className="empty compact">Aucune séance pour cette journée.</div>}
          </div>
          <button className="panel-footer" onClick={() => onNavigate('sessions')}>Voir l’emploi du temps complet <ArrowRight size={16} /></button>
        </section>
        <section className="panel attention">
          <div className="panel-head"><h2>À votre attention</h2><span className="count-bubble">{overdue.length + cnedLate.length}</span></div>
          <button className="attention-item" onClick={() => onNavigate('finance')}><span className="notice-icon orange"><Wallet size={20} /></span><div><strong>{overdue.length} échéances en retard</strong><p>Faire le point sur les règlements</p><span>Consulter les impayés <ArrowRight size={14} /></span></div></button>
          <button className="attention-item" onClick={() => onNavigate('cned')}><span className="notice-icon purple"><Globe size={20} /></span><div><strong>{cnedLate.length} devoirs CNED à suivre</strong><p>Des échéances demandent votre attention</p><span>Ouvrir le suivi CNED <ArrowRight size={14} /></span></div></button>
          <button className="attention-item" onClick={() => onNavigate('leads')}><span className="notice-icon blue"><UserPlus size={20} /></span><div><strong>{pendingLeads} candidatures en cours</strong><p>Accompagnez les prochaines inscriptions</p><span>Voir les admissions <ArrowRight size={14} /></span></div></button>
          <div className="reentry"><CalendarDays size={20} /><div><strong>Date consultée</strong><p>{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))}</p></div></div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Une école, plusieurs parcours</h2><span className="muted">Répartition des élèves actifs</span></div><Layers size={20} /></div>
          <div className="program-bars">
            {programs.map((program, index) => {
              const count = students.filter((student) => student.data.program === program).length;
              return (
                <div className="program-row" key={program}>
                  <span className={`program-dot color-${index}`} /><span>{program}</span>
                  <div className="bar-track"><div className={`color-${index}`} style={{ width: `${students.length ? count / students.length * 100 : 0}%` }} /></div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Derniers encaissements</h2><button className="text-button" onClick={() => onNavigate('finance')}>Tout voir <ArrowUpRight size={16} /></button></div>
          {payments.slice(0, 4).map((payment) => (
            <button key={payment.id} className="payment-row" onClick={() => onReceipt(payment)}>
              <span className="avatar">{initials(studentName(payment.data.student))}</span>
              <div><strong>{studentName(payment.data.student)}</strong><small>{payment.data.method} · {payment.data.date.split('-').reverse().join('/')}</small></div>
              <b>{money(payment.data.amount)}</b>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
