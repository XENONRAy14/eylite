'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = mode === 'signin'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email });
      if (result.error) throw new Error(result.error.message || 'Connexion impossible.');
      router.push('/');
      router.refresh();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="empty" style={{ minHeight: '100vh' }}>
      <div className="brand"><span className="brand-mark">e</span>Eylite</div>
      <form className="record-form" onSubmit={submit} style={{ width: 340 }}>
        <h2>{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h2>
        <div className="fields" style={{ gridTemplateColumns: '1fr' }}>
          {mode === 'signup' && (
            <label>Nom complet
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>Adresse e-mail
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </label>
          <label>Mot de passe
            <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </label>
        </div>
        {error && <p style={{ color: '#b3402e' }}>{error}</p>}
        <button className="button primary" disabled={busy} type="submit">
          {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button className="text-button" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
          {mode === 'signin' ? 'Pas encore de compte ? Créer un compte' : 'Déjà inscrit ? Se connecter'}
        </button>
        <a href="/demo" className="text-button">Visiter la démonstration</a>
      </form>
    </main>
  );
}
