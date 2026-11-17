// Optional app pieces: chat and AI message parts, and quizzes.
// Browser: load dist/xsenze-apps.min.js after dist/xsenze.min.js.
// Bundlers: import Xsenze from '@sfj/ui-kit'; import apps from '@sfj/ui-kit/apps'; Xsenze.use(apps);
import { initChats } from './chat.js';
import { initQuizzes } from './quiz.js';

const plugin = {
  name: 'apps',
  init(root, helpers) {
    initChats(root, helpers);
    initQuizzes(root, helpers);
  },
};

export default plugin;
export { plugin as apps };

if (typeof window !== 'undefined') {
  if (window.Xsenze && typeof window.Xsenze.use === 'function') window.Xsenze.use(plugin);
  else (window.XsenzePlugins = window.XsenzePlugins || []).push(plugin);
}
