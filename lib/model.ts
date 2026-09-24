import { z } from 'zod';
const str=z.string().trim().min(1).max(300);const optional=z.string().max(1000).default('');
export const programs=['Programme français','Programme algérien','CNED','Soutien scolaire','Langues','Formation professionnelle'];
export const cnedStates=['À venir','À faire','En cours','À vérifier','Prêt à envoyer','Envoyé','Correction en attente','Corrigé'];
export const schemas={
 students:z.object({name:str,group:str,program:z.enum(programs as [string,...string[]]),campus:str,guardian:optional,phone:optional,status:z.enum(['Actif','Préinscrit','Archivé']).default('Actif')}),
 teachers:z.object({name:str,subject:str,phone:optional,campus:str}),
 groups:z.object({name:str,program:str,campus:str,capacity:z.coerce.number().int().min(1).max(500)}),
 sessions:z.object({subject:str,group:str,teacher:str,room:str,date:z.string().date(),start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),campus:str}).refine(v=>v.start<v.end,'La fin doit être après le début'),
 invoices:z.object({student:str,label:str,amount:z.coerce.number().positive().max(100000000),due:z.string().date(),campus:str}),
 payments:z.object({student:str,invoice:str,amount:z.coerce.number().positive().max(100000000),method:z.enum(['Espèces','Chèque','Virement','CCP','BaridiMob','BaridPay','CIB','Edahabia','Autre']),date:z.string().date(),campus:str}),
 grades:z.object({student:str,subject:str,title:str,score:z.coerce.number().min(0),scale:z.coerce.number().positive().max(100),coefficient:z.coerce.number().positive().max(20),source:z.enum(['INTERNAL','CNED','OFFICIAL_EXAM','EXTERNAL']),campus:str}).refine(v=>v.score<=v.scale,'La note dépasse le barème'),
 homework:z.object({title:str,subject:str,group:str,due:z.string().date(),instructions:optional,campus:str}),
 cned:z.object({student:str,subject:str,title:str,due:z.string().date(),status:z.enum(cnedStates as [string,...string[]]),formula:z.enum(['Classe complète réglementée','Classe complète libre','Cours à la carte réglementés','Cours à la carte libres','Scolarité complémentaire internationale']),score:z.union([z.literal(''),z.coerce.number().min(0).max(20)]).default(''),campus:str}),
 leads:z.object({name:str,program:str,phone:optional,source:z.enum(['Facebook','Instagram','Téléphone','Recommandation','Passage sur place','Site','Autre']),status:z.enum(['Prospect','Contacté','Dossier incomplet','Dossier complet','Accepté','Inscrit']),campus:str}),
 announcements:z.object({title:str,body:str,target:z.enum(['Tous','Parents','Enseignants','Élèves']),campus:str}),
 attendance:z.object({student:str,session:str,status:z.enum(['Présent','Absent','Retard','Excusé','Sortie anticipée','Absence justifiée']),campus:str}),
 settings:z.object({name:str,year:str,cned:z.boolean(),finance:z.boolean(),admissions:z.boolean()})
};
export type Kind=keyof typeof schemas;
export type DataByKind={ [K in Kind]: z.infer<(typeof schemas)[K]> };
export type RecordRow<K extends Kind=Kind>=K extends Kind?{id:string;kind:K;data:DataByKind[K];createdAt:string;version:number}:never;
export const money=(n:number)=>new Intl.NumberFormat('fr-DZ',{maximumFractionDigits:0}).format(n)+' DA';
export const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Algiers'});
