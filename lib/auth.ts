import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string | null;
};

const createAuth = () => {
  if (!env.DB) throw new Error('STORAGE');
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: 'sqlite' }),
    secret: (env as unknown as { BETTER_AUTH_SECRET?: string }).BETTER_AUTH_SECRET || 'eylite-dev-secret',
    emailAndPassword: { enabled: true, requireEmailVerification: false, autoSignIn: true },
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },
  });
};

let instance: ReturnType<typeof createAuth> | null = null;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: request.headers }).catch(() => null);
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.name || session.user.email,
    fullName: session.user.name || null,
  };
}
