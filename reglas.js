// Reglas de UNO y Cuarenta para dos jugadores.
// Todo es puro: cada función recibe el estado y devuelve un estado nuevo (o null si la jugada no vale).
// Las cartas se guardan como textos separados por comas para evitar problemas con listas vacías en Firebase.

export const L = s => (s ? String(s).split(',').filter(Boolean) : []);
export const S = a => a.join(',');
const clone = v => JSON.parse(JSON.stringify(v));

export function shuffle(arr) {
  const a = [...arr];
  const r = new Uint32Array(a.length);
  (globalThis.crypto || { getRandomValues: x => x.map(() => Math.floor(Math.random() * 2 ** 32)) }).getRandomValues(r);
  for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ================================================================== */
/* UNO                                                                 */
/* ================================================================== */
export const UNO_COLORS = ['r', 'y', 'g', 'b'];
export const UNO_COLOR_NAMES = { r: 'rojo', y: 'amarillo', g: 'verde', b: 'azul' };
export const ucol = id => id[0];
export const uval = id => id[1];
export const isWild = id => ucol(id) === 'w';
export const UNO_TARGET = 500;

export function unoDeck() {
  const cards = []; let n = 0;
  for (const c of UNO_COLORS) {
    cards.push(`${c}0.${n++}`);
    for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'R', 'D']) { cards.push(`${c}${v}.${n++}`); cards.push(`${c}${v}.${n++}`); }
  }
  for (let i = 0; i < 4; i++) { cards.push(`wW.${n++}`); cards.push(`wF.${n++}`); }
  return shuffle(cards);
}
export const unoPoints = id => { const v = uval(id); return /\d/.test(v) ? +v : (v === 'W' || v === 'F') ? 50 : 20; };
export const unoName = id => {
  const v = uval(id), c = UNO_COLOR_NAMES[ucol(id)];
  const name = { S: 'Salta', R: 'Reversa', D: '+2', W: 'Comodín', F: 'Comodín +4' }[v] || v;
  return c ? `${name} ${c}` : name;
};

export function unoCanPlay(st, id, hand) {
  const top = L(st.disc).at(-1);
  if (isWild(id)) {
    if (uval(id) === 'F') return !hand.some(h => h !== id && !isWild(h) && ucol(h) === st.color);
    return true;
  }
  return ucol(id) === st.color || (top && uval(id) === uval(top));
}

function unoTake(st, n) {
  const out = [];
  let deck = L(st.deck);
  for (let i = 0; i < n; i++) {
    if (!deck.length) {
      const disc = L(st.disc), top = disc.pop();
      deck = shuffle(disc); st.disc = top || '';
      if (!deck.length) break;
    }
    out.push(deck.pop());
  }
  st.deck = S(deck);
  return out;
}

export function unoNewRound(prev, P, dealer) {
  const st = {
    deck: '', disc: '', color: '', hands: {}, uno: {}, catch: '', drawn: '', winner: '', matchWinner: '',
    pts: prev?.pts && !prev.matchWinner ? prev.pts : { [P[0]]: 0, [P[1]]: 0 },
    wins: prev?.wins || { [P[0]]: 0, [P[1]]: 0 },
    dealer, n: Date.now(), ev: { id: (prev?.ev?.id || 0) + 1, text: 'Nueva ronda', kind: 'info' }, log: 'Nueva ronda: 7 cartas para cada uno',
  };
  let deck = unoDeck();
  for (const p of P) { st.hands[p] = S(deck.splice(-7)); st.uno[p] = 0; }
  // Carta inicial: un +4 no puede empezar
  let first;
  for (;;) { first = deck.pop(); if (uval(first) !== 'F') break; deck.unshift(first); deck = shuffle(deck); }
  st.deck = S(deck); st.disc = first;
  const starter = P.find(p => p !== dealer);
  st.turn = starter;
  st.color = isWild(first) ? UNO_COLORS[Math.floor(Math.random() * 4)] : ucol(first);
  const v = uval(first);
  if (v === 'S' || v === 'R') { st.turn = dealer; st.log = `Empezó con ${unoName(first)}: pierde el turno ${starter}`; }
  if (v === 'D') { const h = L(st.hands[starter]); h.push(...unoTake(st, 2)); st.hands[starter] = S(h); st.turn = dealer; st.log = `Empezó con +2: ${starter} roba 2`; }
  if (v === 'W') st.log = `Empezó con comodín: color ${UNO_COLOR_NAMES[st.color]}`;
  return st;
}

function unoFinish(st, me, other, P) {
  const pts = L(st.hands[other]).reduce((s, id) => s + unoPoints(id), 0);
  st.winner = me; st.pts[me] = (st.pts[me] || 0) + pts;
  st.ev = { id: (st.ev?.id || 0) + 1, kind: 'win', by: me, text: `ganó la ronda (+${pts})` };
  st.log = `${me} se quedó sin cartas y suma ${pts} puntos`;
  if (st.pts[me] >= UNO_TARGET) { st.matchWinner = me; st.wins[me] = (st.wins[me] || 0) + 1; }
  st.turn = '';
}

export function unoPlay(cur, P, me, id, color) {
  if (!cur || cur.winner || cur.turn !== me) return null;
  const st = clone(cur), other = P.find(p => p !== me);
  const hand = L(st.hands[me]);
  const i = hand.indexOf(id);
  if (i < 0) return null;
  if (st.drawn && st.drawn !== id) return null;
  if (!unoCanPlay(st, id, hand)) return null;
  if (isWild(id) && !UNO_COLORS.includes(color)) return null;
  hand.splice(i, 1);
  st.hands[me] = S(hand);
  st.disc = S([...L(st.disc), id]);
  st.color = isWild(id) ? color : ucol(id);
  st.drawn = '';
  const v = uval(id);
  let again = false, extra = '';
  if (v === 'S' || v === 'R') { again = true; extra = ` y ${other} pierde el turno`; }
  if (v === 'D' || v === 'F') {
    const n = v === 'D' ? 2 : 4;
    const oh = L(st.hands[other]); oh.push(...unoTake(st, n)); st.hands[other] = S(oh);
    if (st.catch === other) st.catch = '';
    st.uno[other] = 0;
    again = true; extra = ` y ${other} roba ${n}`;
  }
  if (isWild(id)) extra += ` (color ${UNO_COLOR_NAMES[color]})`;
  st.log = `${me} jugó ${unoName(id)}${extra}`;
  if (hand.length === 1) { if (!st.uno[me]) st.catch = me; }
  else { st.uno[me] = 0; if (st.catch === me) st.catch = ''; }
  if (!hand.length) { unoFinish(st, me, other, P); return st; }
  st.turn = again ? me : other;
  return st;
}

export function unoDraw(cur, P, me) {
  if (!cur || cur.winner || cur.turn !== me || cur.drawn) return null;
  const st = clone(cur), other = P.find(p => p !== me);
  const hand = L(st.hands[me]);
  const [c] = unoTake(st, 1);
  if (!c) { st.turn = other; st.log = `${me} no pudo robar (mazo vacío) y pasa`; return st; }
  hand.push(c); st.hands[me] = S(hand);
  st.uno[me] = 0; if (st.catch === me) st.catch = '';
  if (unoCanPlay(st, c, hand)) { st.drawn = c; st.log = `${me} robó una carta que puede jugar`; }
  else { st.turn = other; st.log = `${me} robó una carta y pasa`; }
  return st;
}

export function unoPass(cur, P, me) {
  if (!cur || cur.winner || cur.turn !== me || !cur.drawn) return null;
  const st = clone(cur);
  st.drawn = ''; st.turn = P.find(p => p !== me); st.log = `${me} se quedó la carta y pasa`;
  return st;
}

export function unoSayUno(cur, P, me) {
  if (!cur || cur.winner) return null;
  const n = L(cur.hands[me]).length;
  if (n > 2 || cur.uno[me]) return null;
  if (n === 2 && cur.turn !== me) return null;
  const st = clone(cur);
  st.uno[me] = 1; if (st.catch === me) st.catch = '';
  st.ev = { id: (st.ev?.id || 0) + 1, kind: 'uno', by: me, text: '¡UNO!' };
  st.log = `${me} dijo ¡UNO!`;
  return st;
}

export function unoCatch(cur, P, me) {
  if (!cur || cur.winner) return null;
  const other = P.find(p => p !== me);
  if (cur.catch !== other || L(cur.hands[other]).length !== 1) return null;
  const st = clone(cur);
  const h = L(st.hands[other]); h.push(...unoTake(st, 2)); st.hands[other] = S(h);
  st.catch = ''; st.uno[other] = 0;
  st.ev = { id: (st.ev?.id || 0) + 1, kind: 'catch', by: me, text: `¡Te pillé! ${other} roba 2` };
  st.log = `${me} pilló a ${other} sin decir UNO: roba 2`;
  return st;
}

/* ================================================================== */
/* CUARENTA                                                            */
/* ================================================================== */
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];
export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const ri = id => RANKS.indexOf(id[0]);
export const cval = id => { const r = ri(id); return r < 7 ? r + 1 : 0; };
export const cname = id => `${id[0]}${SUIT_SYM[id[1]]}`;
export const DEFAULT_RULES = { caidaLimpia4: true, carton30: false, empateDealer: true };

export function c40Deck() { const d = []; for (const r of RANKS) for (const s of SUITS) d.push(r + s); return shuffle(d); }

// Opciones para llevar cartas con la carta jugada: por pareja o por suma, y luego la escalera.
export function c40Options(tableStr, card) {
  const table = L(tableStr), r = ri(card), v = cval(card);
  const opts = [];
  const seen = new Set();
  const addOpt = (take, kind) => {
    const rest = table.filter(t => !take.includes(t));
    const ladder = [];
    let next = r + 1;
    for (;;) { const c = rest.find(t => ri(t) === next && !ladder.includes(t)); if (!c) break; ladder.push(c); next++; }
    const key = kind + ':' + take.map(ri).sort().join('-');
    if (seen.has(key)) return; seen.add(key);
    opts.push({ kind, take, ladder, all: [...take, ...ladder] });
  };
  for (const t of table) if (ri(t) === r) addOpt([t], 'par');
  if (v > 0) {
    const nums = table.filter(t => cval(t) > 0);
    const n = nums.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const pick = nums.filter((_, i) => mask & (1 << i));
      if (pick.length < 2) continue;
      if (pick.reduce((s, c) => s + cval(c), 0) === v) addOpt(pick, 'suma');
    }
  }
  opts.sort((a, b) => b.all.length - a.all.length || (a.kind === 'par' ? -1 : 1));
  return opts;
}

function ev(st, kind, by, text, pts) { st.ev = { id: (st.ev?.id || 0) + 1, kind, by, text, pts: pts || 0 }; st.events = [...(st.events || []).slice(-5), { kind, by, text }]; }

// Puntos: sin caída no se puede pasar de 38; en 38 solo la caída cuenta.
function award(st, p, pts, isCaida) {
  if (!pts || st.winner) return 0;
  const s = st.score[p] || 0;
  let ns;
  if (isCaida) ns = Math.min(40, s + pts);
  else { if (s >= 38) return 0; ns = Math.min(38, s + pts); }
  st.score[p] = ns;
  if (ns >= 40) { st.winner = p; st.chicas[p] = (st.chicas[p] || 0) + 1; st.turn = ''; }
  return ns - s;
}

function checkRondas(st, P) {
  for (const p of P) {
    const cnt = {};
    for (const c of L(st.hands[p])) cnt[c[0]] = (cnt[c[0]] || 0) + 1;
    for (const [rank, n] of Object.entries(cnt)) {
      if (n === 4) {
        st.score[p] = 40; st.winner = p; st.chicas[p] = (st.chicas[p] || 0) + 1; st.turn = '';
        ev(st, 'ronda', p, `¡Doble ronda de ${rank}! Gana la chica`); return;
      }
      if (n === 3) { const g = award(st, p, 2, false); ev(st, 'ronda', p, g ? `Ronda de ${rank} +2` : `Ronda de ${rank} (no suma en 38)`, g); }
    }
  }
}

function dealMano(st, P) {
  const deck = L(st.deck);
  for (const p of P) st.hands[p] = S(deck.splice(-5));
  st.deck = S(deck);
  st.last = null;
  st.turn = P.find(p => p !== st.dealer);
  checkRondas(st, P);
}

export function c40NewDeck(st, P, dealer) {
  st.dealer = dealer; st.deck = S(c40Deck()); st.table = ''; st.carton = { [P[0]]: 0, [P[1]]: 0 }; st.mano = 1;
  dealMano(st, P);
  return st;
}

export function c40NewChica(prev, P, dealer) {
  const st = {
    score: { [P[0]]: 0, [P[1]]: 0 }, chicas: prev?.chicas || { [P[0]]: 0, [P[1]]: 0 },
    rules: { ...DEFAULT_RULES, ...(prev?.rules || {}) }, winner: '', n: Date.now(), hands: {}, last: null,
    ev: { id: (prev?.ev?.id || 0) + 1, kind: 'info', text: 'Nueva chica' }, events: [], log: 'Nueva chica: a 40 puntos',
  };
  return c40NewDeck(st, P, dealer);
}

export function cartonPoints(n) { if (n < 20) return 0; let p = 6 + (n - 20); if (p % 2) p++; return p; }

function scoreCarton(st, P) {
  const [a, b] = P, na = st.carton[a] || 0, nb = st.carton[b] || 0;
  const lines = [];
  const give = (p, pts, why) => {
    if (st.rules.carton30 && (st.score[p] || 0) >= 30) { lines.push(`${p}: ${why}, pero con 30 o más el cartón no suma`); return; }
    const g = award(st, p, pts, false);
    lines.push(!g ? `${p}: ${why} (no suma en 38)` : g < pts ? `${p}: ${why} = ${pts}, pero sin caída solo se llega a 38 (+${g})` : `${p}: ${why} +${g}`);
  };
  if (na === nb) give(st.rules.empateDealer ? st.dealer : P.find(p => p !== st.dealer), 2, `empate ${na} a ${nb}, dos por darlas`);
  else if (na >= 20 || nb >= 20) { const w = na > nb ? a : b, n = Math.max(na, nb); give(w, cartonPoints(n), `cartón de ${n}`); }
  else { const w = na > nb ? a : b; give(w, 2, `más cartas (${Math.max(na, nb)})`); }
  ev(st, 'carton', '', `Cartón: ${a} ${na}, ${b} ${nb}. ${lines.join('. ')}`);
}

// play: optIdx = índice en c40Options, o -1 para tirar la carta sin llevar nada
export function c40Play(cur, P, me, card, optIdx) {
  if (!cur || cur.winner || cur.turn !== me) return null;
  const st = clone(cur), other = P.find(p => p !== me);
  const hand = L(st.hands[me]), i = hand.indexOf(card);
  if (i < 0) return null;
  const opts = c40Options(st.table, card);
  if (optIdx >= opts.length) return null;
  hand.splice(i, 1); st.hands[me] = S(hand);
  let table = L(st.table);
  if (optIdx < 0) {
    table.push(card); st.table = S(table);
    st.last = { by: me, card };
    st.log = `${me} tiró ${cname(card)}`;
  } else {
    const o = opts[optIdx];
    table = table.filter(t => !o.all.includes(t)); st.table = S(table);
    st.carton[me] = (st.carton[me] || 0) + 1 + o.all.length;
    const caida = o.kind === 'par' && st.last && st.last.by === other && o.take.includes(st.last.card);
    const limpia = table.length === 0;
    st.last = null;
    st.log = `${me} jugó ${cname(card)} y se llevó ${o.all.map(cname).join(' ')}`;
    if (limpia) {
      const pts = caida && !st.rules.caidaLimpia4 ? 0 : 2;
      const g = award(st, me, pts, false);
      if (pts) ev(st, 'limpia', me, g ? '¡Limpia! +2' : '¡Limpia! (no suma en 38)', g);
    }
    if (caida) { const g = award(st, me, 2, true); ev(st, 'caida', me, limpia && st.rules.caidaLimpia4 && g ? '¡Caída y limpia!' : '¡Caída! +2', g); }
  }
  if (st.winner) return st;
  st.turn = other;
  if (!L(st.hands[me]).length && !L(st.hands[other]).length) {
    if (L(st.deck).length) { st.mano = (st.mano || 1) + 1; dealMano(st, P); }
    else {
      scoreCarton(st, P);
      if (!st.winner) { const prevDealer = st.dealer; c40NewDeck(st, P, P.find(p => p !== prevDealer)); st.log = 'Se acabó el mazo: se cuenta el cartón y se reparte de nuevo'; }
    }
  }
  return st;
}
