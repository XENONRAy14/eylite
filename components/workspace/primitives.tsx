'use client';

import type { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type PickOption = string | { id: string; name: string };

export function Pick({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: PickOption[]; label: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={typeof option === 'string' ? option : option.id} value={typeof option === 'string' ? option : option.id}>
            {typeof option === 'string' ? option : option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Pill({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <Table>
      <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
