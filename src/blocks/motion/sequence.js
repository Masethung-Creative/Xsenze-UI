// Sequence: plays a scripted demo when a third of it is on screen.
//   data-xz-sequence="160"   milliseconds between steps
//   data-xz-loop="4000"      replay after this pause, while it stays on screen
//   data-xz-step="300"       on a step: wait this much longer before it
// Each step gets .is-in and the group gets .is-done at the end; components style those states.
import { $$, ready, fire, motionOn, onMotion, watch } from '../shared.js';

export function initSequences(root) {
  for (const seq of $$('[data-xz-sequence]', root)) {
    if (ready(seq, 'Sequence')) continue;
    const steps = $$('[data-xz-step]', seq).filter((s) => s.closest('[data-xz-sequence]') === seq);
    steps.forEach((s, i) => s.style.setProperty('--xz-i', String(i)));
    const gap = parseInt(seq.getAttribute('data-xz-sequence'), 10) || 160;
    const hold = seq.hasAttribute('data-xz-loop') ? parseInt(seq.getAttribute('data-xz-loop'), 10) || 4000 : 0;
    let timers = [];
    let visible = false;
    let played = false;

    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finish = () => {
      clear();
      seq.classList.remove('is-armed');
      steps.forEach((s) => s.classList.add('is-in'));
      seq.classList.add('is-done');
    };
    const arm = () => {
      clear();
      seq.classList.remove('is-done');
      steps.forEach((s) => s.classList.remove('is-in'));
      seq.classList.add('is-armed');
    };
    const play = () => {
      if (!motionOn()) return finish();
      arm();
      played = true;
      let t = 240;
      steps.forEach((s, i) => {
        t += parseInt(s.getAttribute('data-xz-step'), 10) || 0;
        later(() => {
          s.classList.add('is-in');
          fire(seq, 'xz:sequence', { index: i, done: false });
        }, t);
        t += gap;
      });
      later(() => {
        seq.classList.add('is-done');
        fire(seq, 'xz:sequence', { index: steps.length - 1, done: true });
        if (hold) later(() => visible && play(), hold);
      }, t + 200);
    };

    if (motionOn()) arm();
    else finish();
    watch(
      seq,
      (v) => {
        visible = v;
        if (v && (!played || hold) && !timers.length) play();
        // A looping demo stops off screen and starts again from the top when it comes back.
        if (!v && hold && motionOn()) arm();
      },
      { threshold: 0.35 },
    );
    onMotion((on) => (on ? visible && play() : finish()));
    seq.xzSequence = { play, finish };
  }
}
