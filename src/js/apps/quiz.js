// Quiz and questionnaire: one question at a time, with progress, flags, a review grid, an optional timer
// and, for practice tests, a score with explanations.
//   <form class="xz-quiz" data-xz-quiz="practice|exam|survey" data-xz-pass="60"> fieldset.xz-quiz__question … </form>
// Without the script every question shows, as one long form. In exam mode the answers are never in the page:
// the server marks the test. In practice mode each fieldset carries data-xz-answer="b" (or "a,c").
import { $$, ready, fire, esc, store } from '../shared.js';

let H = {};
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export function initQuizzes(root, helpers) {
  H = helpers || H;
  for (const form of $$('form[data-xz-quiz]', root)) if (!ready(form, 'Quiz')) setup(form);
}

function setup(form) {
  const mode = form.getAttribute('data-xz-quiz') || 'practice';
  const questions = $$('fieldset.xz-quiz__question', form);
  if (!questions.length) return;
  form.classList.add('xz-quiz', 'is-ready');
  const icon = H.icon || (() => '');
  const saveKey = form.getAttribute('data-xz-quiz-save') ? `xz-quiz:${form.getAttribute('data-xz-quiz-save')}` : '';
  const head = document.createElement('div');
  head.className = 'xz-quiz__head';
  head.innerHTML = `<p class="xz-quiz__count" aria-live="polite"></p><div class="xz-progress xz-progress--sm" role="progressbar" aria-label="Questions answered" aria-valuemin="0" aria-valuemax="${questions.length}"><div class="xz-progress__bar"></div></div>`;
  const timerEl = form.querySelector('[data-xz-quiz-time], [data-xz-quiz-deadline]');
  form.prepend(head);
  if (timerEl) head.append(timerEl);
  const nav = document.createElement('div');
  nav.className = 'xz-quiz__nav';
  nav.innerHTML = `<button type="button" class="xz-btn" data-q="back">${icon('arrow-left', { size: 'sm' })}Back</button>
    <button type="button" class="xz-btn xz-btn--ghost" data-q="flag" aria-pressed="false">${icon('flag', { size: 'sm' })}<span>Flag for review</span></button>
    <span class="xz-quiz__spacer"></span>
    <button type="button" class="xz-btn" data-q="review">${icon('list-checks', { size: 'sm' })}Review</button>
    <button type="button" class="xz-btn xz-btn--primary" data-q="next">Next${icon('arrow-right', { size: 'sm' })}</button>`;
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  questions[questions.length - 1].after(nav);
  if (submitBtn) nav.append(submitBtn);
  const review = Object.assign(document.createElement('section'), { className: 'xz-quiz__review', hidden: true });
  review.setAttribute('aria-label', 'Review your answers');
  const result = Object.assign(document.createElement('section'), { className: 'xz-quiz__result', hidden: true });
  result.setAttribute('aria-live', 'polite');
  nav.after(review);
  // The score goes at the top, so the marked questions read below it.
  head.after(result);
  const announce = Object.assign(document.createElement('div'), { className: 'xz-sr-only' });
  announce.setAttribute('aria-live', 'assertive');
  form.append(announce);

  let at = 0;
  let confirming = false;
  let done = false;
  for (const q of questions) {
    const legend = q.querySelector('legend');
    if (legend) legend.tabIndex = -1;
  }
  const answered = (q) => $$('input, textarea, select', q).some((i) => (i.type === 'radio' || i.type === 'checkbox' ? i.checked : String(i.value || '').trim() !== ''));
  const values = () => questions.map((q) => $$('input:checked', q).map((i) => i.value));
  const show = (i, focus = true) => {
    at = Math.max(0, Math.min(questions.length - 1, i));
    questions.forEach((q, n) => (q.hidden = n !== at));
    review.hidden = true;
    nav.hidden = false;
    head.querySelector('.xz-quiz__count').textContent = `Question ${at + 1} of ${questions.length}`;
    nav.querySelector('[data-q="back"]').disabled = at === 0;
    nav.querySelector('[data-q="next"]').hidden = at === questions.length - 1;
    const flag = nav.querySelector('[data-q="flag"]');
    flag.setAttribute('aria-pressed', String(questions[at].hasAttribute('data-flagged')));
    if (submitBtn) submitBtn.hidden = at !== questions.length - 1;
    if (focus) questions[at].querySelector('legend')?.focus();
    fire(form, 'xz:step', { step: at, of: questions.length });
  };
  const progress = () => {
    const n = questions.filter(answered).length;
    head.querySelector('.xz-progress__bar').style.setProperty('--xz-progress', `${(n / questions.length) * 100}%`);
    head.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(n));
    if (saveKey) store.set(saveKey, values());
    return n;
  };
  const showReview = (note = '') => {
    review.hidden = false;
    questions.forEach((q) => (q.hidden = true));
    nav.hidden = true;
    review.innerHTML = `<h3 class="xz-quiz__review-title">Review your answers</h3>${note ? `<p class="xz-quiz__note">${esc(note)}</p>` : ''}<ol class="xz-quiz__grid">${questions
      .map((q, i) => {
        const state = q.hasAttribute('data-flagged') ? 'flagged' : answered(q) ? 'answered' : 'unanswered';
        const label = { flagged: 'Flagged', answered: 'Answered', unanswered: 'Not answered' }[state];
        return `<li><button type="button" class="xz-quiz__cell is-${state}" data-go="${i}" aria-label="Question ${i + 1}, ${label}">${i + 1}<small>${label}</small></button></li>`;
      })
      .join('')}</ol><div class="xz-quiz__nav"><button type="button" class="xz-btn" data-go="${at}">Back to question ${at + 1}</button><span class="xz-quiz__spacer"></span><button type="button" class="xz-btn xz-btn--primary" data-q="submit">Submit answers</button></div>`;
    review.querySelector('h3').tabIndex = -1;
    review.querySelector('h3').focus();
  };
  const score = () => {
    let right = 0;
    questions.forEach((q) => {
      const key = (q.getAttribute('data-xz-answer') || '').split(',').map((s) => s.trim()).filter(Boolean).sort().join(',');
      const got = $$('input:checked', q).map((i) => i.value).sort().join(',');
      const ok = key && key === got;
      if (ok) right++;
      q.classList.toggle('is-correct', Boolean(ok));
      q.classList.toggle('is-wrong', Boolean(key) && !ok);
      for (const opt of $$('.xz-quiz__option', q)) {
        const input = opt.querySelector('input');
        opt.classList.toggle('is-answer', key.split(',').includes(input?.value));
      }
    });
    return right;
  };
  const finish = (reason) => {
    if (done) return;
    const total = questions.length;
    const answers = values();
    if (mode === 'practice') {
      const right = score();
      const percent = Math.round((right / total) * 100);
      if (!fire(form, 'xz:quiz', { score: right, total, percent, answers, reason }, true)) return;
      done = true;
      const pass = Number(form.getAttribute('data-xz-pass') || 0);
      questions.forEach((q) => {
        q.hidden = false;
        q.disabled = true;
      });
      review.hidden = true;
      nav.hidden = true;
      result.hidden = false;
      result.innerHTML = `<h3 class="xz-quiz__score">${right} of ${total} correct · ${percent}%</h3>${pass ? `<p class="xz-badge ${percent >= pass ? 'xz-badge--success' : 'xz-badge--danger'}">${percent >= pass ? 'Passed' : `Not passed yet: ${pass}% needed`}</p>` : ''}<p class="xz-quiz__note">Each question below shows the right answer${questions.some((q) => q.querySelector('.xz-quiz__explain')) ? ' and why' : ''}.</p>`;
      // When time runs out, focus moves to the result only if it was in the quiz; the result is read out either way.
      const heading = result.querySelector('h3');
      heading.tabIndex = -1;
      if (reason !== 'time' || form.contains(document.activeElement)) heading.focus();
      if (saveKey) store.remove(saveKey);
      clearInterval(tick);
      return;
    }
    if (!fire(form, 'xz:quiz', { answers, total, reason }, true)) return;
    done = true;
    if (saveKey) store.remove(saveKey);
    clearInterval(tick);
    questions.forEach((q) => (q.hidden = false));
    form.requestSubmit ? form.requestSubmit() : form.submit();
  };

  form.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]')?.dataset.q;
    const go = e.target.closest('[data-go]');
    if (go) return show(Number(go.dataset.go));
    if (q === 'back') show(at - 1);
    else if (q === 'next') show(at + 1);
    else if (q === 'review') showReview();
    else if (q === 'flag') {
      questions[at].toggleAttribute('data-flagged');
      e.target.closest('[data-q]').setAttribute('aria-pressed', String(questions[at].hasAttribute('data-flagged')));
    } else if (q === 'submit') {
      confirming = true;
      finish('submit');
    }
  });
  form.addEventListener('change', progress);
  form.addEventListener('submit', (e) => {
    if (done) return;
    const left = questions.length - progress();
    // Ask once when questions are left; a second Submit sends.
    if (left && !confirming) {
      e.preventDefault();
      confirming = true;
      return showReview(`${left} question${left === 1 ? ' is' : 's are'} not answered. Submit anyway, or go back to them.`);
    }
    e.preventDefault();
    finish('submit');
  });

  // Saved answers come back after a reload.
  if (saveKey) {
    const saved = store.get(saveKey, null);
    if (Array.isArray(saved)) questions.forEach((q, i) => (saved[i] || []).forEach((v) => {
      const input = $$('input', q).find((x) => x.value === v);
      if (input) input.checked = true;
    }));
  }

  // Timer: counts down to a deadline, so a reload does not reset it. Warnings at 5 and 1 minutes.
  let tick = 0;
  if (timerEl) {
    timerEl.classList.add('xz-quiz__timer');
    timerEl.setAttribute('role', 'timer');
    const key = `xz-quiz-deadline:${form.id || form.getAttribute('data-xz-quiz-save') || location.pathname}`;
    let deadline = Date.parse(timerEl.getAttribute('data-xz-quiz-deadline') || '');
    if (!deadline) {
      try {
        deadline = Number(sessionStorage.getItem(key)) || 0;
      } catch {}
      if (!deadline) {
        deadline = Date.now() + Number(timerEl.getAttribute('data-xz-quiz-time') || 0) * 1000;
        try {
          sessionStorage.setItem(key, String(deadline));
        } catch {}
      }
    }
    // A warning is read out when the countdown passes it. One already passed at the start (a short quiz, or a reload) stays quiet.
    const warned = new Set();
    let first = true;
    const update = () => {
      const left = Math.round((deadline - Date.now()) / 1000);
      timerEl.innerHTML = `${icon('timer', { size: 'sm' })}<span>${fmt(Math.max(0, left))}</span>`;
      timerEl.classList.toggle('is-low', left <= 60);
      for (const m of [5, 1]) if (left <= m * 60 && left > 0 && !warned.has(m)) {
        warned.add(m);
        if (!first) announce.textContent = `${m} minute${m === 1 ? '' : 's'} left`;
      }
      first = false;
      if (left <= 0) {
        clearInterval(tick);
        fire(form, 'xz:timeup', {});
        try {
          sessionStorage.removeItem(key);
        } catch {}
        finish('time');
      }
    };
    update();
    tick = setInterval(update, 1000);
  }
  progress();
  show(0, false);
  form.xzQuiz = { go: show, review: showReview, submit: () => finish('submit'), answers: values, score: () => (mode === 'practice' ? score() : null) };
}
