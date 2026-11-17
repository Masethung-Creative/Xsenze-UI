// Maths: plain text such as sqrt(x^2+1)/(2x) read into a tree and written out as MathML, which every current
// browser draws and screen readers can speak. Also the maths field (a text box with live notation) and
// the maths keypad (keys that type into it).
import { $, $$, ready, fire, nextId, esc } from '../shared.js';

const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', infinity: '∞', inf: '∞' };
const FUNCS = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'ln', 'log', 'exp', 'min', 'max', 'gcd', 'lcm', 'floor', 'ceil', 'round', 'det']);
const SPECIAL = new Set(['sqrt', 'cbrt', 'root', 'abs', 'sum', 'prod', 'int', 'lim', 'diff', 'ncr', 'npr']);
const INVERSE = { asin: 'sin', acos: 'cos', atan: 'tan' };
const SYMBOLS = { '×': '*', '·': '*', '÷': '/', '−': '-', '≤': '<=', '≥': '>=', '≠': '!=', '→': '->', '√': 'sqrt', π: 'pi', '∞': 'inf' };
const RELATIONS = { '=': '=', '<': '<', '>': '>', '<=': '≤', '>=': '≥', '!=': '≠', '≈': '≈', '->': '→' };

function tokenize(src) {
  const out = [];
  const s = String(src);
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) {
      out.push({ t: 'num', v: num[1] });
      i += num[1].length;
      continue;
    }
    const word = /^[A-Za-zͰ-Ͽ]+/.exec(s.slice(i));
    if (word) {
      out.push({ t: 'name', v: word[0] });
      i += word[0].length;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (['<=', '>=', '!=', '->'].includes(two)) {
      out.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    const mapped = SYMBOLS[c];
    if (mapped) out.push(/^[a-z]+$/.test(mapped) ? { t: 'name', v: mapped } : { t: 'op', v: mapped });
    else if ('+-*/^()_,=<>!|%°±≈'.includes(c)) out.push({ t: 'op', v: c });
    else throw new Error(`Unexpected “${c}”`);
    i++;
  }
  return out;
}

// Names: known functions and Greek letters stay whole; other words are letters multiplied together (xy is x·y).
function splitNames(tokens) {
  const out = [];
  for (const tk of tokens) {
    if (tk.t !== 'name' || FUNCS.has(tk.v) || SPECIAL.has(tk.v) || GREEK[tk.v] || tk.v === 'mod') {
      out.push(tk);
      continue;
    }
    let rest = tk.v;
    while (rest) {
      const known = [...FUNCS, ...SPECIAL, ...Object.keys(GREEK)].filter((k) => rest.startsWith(k)).sort((a, b) => b.length - a.length)[0];
      const take = known || rest[0];
      out.push({ t: 'name', v: take });
      rest = rest.slice(take.length);
    }
  }
  return out;
}

export function parseMath(src) {
  const tokens = splitNames(tokenize(src));
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v) => peek()?.t === 'op' && peek().v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new Error(peek() ? `Expected “${v}” before “${peek().v}”` : `Missing “${v}”`);
    p++;
  };
  const startsAtom = () => {
    const tk = peek();
    return tk && (tk.t === 'num' || tk.t === 'name' || (tk.t === 'op' && (tk.v === '(' || tk.v === '|')));
  };

  const relation = () => {
    let left = additive();
    while (peek()?.t === 'op' && RELATIONS[peek().v]) {
      const op = tokens[p++].v;
      left = { k: 'bin', op: RELATIONS[op], a: left, b: additive() };
    }
    return left;
  };
  const additive = () => {
    let left = term();
    while (isOp('+') || isOp('-') || isOp('±')) {
      const op = tokens[p++].v;
      left = { k: 'bin', op: op === '-' ? '−' : op, a: left, b: term() };
    }
    return left;
  };
  const term = () => {
    let left = unary();
    for (;;) {
      if (isOp('*')) {
        p++;
        left = { k: 'mul', a: left, b: unary(), shown: true };
      } else if (isOp('/')) {
        p++;
        left = { k: 'frac', a: left, b: unary() };
      } else if (peek()?.t === 'name' && peek().v === 'mod') {
        p++;
        left = { k: 'bin', op: 'mod', a: left, b: unary() };
      } else if (startsAtom() && !(isOp('|') && openBars > 0)) {
        left = { k: 'mul', a: left, b: unary() };
      } else return left;
    }
  };
  const unary = () => {
    if (isOp('-') || isOp('+') || isOp('±')) {
      const op = tokens[p++].v;
      return { k: 'neg', op: op === '-' ? '−' : op, a: unary() };
    }
    return power();
  };
  const power = () => {
    const base = postfix();
    if (isOp('^')) {
      p++;
      return { k: 'sup', a: base, b: unary() };
    }
    return base;
  };
  const postfix = () => {
    let node = atom();
    for (;;) {
      if (isOp('!') || isOp('%') || isOp('°')) node = { k: 'post', a: node, op: tokens[p++].v };
      else if (isOp('_')) {
        p++;
        node = { k: 'sub', a: node, b: atom() };
      } else return node;
    }
  };
  let openBars = 0;
  const args = () => {
    expect('(');
    const list = [relation()];
    while (isOp(',')) {
      p++;
      list.push(relation());
    }
    expect(')');
    return list;
  };
  const atom = () => {
    const tk = peek();
    if (!tk) throw new Error('Something is missing at the end');
    if (tk.t === 'num') {
      p++;
      return { k: 'num', v: tk.v };
    }
    if (tk.t === 'op' && tk.v === '(') {
      p++;
      const inner = relation();
      expect(')');
      return { k: 'group', a: inner };
    }
    if (tk.t === 'op' && tk.v === '|') {
      p++;
      openBars++;
      const inner = relation();
      openBars--;
      expect('|');
      return { k: 'abs', a: inner };
    }
    if (tk.t === 'name') {
      p++;
      const v = tk.v;
      if (SPECIAL.has(v) || FUNCS.has(v)) {
        let sub = null;
        if (isOp('_')) {
          p++;
          sub = atom();
        }
        if (SPECIAL.has(v)) {
          if (v === 'sqrt' && !isOp('(')) return { k: 'sqrt', a: postfix() };
          const list = args();
          if (v === 'sqrt' || v === 'abs') return { k: v, a: list[0] };
          return { k: v, args: list, sub };
        }
        const a = isOp('(') ? args() : [power()];
        return { k: 'fn', name: v, args: a, sub };
      }
      return { k: 'id', v: GREEK[v] || v };
    }
    throw new Error(`Unexpected “${tk.v}”`);
  };

  if (!tokens.length) return null;
  const tree = relation();
  if (p < tokens.length) throw new Error(`Unexpected “${tokens[p].v}”`);
  return tree;
}

// ---------- MathML ----------
const mo = (s) => `<mo>${esc(s)}</mo>`;
const mrow = (s) => `<mrow>${s}</mrow>`;
const strip = (n) => (n && n.k === 'group' ? n.a : n);
const paren = (s) => mrow(`${mo('(')}${s}${mo(')')}`);
const startsWithNumber = (n) => {
  while (n && ['mul', 'bin', 'frac', 'sup', 'sub', 'post'].includes(n.k)) n = n.a;
  return n?.k === 'num' || n?.k === 'neg';
};

function ml(n) {
  if (!n) return '';
  switch (n.k) {
    case 'num':
      return `<mn>${esc(n.v)}</mn>`;
    case 'id':
      return `<mi>${esc(n.v)}</mi>`;
    case 'group':
      return paren(ml(n.a));
    case 'bin':
      return mrow(`${ml(n.a)}${mo(n.op)}${ml(n.b)}`);
    case 'neg':
      return mrow(`${mo(n.op)}${ml(n.a)}`);
    case 'mul':
      return mrow(`${ml(n.a)}${n.shown && startsWithNumber(n.b) ? mo('×') : '<mo>&#x2062;</mo>'}${ml(n.b)}`);
    case 'frac':
      return `<mfrac>${mrow(ml(strip(n.a)))}${mrow(ml(strip(n.b)))}</mfrac>`;
    case 'sup': {
      const base = ['frac', 'bin', 'neg', 'mul', 'sup'].includes(n.a.k) ? paren(ml(n.a)) : ml(n.a);
      return `<msup>${mrow(base)}${mrow(ml(strip(n.b)))}</msup>`;
    }
    case 'sub':
      return `<msub>${mrow(ml(n.a))}${mrow(ml(strip(n.b)))}</msub>`;
    case 'post':
      return mrow(`${ml(n.a)}${mo(n.op)}`);
    case 'abs':
      return mrow(`${mo('|')}${ml(n.a)}${mo('|')}`);
    case 'sqrt':
      return `<msqrt>${ml(n.a)}</msqrt>`;
    case 'cbrt':
      return `<mroot>${mrow(ml(n.args[0]))}<mn>3</mn></mroot>`;
    case 'root':
      return n.args.length > 1 ? `<mroot>${mrow(ml(n.args[1]))}${mrow(ml(n.args[0]))}</mroot>` : `<msqrt>${ml(n.args[0])}</msqrt>`;
    case 'fn': {
      const inv = INVERSE[n.name];
      let name = inv ? `<msup><mi>${inv}</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup>` : `<mi>${n.name}</mi>`;
      if (n.sub) name = `<msub>${name}${mrow(ml(strip(n.sub)))}</msub>`;
      const one = n.args.length === 1 && ['id', 'num'].includes(n.args[0].k);
      const inner = n.args.map(ml).join(mo(','));
      return mrow(`${name}<mo>&#x2061;</mo>${one ? inner : paren(inner)}`);
    }
    case 'sum':
    case 'prod': {
      const [lo, hi, body] = n.args.length === 3 ? n.args : [null, null, n.args[0]];
      const sign = n.k === 'sum' ? '∑' : '∏';
      const op = lo ? `<munderover>${mo(sign)}${mrow(ml(lo))}${mrow(ml(hi))}</munderover>` : mo(sign);
      return mrow(`${op}${ml(body)}`);
    }
    case 'int': {
      // int(f), int(f, x), int(a, b, f) and int(a, b, f, x)
      const a = n.args;
      const [lo, hi, body, v] = a.length >= 3 ? a : [null, null, a[0], a[1]];
      const sign = lo ? `<msubsup>${mo('∫')}${mrow(ml(lo))}${mrow(ml(hi))}</msubsup>` : mo('∫');
      return mrow(`${sign}${ml(body)}${v ? `<mo>&#x2062;</mo><mi>d</mi>${ml(v)}` : ''}`);
    }
    case 'lim': {
      const [under, body] = n.args;
      return mrow(`<munder><mi>lim</mi>${mrow(ml(under))}</munder>${ml(body)}`);
    }
    case 'diff': {
      const [body, v] = n.args;
      return mrow(`<mfrac><mi>d</mi>${mrow(`<mi>d</mi>${ml(v || { k: 'id', v: 'x' })}`)}</mfrac>${['group', 'id', 'num'].includes(body.k) ? ml(body) : paren(ml(body))}`);
    }
    case 'ncr':
      return paren(`<mfrac linethickness="0">${mrow(ml(n.args[0]))}${mrow(ml(n.args[1]))}</mfrac>`);
    case 'npr':
      return `<mmultiscripts><mi>P</mi>${mrow(ml(n.args[1]))}<none/><mprescripts/>${mrow(ml(n.args[0]))}<none/></mmultiscripts>`;
    default:
      return '';
  }
}

/** Plain maths text as a MathML string. Throws an Error with a short reason when the text cannot be read. */
export function toMathML(src, { block = false } = {}) {
  const tree = parseMath(src);
  return `<math${block ? ' display="block"' : ''} alttext="${esc(String(src).trim())}">${tree ? ml(tree) : ''}</math>`;
}

export function initMathViews(root) {
  for (const el of $$('[data-xz-math]', root)) {
    if (ready(el, 'Math')) continue;
    const src = el.getAttribute('data-xz-math') || el.textContent;
    el.classList.add('xz-math');
    try {
      el.innerHTML = toMathML(src, { block: el.classList.contains('xz-math--block') });
    } catch (err) {
      el.classList.add('is-error');
      el.title = err.message;
    }
  }
}

// ---------- maths field and keypad ----------
const KEYS = {
  '123': [
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/', 'divide', 'op'], ['(', '(', 'open bracket', 'op'], [')', ')', 'close bracket', 'op'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*', 'times', 'op'], ['x²', '^2', 'squared', 'op'], ['xⁿ', '^(|)', 'power', 'op'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-', 'minus', 'op'], ['√', 'sqrt(|)', 'square root', 'op'], ['a/b', '(|)/()', 'fraction', 'op'],
    ['0', '0'], ['.', '.', 'point'], ['π', 'pi', 'pi'], ['+', '+', 'plus', 'op'], ['=', '=', 'equals', 'op'], ['x', 'x', 'x'],
  ],
  'f(x)': [
    ['sin', 'sin(|)', 'sine', 'fn'], ['cos', 'cos(|)', 'cosine', 'fn'], ['tan', 'tan(|)', 'tangent', 'fn'], ['sin⁻¹', 'asin(|)', 'inverse sine', 'fn'], ['cos⁻¹', 'acos(|)', 'inverse cosine', 'fn'], ['tan⁻¹', 'atan(|)', 'inverse tangent', 'fn'],
    ['ln', 'ln(|)', 'natural log', 'fn'], ['log', 'log(|)', 'log', 'fn'], ['logₐ', 'log_(|)()', 'log to a base', 'fn'], ['eˣ', 'e^(|)', 'e to the power', 'fn'], ['10ˣ', '10^(|)', '10 to the power', 'fn'], ['x⁻¹', '^(-1)', 'inverse', 'fn'],
    ['|x|', 'abs(|)', 'absolute value', 'fn'], ['n!', '!', 'factorial', 'fn'], ['∛', 'cbrt(|)', 'cube root', 'fn'], ['ⁿ√', 'root(|, )', 'nth root', 'fn'], ['%', '%', 'per cent', 'fn'], ['°', '°', 'degrees', 'fn'],
    ['xₙ', '_(|)', 'subscript', 'fn'], ['min', 'min(|, )', 'minimum', 'fn'], ['max', 'max(|, )', 'maximum', 'fn'], ['round', 'round(|)', 'round', 'fn'], ['gcd', 'gcd(|, )', 'greatest common divisor', 'fn'], ['mod', ' mod ', 'modulo', 'fn'],
  ],
  '∑': [
    ['∑', 'sum(k=1, n, |)', 'sum', 'op'], ['∏', 'prod(k=1, n, |)', 'product', 'op'], ['∫', 'int(|, x)', 'integral', 'op'], ['∫ₐᵇ', 'int(a, b, |, x)', 'definite integral', 'op'], ['lim', 'lim(x->0, |)', 'limit', 'op'], ['d/dx', 'diff(|, x)', 'derivative', 'op'],
    ['∞', 'inf', 'infinity'], ['≤', '<=', 'less than or equal', 'op'], ['≥', '>=', 'greater than or equal', 'op'], ['≠', '!=', 'not equal', 'op'], ['≈', '≈', 'roughly equal', 'op'], ['±', '±', 'plus or minus', 'op'],
    ['nCr', 'ncr(|, )', 'combinations', 'fn'], ['nPr', 'npr(|, )', 'permutations', 'fn'], ['<', '<', 'less than', 'op'], ['>', '>', 'greater than', 'op'], ['→', '->', 'tends to', 'op'], [',', ', ', 'comma', 'op'],
    ['θ', 'theta', 'theta'], ['α', 'alpha', 'alpha'], ['β', 'beta', 'beta'], ['λ', 'lambda', 'lambda'], ['μ', 'mu', 'mu'], ['ω', 'omega', 'omega'],
  ],
  abc: 'xyztnkabcmpre'.split('').map((l) => [l, l, l]).concat([['f(x)', 'f(|)', 'f of'], ['g(x)', 'g(|)', 'g of'], ['Δ', 'Delta', 'delta'], ['σ', 'sigma', 'sigma'], ['φ', 'phi', 'phi'], ['i', 'i', 'i'], ['(', '(', 'open bracket', 'op'], [')', ')', 'close bracket', 'op'], [',', ', ', 'comma', 'op'], ['=', '=', 'equals', 'op'], ['+', '+', 'plus', 'op']]),
};
const EDIT = [['←', 'left', 'Move left'], ['→', 'right', 'Move right'], ['⌫', 'back', 'Delete'], ['AC', 'clear', 'Clear all'], ['Done', 'done', 'Done']];

/** Type a key into an input at the caret. "|" in the template marks where the caret lands; a selection goes there too. */
function insert(input, template) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const picked = input.value.slice(start, end);
  const at = template.indexOf('|');
  const text = at < 0 ? template : template.slice(0, at) + picked + template.slice(at + 1);
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const caret = start + (at < 0 ? text.length : at + picked.length);
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function initPads(root) {
  for (const pad of $$('[data-xz-mathpad]', root)) {
    if (ready(pad, 'Mathpad')) continue;
    const input = document.getElementById(pad.getAttribute('data-xz-mathpad'));
    if (!input) continue;
    pad.classList.add('xz-mathpad');
    if (!pad.hasAttribute('aria-label')) pad.setAttribute('aria-label', 'Maths keypad');
    pad.setAttribute('role', 'group');
    const id = nextId('mathpad');
    const names = Object.keys(KEYS);
    const tabs = `<div class="xz-mathpad__tabs" role="tablist" aria-label="Key sets">${names.map((n, i) => `<button class="xz-mathpad__tab" type="button" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(n)}</button>`).join('')}</div>`;
    const panels = names.map((n, i) => `<div class="xz-mathpad__keys" role="tabpanel" id="${id}-p${i}" aria-labelledby="${id}-t${i}"${i ? ' hidden' : ''}>${KEYS[n].map(([label, value, spoken, kind]) => `<button class="xz-mathpad__key${kind ? ` xz-mathpad__key--${kind}` : ''}" type="button" data-insert="${esc(value)}"${spoken && spoken !== label ? ` aria-label="${esc(spoken)}"` : ''}>${esc(label)}</button>`).join('')}</div>`).join('');
    const edit = `<div class="xz-mathpad__keys" style="--xz-mathpad-cols: 6">${EDIT.map(([label, act, spoken]) => `<button class="xz-mathpad__key xz-mathpad__key--${act === 'done' ? 'done xz-mathpad__key--wide' : 'edit'}" type="button" data-edit="${act}" aria-label="${spoken}">${label}</button>`).join('')}</div>`;
    pad.innerHTML = tabs + panels + edit;
    const tabEls = $$('[role="tab"]', pad);
    const choose = (tab, focus) => {
      tabEls.forEach((t, i) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(`${id}-p${i}`).hidden = !on;
      });
      if (focus) tab.focus();
    };
    $('[role="tablist"]', pad).addEventListener('keydown', (e) => {
      const i = tabEls.indexOf(document.activeElement);
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabEls.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      choose(tabEls[(to + tabEls.length) % tabEls.length], true);
    });
    // Pointer presses keep the focus (and the caret) in the box; keyboard presses stay on the key.
    pad.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.xz-mathpad__key') && document.activeElement === input) e.preventDefault();
    });
    pad.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab) return choose(tab);
      const key = e.target.closest('.xz-mathpad__key');
      if (!key) return;
      const pos = input.selectionStart ?? input.value.length;
      if (key.dataset.insert !== undefined) insert(input, key.dataset.insert);
      else if (key.dataset.edit === 'left' || key.dataset.edit === 'right') {
        const to = Math.max(0, Math.min(input.value.length, pos + (key.dataset.edit === 'left' ? -1 : 1)));
        input.setSelectionRange(to, to);
      } else if (key.dataset.edit === 'back') {
        const end = input.selectionEnd ?? pos;
        const from = end > pos ? pos : Math.max(0, pos - 1);
        input.value = input.value.slice(0, from) + input.value.slice(end);
        input.setSelectionRange(from, from);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (key.dataset.edit === 'clear') {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (key.dataset.edit === 'done') {
        fire(pad, 'xz:done', { value: input.value });
        pad.xzClose?.();
        input.focus();
      }
    });
  }
}

function initFields(root) {
  for (const el of $$('[data-xz-mathfield]', root)) {
    if (ready(el, 'Mathfield')) continue;
    const input = $('.xz-mathfield__input', el) || $('input', el);
    const preview = $('.xz-mathfield__preview', el);
    const toggle = $('[data-xz-mathpad-toggle]', el);
    const pad = $('[data-xz-mathpad]', el);
    if (!input) continue;
    let frame = 0;
    const draw = () => {
      frame = 0;
      if (!preview) return;
      const text = input.value.trim();
      preview.classList.remove('is-error');
      if (!text) {
        preview.textContent = '';
        return;
      }
      try {
        preview.innerHTML = toMathML(text, { block: true });
        input.removeAttribute('aria-invalid');
      } catch (err) {
        preview.classList.add('is-error');
        preview.textContent = err.message;
      }
    };
    input.addEventListener('input', () => (frame ||= requestAnimationFrame(draw)));
    input.addEventListener('change', () => {
      try {
        parseMath(input.value);
        input.removeAttribute('aria-invalid');
      } catch {
        if (input.value.trim()) input.setAttribute('aria-invalid', 'true');
      }
    });
    if (toggle && pad) {
      const keyboard = input.getAttribute('inputmode');
      const show = (on) => {
        pad.hidden = !on;
        toggle.setAttribute('aria-expanded', String(on));
        // While the keypad is open, phones keep their own keyboard away.
        if (on) input.setAttribute('inputmode', 'none');
        else if (keyboard) input.setAttribute('inputmode', keyboard);
        else input.removeAttribute('inputmode');
      };
      pad.id ||= nextId('mathpad');
      toggle.setAttribute('aria-controls', pad.id);
      pad.xzClose = () => show(false);
      toggle.addEventListener('click', () => show(pad.hidden));
      show(!pad.hidden);
    }
    el.xzMathfield = { value: () => input.value, set: (v) => ((input.value = v), draw()) };
    draw();
  }
}

export function initMath(root) {
  initMathViews(root);
  initPads(root);
  initFields(root);
}
