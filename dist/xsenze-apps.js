/*! Xsenze UI Kit apps v0.10.0 | MIT */
var XsenzeApps = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/js/apps/index.js
  var index_exports = {};
  __export(index_exports, {
    apps: () => plugin,
    default: () => index_default
  });

  // src/js/shared.js
  var $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  var ready = (el, key) => {
    const k = `xz${key}Ready`;
    if (el.dataset[k]) return true;
    el.dataset[k] = "1";
    return false;
  };
  var fire = (el, type, detail, cancelable = false) => el.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable, detail }));
  var esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var uid = 0;
  var nextId = (p) => `xz-${p}-s${++uid}`;
  var query = (q) => typeof matchMedia === "function" ? matchMedia(q) : { matches: false, addEventListener() {
  } };
  var reducedQuery = query("(prefers-reduced-motion: reduce)");
  var fineQuery = query("(pointer: fine)");
  var motionOn = () => !reducedQuery.matches && document.documentElement.getAttribute("data-xz-motion") !== "off";
  var motionListeners = /* @__PURE__ */ new Set();
  var notifyMotion = () => {
    const on = motionOn();
    motionListeners.forEach((cb) => cb(on));
  };
  reducedQuery.addEventListener("change", notifyMotion);
  var store = {
    get(key, fallback = null) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
      }
    }
  };
  var composing = (e) => e.isComposing || e.keyCode === 229;

  // src/js/apps/chat.js
  var H = {};
  var live = () => {
    let el = document.getElementById("xz-chat-live");
    if (!el) {
      el = Object.assign(document.createElement("div"), { id: "xz-chat-live", className: "xz-sr-only" });
      el.setAttribute("aria-live", "polite");
      document.body.append(el);
    }
    return el;
  };
  var say = (text) => {
    const el = live();
    el.textContent = "";
    setTimeout(() => el.textContent = text, 60);
  };
  function initChats(root, helpers) {
    H = helpers || H;
    for (const form of $$("form[data-xz-prompt]", root)) if (!ready(form, "Prompt")) prompt(form);
    for (const chat of $$("[data-xz-chat]", root)) if (!ready(chat, "Chat")) messages(chat);
  }
  function prompt(form) {
    form.classList.add("xz-prompt");
    const field = form.querySelector("textarea");
    if (!field) return;
    const send = form.querySelector('button[type="submit"]');
    const maxRows = Number(form.getAttribute("data-xz-max-rows") || 8);
    const grow = () => {
      field.style.height = "auto";
      const line = parseFloat(getComputedStyle(field).lineHeight) || 20;
      field.style.height = `${Math.min(field.scrollHeight, line * maxRows + 16)}px`;
    };
    field.addEventListener("input", grow);
    let busy = false;
    const files = () => $$('input[type="file"]', form).flatMap((i) => [...i.files || []]);
    const submit = () => {
      if (!field.value.trim() && !files().length) return;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })) && form.submit();
    };
    const coarse = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    field.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || composing(e) || coarse()) return;
      e.preventDefault();
      if (!busy) submit();
    });
    form.addEventListener("submit", (e) => {
      if (busy || !field.value.trim() && !files().length) return e.preventDefault();
      if (!fire(form, "xz:send", { text: field.value.trim(), files: files() }, true)) {
        e.preventDefault();
        api.clear();
      }
    });
    form.xzSubmit = submit;
    const stopLabel = (send == null ? void 0 : send.getAttribute("aria-label")) || "Send";
    const sendIcon = (send == null ? void 0 : send.innerHTML) || "";
    send == null ? void 0 : send.addEventListener("click", (e) => {
      if (!busy) return;
      e.preventDefault();
      fire(form, "xz:stop", {});
    });
    const api = {
      get value() {
        return field.value;
      },
      set value(v) {
        field.value = v;
        grow();
      },
      clear() {
        var _a;
        field.value = "";
        for (const i of $$('input[type="file"]', form)) i.value = "";
        for (const d of [form, ...$$("[data-xz-dropzone]", form)]) (_a = d.xzDropzone) == null ? void 0 : _a.clear();
        grow();
        field.focus();
      },
      focus: () => field.focus(),
      /** While a reply is being written, the send button becomes Stop and fires xz:stop. */
      busy(on = true) {
        var _a;
        busy = on;
        form.classList.toggle("is-busy", on);
        if (send) {
          send.setAttribute("aria-label", on ? "Stop" : stopLabel);
          send.innerHTML = on ? ((_a = H.icon) == null ? void 0 : _a.call(H, "square", { size: "sm" })) || "Stop" : sendIcon;
        }
      }
    };
    form.xzPrompt = api;
    grow();
  }
  function messages(chat) {
    var _a;
    chat.classList.add("xz-chat");
    const list = chat.querySelector(".xz-chat__list") || chat.appendChild(Object.assign(document.createElement("ol"), { className: "xz-chat__list" }));
    const jump = Object.assign(document.createElement("button"), { type: "button", className: "xz-btn xz-btn--sm xz-chat__latest", hidden: true });
    jump.innerHTML = `${((_a = H.icon) == null ? void 0 : _a.call(H, "arrow-down", { size: "sm" })) || ""}<span>Jump to latest</span>`;
    list.after(jump);
    const scroller = list;
    const nearEnd = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
    const toEnd = () => {
      scroller.scrollTop = scroller.scrollHeight;
      jump.hidden = true;
    };
    const after = (stick) => {
      if (stick) return toEnd();
      jump.style.insetBlockEnd = `${Math.max(0, chat.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom) + 12}px`;
      jump.hidden = false;
    };
    scroller.addEventListener("scroll", () => nearEnd() && (jump.hidden = true));
    jump.addEventListener("click", toEnd);
    const clean = (msg) => msg.trusted ? msg.html : H.sanitize ? H.sanitize(msg.html) : esc(msg.html);
    const bubbles = chat.classList.contains("xz-chat--bubbles");
    const filesHtml = (files = []) => files.length ? `<ul class="xz-files">${files.map((f) => {
      var _a2;
      return `<li><${f.url ? `a href="${esc(f.url)}" download` : "span"} class="xz-file"><span class="xz-file__icon">${((_a2 = H.icon) == null ? void 0 : _a2.call(H, f.icon || "file-text", { size: "sm" })) || ""}</span><span class="xz-file__body"><span class="xz-file__name">${esc(f.name)}</span>${f.meta ? `<span class="xz-file__meta">${esc(f.meta)}</span>` : ""}</span></${f.url ? "a" : "span"}></li>`;
    }).join("")}</ul>` : "";
    const make = (msg) => {
      const li = document.createElement("li");
      const role = msg.role === "user" ? "user" : "assistant";
      li.className = `xz-message xz-message--${role}`;
      if (msg.id) li.id = msg.id;
      const author = msg.author || (role === "user" ? "You" : "Assistant");
      const time = msg.time ? `<time class="xz-message__time">${esc(msg.time)}</time>` : "";
      li.innerHTML = `${msg.avatar ? `<span class="xz-message__avatar" aria-hidden="true">${msg.avatar}</span>` : ""}<div class="xz-message__body">${bubbles && msg.author ? `<span class="xz-message__author" aria-hidden="true">${esc(author)}</span>` : ""}<p class="xz-sr-only">${esc(author)} said:</p><div class="xz-message__bubble${role === "assistant" && !bubbles ? " xz-prose xz-prose--sm" : ""}"></div>${filesHtml(msg.files)}${time ? `<div class="xz-message__meta">${time}</div>` : ""}</div>`;
      const bubble = li.querySelector(".xz-message__bubble");
      if (msg.html != null) bubble.innerHTML = clean(msg);
      else bubble.textContent = msg.text || "";
      return li;
    };
    const makeNote = (o) => {
      var _a2;
      const li = document.createElement("li");
      li.className = `xz-chat__note${o.line ? " xz-chat__note--line" : o.box ? " xz-chat__note--box" : ""}${o.tone ? ` xz-chat__note--${o.tone}` : ""}`;
      li.innerHTML = `${o.icon ? ((_a2 = H.icon) == null ? void 0 : _a2.call(H, o.icon, { size: "sm" })) || "" : ""}<span>${esc(o.text || "")}</span>`;
      return li;
    };
    const fold = (li) => {
      const bubble = li.querySelector(".xz-message__bubble");
      if (!bubble || li.querySelector(".xz-message__more") || !(chat.hasAttribute("data-xz-fold") || li.hasAttribute("data-xz-fold"))) return;
      bubble.classList.add("is-folded");
      if (bubble.scrollHeight <= bubble.clientHeight + 24) return bubble.classList.remove("is-folded");
      const more = Object.assign(document.createElement("button"), { type: "button", className: "xz-message__more", textContent: "Show more" });
      more.setAttribute("aria-expanded", "false");
      more.setAttribute("aria-controls", bubble.id || (bubble.id = nextId("message")));
      bubble.after(more);
    };
    let typingRow = null;
    const api = {
      add(msg) {
        const stick = nearEnd();
        const li = make(msg);
        list.append(li);
        fold(li);
        after(stick || msg.role === "user");
        if (msg.role !== "user") say(`${msg.author || "Assistant"}: ${li.querySelector(".xz-message__bubble").textContent}`);
        return li;
      },
      /** A note in the conversation: { text, icon, tone: 'success' | 'warning' | 'danger', line: true for a day line, box: true for a framed note }. */
      note(o) {
        const opts = typeof o === "string" ? { text: o } : o;
        const stick = nearEnd();
        const li = makeNote(opts);
        list.append(li);
        after(stick);
        if (!opts.line) say(opts.text || "");
        return li;
      },
      /** Earlier messages go in above the others, and the messages being read stay where they are. */
      prepend(msgs) {
        const from = scroller.scrollHeight - scroller.scrollTop;
        const items = [].concat(msgs).map((m) => m.note ? makeNote(m) : make(m));
        list.prepend(...items);
        items.forEach(fold);
        scroller.scrollTop = scroller.scrollHeight - from;
        return items;
      },
      /** Scroll to a message (an element or its id) and mark it for a moment. */
      jumpTo(m) {
        const li = typeof m === "string" ? document.getElementById(m) : m;
        if (!li || !list.contains(li)) return;
        const top = scroller.scrollTop + li.getBoundingClientRect().top - scroller.getBoundingClientRect().top - (scroller.clientHeight - li.offsetHeight) / 2;
        scroller.scrollTo({ top, behavior: motionOn() ? "smooth" : "auto" });
        li.classList.add("is-target");
        setTimeout(() => li.classList.remove("is-target"), 1800);
        li.tabIndex = -1;
        li.focus({ preventScroll: true });
      },
      /** Write a reply bit by bit. Screen readers hear it once, when it is done. */
      stream(msg = {}) {
        api.typing(false);
        const stick = nearEnd();
        const li = make({ ...msg, text: "" });
        li.classList.add("is-streaming");
        list.append(li);
        after(stick);
        const bubble = li.querySelector(".xz-message__bubble");
        let text = "";
        return {
          el: li,
          append(chunk) {
            const s = nearEnd();
            text += chunk;
            bubble.textContent = text;
            if (s) toEnd();
          },
          done(html) {
            li.classList.remove("is-streaming");
            if (html != null) bubble.innerHTML = clean({ ...msg, html });
            fold(li);
            say(`${msg.author || "Assistant"}: ${bubble.textContent}`);
          }
        };
      },
      /** Typing dots while a reply is written, or a line of status in their place: typing(true, 'Checking the timetable…'). */
      typing(on = true, label) {
        if (!on) {
          typingRow == null ? void 0 : typingRow.remove();
          typingRow = null;
          return;
        }
        const html = `<div class="xz-message__body">${label ? `<span class="xz-shimmer" role="status">${esc(label)}</span>` : '<span class="xz-typing" role="status" aria-label="Writing a reply"><i></i><i></i><i></i></span>'}</div>`;
        if (typingRow) return void (typingRow.innerHTML = html);
        typingRow = Object.assign(document.createElement("li"), { className: "xz-message xz-message--assistant xz-message--typing", innerHTML: html });
        const stick = nearEnd();
        list.append(typingRow);
        after(stick);
      },
      scrollToEnd: toEnd
    };
    chat.xzChat = api;
    chat.addEventListener("click", (e) => {
      var _a2, _b, _c, _d, _e, _f;
      const more = e.target.closest(".xz-message__more");
      if (more) {
        const open = more.getAttribute("aria-expanded") !== "true";
        (_a2 = document.getElementById(more.getAttribute("aria-controls"))) == null ? void 0 : _a2.classList.toggle("is-folded", !open);
        more.setAttribute("aria-expanded", String(open));
        more.textContent = open ? "Show less" : "Show more";
      }
      const re = e.target.closest(".xz-reaction");
      if (re) {
        const on = re.getAttribute("aria-pressed") !== "true";
        re.setAttribute("aria-pressed", String(on));
        const n = re.querySelector(".xz-reaction__count");
        if (n) n.textContent = String(Math.max(0, (parseInt(n.textContent, 10) || 0) + (on ? 1 : -1)));
        fire(chat, "xz:react", { reaction: re.getAttribute("data-xz-react") || re.textContent.trim(), on, message: re.closest(".xz-message") });
      }
      const fb = e.target.closest("[data-xz-feedback]");
      if (fb) {
        const on = fb.getAttribute("aria-pressed") !== "true";
        for (const b of $$("[data-xz-feedback]", fb.closest(".xz-message") || chat)) b.setAttribute("aria-pressed", String(b === fb && on));
        fire(chat, "xz:feedback", { value: on ? fb.getAttribute("data-xz-feedback") : null, message: fb.closest(".xz-message") });
      }
      const cp = e.target.closest("[data-xz-copy-message]");
      if (cp) (_d = H.copy) == null ? void 0 : _d.call(H, ((_c = (_b = cp.closest(".xz-message")) == null ? void 0 : _b.querySelector(".xz-message__bubble")) == null ? void 0 : _c.innerText) || "");
      const retry = e.target.closest("[data-xz-retry]");
      if (retry) fire(chat, "xz:retry", { message: retry.closest(".xz-message") });
      const suggest = e.target.closest("[data-xz-suggest]");
      if (suggest) {
        const form = document.querySelector(chat.getAttribute("data-xz-chat-prompt") || "") || chat.querySelector("form[data-xz-prompt]") || ((_e = chat.parentElement) == null ? void 0 : _e.querySelector("form[data-xz-prompt]"));
        if (form == null ? void 0 : form.xzPrompt) {
          form.xzPrompt.value = suggest.getAttribute("data-xz-suggest") || suggest.textContent.trim();
          (_f = form.xzSubmit) == null ? void 0 : _f.call(form);
        }
      }
    });
    $$(".xz-message", list).forEach(fold);
    toEnd();
  }

  // src/js/apps/quiz.js
  var H2 = {};
  var fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
  function initQuizzes(root, helpers) {
    H2 = helpers || H2;
    for (const form of $$("form[data-xz-quiz]", root)) if (!ready(form, "Quiz")) setup(form);
  }
  function setup(form) {
    const mode = form.getAttribute("data-xz-quiz") || "practice";
    const questions = $$("fieldset.xz-quiz__question", form);
    if (!questions.length) return;
    form.classList.add("xz-quiz", "is-ready");
    const icon = H2.icon || (() => "");
    const saveKey = form.getAttribute("data-xz-quiz-save") ? `xz-quiz:${form.getAttribute("data-xz-quiz-save")}` : "";
    const head = document.createElement("div");
    head.className = "xz-quiz__head";
    head.innerHTML = `<p class="xz-quiz__count" aria-live="polite"></p><div class="xz-progress xz-progress--sm" role="progressbar" aria-label="Questions answered" aria-valuemin="0" aria-valuemax="${questions.length}"><div class="xz-progress__bar"></div></div>`;
    const timerEl = form.querySelector("[data-xz-quiz-time], [data-xz-quiz-deadline]");
    form.prepend(head);
    if (timerEl) head.append(timerEl);
    const nav = document.createElement("div");
    nav.className = "xz-quiz__nav";
    nav.innerHTML = `<button type="button" class="xz-btn" data-q="back">${icon("arrow-left", { size: "sm" })}Back</button>
    <button type="button" class="xz-btn xz-btn--ghost" data-q="flag" aria-pressed="false">${icon("flag", { size: "sm" })}<span>Flag for review</span></button>
    <span class="xz-quiz__spacer"></span>
    <button type="button" class="xz-btn" data-q="review">${icon("list-checks", { size: "sm" })}Review</button>
    <button type="button" class="xz-btn xz-btn--primary" data-q="next">Next${icon("arrow-right", { size: "sm" })}</button>`;
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    questions[questions.length - 1].after(nav);
    if (submitBtn) nav.append(submitBtn);
    const review = Object.assign(document.createElement("section"), { className: "xz-quiz__review", hidden: true });
    review.setAttribute("aria-label", "Review your answers");
    const result = Object.assign(document.createElement("section"), { className: "xz-quiz__result", hidden: true });
    result.setAttribute("aria-live", "polite");
    nav.after(review);
    head.after(result);
    const announce = Object.assign(document.createElement("div"), { className: "xz-sr-only" });
    announce.setAttribute("aria-live", "assertive");
    form.append(announce);
    let at = 0;
    let confirming = false;
    let done = false;
    for (const q of questions) {
      const legend = q.querySelector("legend");
      if (legend) legend.tabIndex = -1;
    }
    const answered = (q) => $$("input, textarea, select", q).some((i) => i.type === "radio" || i.type === "checkbox" ? i.checked : String(i.value || "").trim() !== "");
    const values = () => questions.map((q) => $$("input:checked", q).map((i) => i.value));
    const show = (i, focus = true) => {
      var _a;
      at = Math.max(0, Math.min(questions.length - 1, i));
      questions.forEach((q, n) => q.hidden = n !== at);
      review.hidden = true;
      nav.hidden = false;
      head.querySelector(".xz-quiz__count").textContent = `Question ${at + 1} of ${questions.length}`;
      nav.querySelector('[data-q="back"]').disabled = at === 0;
      nav.querySelector('[data-q="next"]').hidden = at === questions.length - 1;
      const flag = nav.querySelector('[data-q="flag"]');
      flag.setAttribute("aria-pressed", String(questions[at].hasAttribute("data-flagged")));
      if (submitBtn) submitBtn.hidden = at !== questions.length - 1;
      if (focus) (_a = questions[at].querySelector("legend")) == null ? void 0 : _a.focus();
      fire(form, "xz:step", { step: at, of: questions.length });
    };
    const progress = () => {
      const n = questions.filter(answered).length;
      head.querySelector(".xz-progress__bar").style.setProperty("--xz-progress", `${n / questions.length * 100}%`);
      head.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(n));
      if (saveKey) store.set(saveKey, values());
      return n;
    };
    const showReview = (note = "") => {
      review.hidden = false;
      questions.forEach((q) => q.hidden = true);
      nav.hidden = true;
      review.innerHTML = `<h3 class="xz-quiz__review-title">Review your answers</h3>${note ? `<p class="xz-quiz__note">${esc(note)}</p>` : ""}<ol class="xz-quiz__grid">${questions.map((q, i) => {
        const state = q.hasAttribute("data-flagged") ? "flagged" : answered(q) ? "answered" : "unanswered";
        const label = { flagged: "Flagged", answered: "Answered", unanswered: "Not answered" }[state];
        return `<li><button type="button" class="xz-quiz__cell is-${state}" data-go="${i}" aria-label="Question ${i + 1}, ${label}">${i + 1}<small>${label}</small></button></li>`;
      }).join("")}</ol><div class="xz-quiz__nav"><button type="button" class="xz-btn" data-go="${at}">Back to question ${at + 1}</button><span class="xz-quiz__spacer"></span><button type="button" class="xz-btn xz-btn--primary" data-q="submit">Submit answers</button></div>`;
      review.querySelector("h3").tabIndex = -1;
      review.querySelector("h3").focus();
    };
    const score = () => {
      let right = 0;
      questions.forEach((q) => {
        const key = (q.getAttribute("data-xz-answer") || "").split(",").map((s) => s.trim()).filter(Boolean).sort().join(",");
        const got = $$("input:checked", q).map((i) => i.value).sort().join(",");
        const ok = key && key === got;
        if (ok) right++;
        q.classList.toggle("is-correct", Boolean(ok));
        q.classList.toggle("is-wrong", Boolean(key) && !ok);
        for (const opt of $$(".xz-quiz__option", q)) {
          const input = opt.querySelector("input");
          opt.classList.toggle("is-answer", key.split(",").includes(input == null ? void 0 : input.value));
        }
      });
      return right;
    };
    const finish = (reason) => {
      if (done) return;
      const total = questions.length;
      const answers = values();
      if (mode === "practice") {
        const right = score();
        const percent = Math.round(right / total * 100);
        if (!fire(form, "xz:quiz", { score: right, total, percent, answers, reason }, true)) return;
        done = true;
        const pass = Number(form.getAttribute("data-xz-pass") || 0);
        questions.forEach((q) => {
          q.hidden = false;
          q.disabled = true;
        });
        review.hidden = true;
        nav.hidden = true;
        result.hidden = false;
        result.innerHTML = `<h3 class="xz-quiz__score">${right} of ${total} correct \xB7 ${percent}%</h3>${pass ? `<p class="xz-badge ${percent >= pass ? "xz-badge--success" : "xz-badge--danger"}">${percent >= pass ? "Passed" : `Not passed yet: ${pass}% needed`}</p>` : ""}<p class="xz-quiz__note">Each question below shows the right answer${questions.some((q) => q.querySelector(".xz-quiz__explain")) ? " and why" : ""}.</p>`;
        const heading = result.querySelector("h3");
        heading.tabIndex = -1;
        if (reason !== "time" || form.contains(document.activeElement)) heading.focus();
        if (saveKey) store.remove(saveKey);
        clearInterval(tick);
        return;
      }
      if (!fire(form, "xz:quiz", { answers, total, reason }, true)) return;
      done = true;
      if (saveKey) store.remove(saveKey);
      clearInterval(tick);
      questions.forEach((q) => q.hidden = false);
      form.requestSubmit ? form.requestSubmit() : form.submit();
    };
    form.addEventListener("click", (e) => {
      var _a;
      const q = (_a = e.target.closest("[data-q]")) == null ? void 0 : _a.dataset.q;
      const go = e.target.closest("[data-go]");
      if (go) return show(Number(go.dataset.go));
      if (q === "back") show(at - 1);
      else if (q === "next") show(at + 1);
      else if (q === "review") showReview();
      else if (q === "flag") {
        questions[at].toggleAttribute("data-flagged");
        e.target.closest("[data-q]").setAttribute("aria-pressed", String(questions[at].hasAttribute("data-flagged")));
      } else if (q === "submit") {
        confirming = true;
        finish("submit");
      }
    });
    form.addEventListener("change", progress);
    form.addEventListener("submit", (e) => {
      if (done) return;
      const left = questions.length - progress();
      if (left && !confirming) {
        e.preventDefault();
        confirming = true;
        return showReview(`${left} question${left === 1 ? " is" : "s are"} not answered. Submit anyway, or go back to them.`);
      }
      e.preventDefault();
      finish("submit");
    });
    if (saveKey) {
      const saved = store.get(saveKey, null);
      if (Array.isArray(saved)) questions.forEach((q, i) => (saved[i] || []).forEach((v) => {
        const input = $$("input", q).find((x) => x.value === v);
        if (input) input.checked = true;
      }));
    }
    let tick = 0;
    if (timerEl) {
      timerEl.classList.add("xz-quiz__timer");
      timerEl.setAttribute("role", "timer");
      const key = `xz-quiz-deadline:${form.id || form.getAttribute("data-xz-quiz-save") || location.pathname}`;
      let deadline = Date.parse(timerEl.getAttribute("data-xz-quiz-deadline") || "");
      if (!deadline) {
        try {
          deadline = Number(sessionStorage.getItem(key)) || 0;
        } catch {
        }
        if (!deadline) {
          deadline = Date.now() + Number(timerEl.getAttribute("data-xz-quiz-time") || 0) * 1e3;
          try {
            sessionStorage.setItem(key, String(deadline));
          } catch {
          }
        }
      }
      const warned = /* @__PURE__ */ new Set();
      let first = true;
      const update = () => {
        const left = Math.round((deadline - Date.now()) / 1e3);
        timerEl.innerHTML = `${icon("timer", { size: "sm" })}<span>${fmt(Math.max(0, left))}</span>`;
        timerEl.classList.toggle("is-low", left <= 60);
        for (const m of [5, 1]) if (left <= m * 60 && left > 0 && !warned.has(m)) {
          warned.add(m);
          if (!first) announce.textContent = `${m} minute${m === 1 ? "" : "s"} left`;
        }
        first = false;
        if (left <= 0) {
          clearInterval(tick);
          fire(form, "xz:timeup", {});
          try {
            sessionStorage.removeItem(key);
          } catch {
          }
          finish("time");
        }
      };
      update();
      tick = setInterval(update, 1e3);
    }
    progress();
    show(0, false);
    form.xzQuiz = { go: show, review: showReview, submit: () => finish("submit"), answers: values, score: () => mode === "practice" ? score() : null };
  }

  // src/js/apps/index.js
  var plugin = {
    name: "apps",
    init(root, helpers) {
      initChats(root, helpers);
      initQuizzes(root, helpers);
    }
  };
  var index_default = plugin;
  if (typeof window !== "undefined") {
    if (window.Xsenze && typeof window.Xsenze.use === "function") window.Xsenze.use(plugin);
    else (window.XsenzePlugins = window.XsenzePlugins || []).push(plugin);
  }
  return __toCommonJS(index_exports);
})();
