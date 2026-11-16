// Expanding tabs: on wide screens every panel shows, one after another, and the tab roles are taken off
// so screen readers meet plain sections with headings. On small screens the tabs come back.
import { $$, ready } from '../shared.js';

const widths = { md: 768, lg: 1024, xl: 1280 };

export function initTabsExpand(root) {
  for (const tabs of $$('[data-xz-tabs][data-xz-tabs-expand]', root)) {
    if (ready(tabs, 'Expand')) continue;
    const at = widths[tabs.getAttribute('data-xz-tabs-expand')] || widths.lg;
    const media = matchMedia(`(min-width: ${at}px)`);
    const tabEls = $$(':scope > .xz-tabs__list .xz-tabs__tab', tabs);
    const panels = $$(':scope > .xz-tabs__panel', tabs);
    const sync = () => {
      const wide = media.matches;
      tabs.classList.toggle('is-expanded', wide);
      const selected = Math.max(0, tabEls.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
      panels.forEach((p, i) => {
        if (wide) {
          p.hidden = false;
          p.removeAttribute('role');
          p.removeAttribute('tabindex');
          p.removeAttribute('aria-labelledby');
        } else {
          p.setAttribute('role', 'tabpanel');
          p.tabIndex = 0;
          if (tabEls[i]) p.setAttribute('aria-labelledby', tabEls[i].id);
          p.hidden = i !== selected;
        }
      });
    };
    media.addEventListener('change', sync);
    sync();
  }
}
