// Función de Netlify que envía las notificaciones push al móvil del otro.
// Se configura con variables de entorno en Netlify (ver LEEME.md):
//   ROOM, FIREBASE_DB_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from 'web-push';

export const config = { path: '/api/push' };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const clip = (s, n) => String(s ?? '').slice(0, n);

export default async req => {
  if (req.method !== 'POST') return json({ error: 'Solo POST' }, 405);
  const { ROOM, FIREBASE_DB_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!ROOM || !FIREBASE_DB_URL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return json({ error: 'Faltan variables de entorno en Netlify' }, 500);

  let b;
  try { b = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  if (b.room !== ROOM) return json({ error: 'Sala incorrecta' }, 403);
  if (!/^[a-z0-9_]{1,40}$/i.test(b.to || '')) return json({ error: 'Destinatario inválido' }, 400);

  const base = FIREBASE_DB_URL.replace(/\/+$/, '');
  const listUrl = `${base}/rooms/${ROOM}/push/${b.to}.json`;
  const res = await fetch(listUrl);
  const subs = res.ok ? (await res.json()) || {} : {};

  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:samyarmohammad7@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const url = typeof b.url === 'string' && b.url.startsWith('/') ? clip(b.url, 100) : '/';
  const payload = JSON.stringify({ title: clip(b.title, 80), body: clip(b.body, 200), url, tag: clip(b.tag, 40) || undefined });

  let sent = 0, removed = 0;
  await Promise.all(Object.entries(subs).map(async ([id, s]) => {
    const sub = s && (s.sub || s);
    if (!sub || !sub.endpoint) return;
    try {
      await webpush.sendNotification(sub, payload, { TTL: 60 * 60 * 12, urgency: 'high' });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        await fetch(`${base}/rooms/${ROOM}/push/${b.to}/${id}.json`, { method: 'DELETE' });
        removed++;
      } else console.error('push error', e.statusCode, e.body, e.message);
    }
  }));
  return json({ sent, removed });
};
