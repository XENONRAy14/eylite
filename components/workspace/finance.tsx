'use client';

import { ArrowRight, Clock, Plus, Receipt, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableCell, TableRow } from '@/components/ui/table';
import { money, today, type RecordRow } from '@/lib/model';
import { DataTable, Pill } from './primitives';

export function FinanceView({
  invoices,
  payments,
  outstanding,
  overdue,
  totalPaid,
  totalDue,
  studentName,
  onNew,
  onCollect,
  onReceipt,
}: {
  invoices: RecordRow<'invoices'>[];
  payments: RecordRow<'payments'>[];
  outstanding: RecordRow<'invoices'>[];
  overdue: RecordRow<'invoices'>[];
  totalPaid: number;
  totalDue: number;
  studentName: (id: string) => string;
  onNew: (kind: 'invoices' | 'payments') => void;
  onCollect: (invoice: RecordRow<'invoices'>) => void;
  onReceipt: (payment: RecordRow<'payments'>) => void;
}) {
  const paid = (id: string) => payments.filter((payment) => payment.data.invoice === id).reduce((sum, payment) => sum + payment.data.amount, 0);

  return (
    <>
      <div className="finance-head">
        <div className="stat"><div className="stat-label">Total encaissé <Wallet size={20} /></div><div className="stat-value">{money(totalPaid)}</div><small>{payments.length} paiements enregistrés</small></div>
        <div className="stat"><div className="stat-label">Reste à percevoir <Clock size={20} /></div><div className="stat-value">{money(totalDue)}</div><small>{outstanding.length} échéances non soldées</small></div>
        <div className="finance-actions">
          <button className="button primary" onClick={() => onNew('payments')}><Plus size={17} />Enregistrer un paiement</button>
          <button className="button secondary" onClick={() => onNew('invoices')}><Plus size={17} />Créer une échéance</button>
        </div>
      </div>
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Échéances</TabsTrigger>
          <TabsTrigger value="payments">Encaissements & reçus</TabsTrigger>
          <TabsTrigger value="late">Impayés ({overdue.length})</TabsTrigger>
        </TabsList>
        {(['invoices', 'late'] as const).map((tab) => (
          <TabsContent value={tab} key={tab}>
            <section className="panel">
              <DataTable headers={['Élève', 'Libellé', 'Échéance', 'Montant', 'Reste', 'Statut', '']}>
                {(tab === 'late' ? overdue : invoices).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{studentName(invoice.data.student)}</TableCell>
                    <TableCell>{invoice.data.label}</TableCell>
                    <TableCell>{invoice.data.due}</TableCell>
                    <TableCell>{money(invoice.data.amount)}</TableCell>
                    <TableCell><b>{money(invoice.data.amount - paid(invoice.id))}</b></TableCell>
                    <TableCell><Pill tone={paid(invoice.id) >= invoice.data.amount ? 'green' : 'orange'}>{paid(invoice.id) >= invoice.data.amount ? 'Soldé' : invoice.data.due < today() ? 'En retard' : 'À régler'}</Pill></TableCell>
                    <TableCell>{paid(invoice.id) < invoice.data.amount && <button className="text-button" onClick={() => onCollect(invoice)}>Encaisser <ArrowRight size={15} /></button>}</TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </section>
          </TabsContent>
        ))}
        <TabsContent value="payments">
          <section className="panel">
            <DataTable headers={['Élève', 'Date', 'Mode', 'Montant', 'Reçu']}>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{studentName(payment.data.student)}</TableCell>
                  <TableCell>{payment.data.date}</TableCell>
                  <TableCell>{payment.data.method}</TableCell>
                  <TableCell><b>{money(payment.data.amount)}</b></TableCell>
                  <TableCell><button className="text-button" onClick={() => onReceipt(payment)}><Receipt size={16} />Voir le reçu</button></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
