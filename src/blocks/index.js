// Blocks: the components behind landing and marketing pages, grouped by kind.
//   navigation/    overlay navbar, scroll progress, expanding tabs
//   hero/          hero layout (CSS only)
//   content/       band, eyebrow, feature row, window, tile, checklist, command, marquee, facts
//   forms/         copy button
//   data-display/  flow diagram, compare, ledger
//   footer/        footer brand and wordmark (CSS only)
//   motion/        reveal, rotator, typewriter, sequence, beam, dot field, layers, depth, curtain, motion button
// Every behaviour starts from markup, respects reduced motion and the page's motion button,
// and leaves readable content when the script does not run.
import { motion, initMotion, syncMotionButtons } from './motion/motion.js';
import { initReveal } from './motion/reveal.js';
import { initRotators } from './motion/rotator.js';
import { initTypewriters } from './motion/typewriter.js';
import { initSequences } from './motion/sequence.js';
import { initDotfields } from './motion/dotfield.js';
import { initLayers } from './motion/layers.js';
import { initDepth } from './motion/depth.js';
import { initCurtains } from './motion/curtain.js';
import { initNavbars } from './navigation/navbar.js';
import { initScrollProgress } from './navigation/scroll-progress.js';
import { initTabsExpand } from './navigation/tabs-expand.js';
import { initMarquees } from './content/marquee.js';
import { initCopy, copy } from './forms/copy.js';
import { initFlows } from './data-display/flow.js';

let bound = false;

export function initBlocks(root, { icon }) {
  if (!bound) {
    bound = true;
    motion.restore();
    document.addEventListener('click', (e) => {
      if (e.target.closest?.('[data-xz-motion-toggle]')) motion.toggle();
    });
  }
  initMotion(root, { icon });
  initNavbars(root);
  initScrollProgress(root);
  initTabsExpand(root);
  initMarquees(root);
  initCopy(root, { icon });
  initLayers(root);
  initFlows(root);
  initRotators(root);
  initTypewriters(root);
  initSequences(root);
  initDotfields(root);
  initDepth(root);
  initCurtains(root);
  initReveal(root);
  syncMotionButtons();
}

export { motion, copy };
