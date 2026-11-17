// Optional tools pack: panels, split views, a menu bar, a dual list, readouts and timers, paper and
// before-and-after views, colour parts and maths parts. CSS: dist/xsenze-tools.css.
// Browser: load dist/xsenze-tools.min.js after dist/xsenze.min.js.
// Bundlers: import Xsenze from '@sfj/ui-kit'; import tools from '@sfj/ui-kit/tools'; Xsenze.use(tools);
import { initSplits } from './split.js';
import { initMenubars } from './menubar.js';
import { initDuallists } from './duallist.js';
import { initReadouts, initTimers } from './readout.js';
import { initPapers } from './paper.js';
import { initBeforeAfter } from './beforeafter.js';
import { initColors, color } from './color.js';
import { initMath, toMathML, parseMath } from './math.js';
import { initText, letters } from './text.js';

const plugin = {
  name: 'tools',
  init(root, helpers) {
    initSplits(root, helpers);
    initMenubars(root, helpers);
    initDuallists(root, helpers);
    initReadouts(root, helpers);
    initTimers(root, helpers);
    initPapers(root, helpers);
    initBeforeAfter(root, helpers);
    initColors(root, helpers);
    initMath(root, helpers);
    initText(root, helpers);
  },
  api: { color, math: { toMathML, parse: parseMath }, letters },
};

export default plugin;
export { plugin as tools };

if (typeof window !== 'undefined') {
  if (window.Xsenze && typeof window.Xsenze.use === 'function') window.Xsenze.use(plugin);
  else (window.XsenzePlugins = window.XsenzePlugins || []).push(plugin);
}
