/*
 * The hero chat widget.
 * A scripted conversation that behaves like a real support widget: typing
 * indicator, delivery states and one replayed "token expired, retry" send.
 * To change what it says, edit SCRIPT below. Nothing else needs to change.
 */
(function () {
  'use strict';

  var SCRIPT = {
    intro: [
      "Hi, I'm Jithesh. I build widgets like this one at Freshworks.",
      'Pick a question, or scroll down for the long version.'
    ],
    questions: [
      {
        label: 'What do you work on?',
        retry: true,
        replies: [
          {
            text: 'The Freshworks chat widget, in React. That retry you just saw is one of mine: ' +
                  'when a token expires mid-message, the widget retries automatically so the message still lands.'
          },
          {
            text: "I also build its admin-side features, such as IP Restriction, and I cut the widget's " +
                  'Sentry attachments by more than half.',
            actions: [{ label: 'See my work', href: '#work' }]
          }
        ]
      },
      {
        label: 'Where have you worked?',
        replies: [
          {
            text: 'Freshworks since August 2025, as a senior software engineer. Before that, ' +
                  'three and a half years at Mr. Cooper, from intern to Software Engineer II.'
          },
          {
            text: 'At Mr. Cooper I built multi-factor authentication for more than 60,000 customers, ' +
                  'and biweekly autopay for consumer loans.',
            actions: [{ label: 'See the timeline', href: '#work' }]
          }
        ]
      },
      {
        label: "What's your stack?",
        replies: [
          {
            text: 'React, TypeScript, Next.js and Redux on the front end. Node.js and Ruby on Rails ' +
                  'when a feature needs a back end.',
            actions: [{ label: 'See all skills', href: '#skills' }]
          },
          {
            text: "I also work with AI tools: Claude, Cursor, Copilot and Kiro. I'm a Claude Certified " +
                  'Developer (Foundations).',
            actions: [{ label: 'See certifications', href: '#certifications' }]
          }
        ]
      },
      {
        label: 'How do I reach you?',
        replies: [
          {
            text: "Email is best: jitheshreddy10@gmail.com. You can also call +91 86101 07428, or find me on LinkedIn and GitHub.",
            actions: [
              { label: 'Write an email', href: 'mailto:jitheshreddy10@gmail.com' },
              { label: 'Call', href: 'tel:+918610107428' },
              { label: 'Open LinkedIn', href: 'https://www.linkedin.com/in/jithesh-reddy-66a58a18a', external: true }
            ]
          }
        ]
      }
    ],
    outro: "That's everything I scripted. The rest is below."
  };

  var stage = document.querySelector('[data-widget]');
  if (!stage) return;

  var log = stage.querySelector('[data-log]');
  var chips = stage.querySelector('[data-chips]');
  var launcher = stage.querySelector('[data-launcher]');
  var panel = stage.querySelector('.widget');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var busy = false;

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, reduce.matches ? 0 : ms);
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function scrollToEnd() {
    log.scrollTo({ top: log.scrollHeight, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  function addAgent(reply) {
    var item = el('li', 'msg msg--agent');
    item.appendChild(el('div', 'msg__bubble', reply.text));
    if (reply.actions) {
      var row = el('div', 'msg__actions');
      reply.actions.forEach(function (action) {
        var link = el('a', 'msg__action', action.label);
        link.href = action.href;
        if (action.external) {
          link.target = '_blank';
          link.rel = 'noopener';
        }
        row.appendChild(link);
      });
      item.appendChild(row);
    }
    log.appendChild(item);
    scrollToEnd();
  }

  function showTyping() {
    var item = el('li', 'msg msg--agent msg--typing');
    item.setAttribute('aria-hidden', 'true');
    var bubble = el('div', 'msg__bubble typing');
    bubble.appendChild(el('i'));
    bubble.appendChild(el('i'));
    bubble.appendChild(el('i'));
    item.appendChild(bubble);
    log.appendChild(item);
    scrollToEnd();
    return item;
  }

  async function agentSays(reply) {
    var typing = showTyping();
    // Longer replies "type" a little longer, within sensible bounds.
    await sleep(Math.min(1500, 520 + reply.text.length * 9));
    typing.remove();
    addAgent(reply);
  }

  async function setState(stateEl, text, warn) {
    stateEl.classList.add('is-swap');
    await sleep(160);
    stateEl.textContent = text;
    stateEl.classList.toggle('is-warn', !!warn);
    stateEl.classList.remove('is-swap');
  }

  async function userSays(text, withRetry) {
    var item = el('li', 'msg msg--user');
    item.appendChild(el('div', 'msg__bubble', text));
    var state = el('span', 'msg__state', 'Sending');
    item.appendChild(state);
    log.appendChild(item);
    scrollToEnd();

    await sleep(650);
    if (withRetry) {
      item.classList.add('msg--retry');
      await setState(state, 'Session expired. Retrying', true);
      await sleep(1200);
    }
    await setState(state, 'Delivered', false);
    await sleep(350);
  }

  function renderChips() {
    chips.textContent = '';
    var remaining = SCRIPT.questions.filter(function (q) { return !q.asked; });
    if (!remaining.length) {
      chips.appendChild(el('p', 'widget__done', SCRIPT.outro));
      return;
    }
    remaining.forEach(function (question, index) {
      var chip = el('button', 'chip', question.label);
      chip.type = 'button';
      chip.style.setProperty('--i', index);
      chip.addEventListener('click', function () { ask(question, chip); });
      chips.appendChild(chip);
    });
  }

  function setChipsDisabled(disabled) {
    chips.querySelectorAll('.chip').forEach(function (chip) { chip.disabled = disabled; });
  }

  async function ask(question, chip) {
    if (busy) return;
    busy = true;
    question.asked = true;
    chip.classList.add('is-leaving');
    setChipsDisabled(true);

    await userSays(question.label, question.retry);
    for (var i = 0; i < question.replies.length; i++) {
      await agentSays(question.replies[i]);
      await sleep(250);
    }

    renderChips();
    busy = false;
  }

  async function start() {
    stage.classList.add('is-ready');
    busy = true;
    for (var i = 0; i < SCRIPT.intro.length; i++) {
      await agentSays({ text: SCRIPT.intro[i] });
      await sleep(200);
    }
    renderChips();
    busy = false;
  }

  // Launcher: open and close the panel like the real thing.
  function setOpen(open) {
    stage.classList.toggle('is-closed', !open);
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');
    if (open) scrollToEnd();
  }
  launcher.addEventListener('click', function () {
    setOpen(stage.classList.contains('is-closed'));
  });

  // Floating launcher: once the hero has scrolled away, the round button docks
  // to the bottom-right corner and reopens the chat from anywhere on the page.
  var docked = false;
  function dock(on) {
    if (on === docked) return;
    docked = on;
    stage.classList.add('is-switching');               // no transitions while it changes place
    if (on) stage.style.minHeight = stage.offsetHeight + 'px';  // hold the hero's layout
    stage.classList.toggle('is-docked', on);
    setOpen(!on);                                       // docked starts closed, the hero copy is open
    if (!on) stage.style.minHeight = '';
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { stage.classList.remove('is-switching'); });
    });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var entry = entries[entries.length - 1];
      // Only dock when the widget has gone off the top, not when it is still below the fold.
      dock(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(stage);
  }
  // On phones the docked panel covers the page, so close it when a reply's link jumps to a section.
  log.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a.msg__action') : null;
    if (link && docked && link.getAttribute('href').charAt(0) === '#' &&
        window.matchMedia('(max-width: 640px)').matches) {
      setOpen(false);
    }
  });

  // Begin once the widget's entrance animation has finished.
  var started = false;
  function begin() {
    if (started) return;
    started = true;
    start();
  }
  panel.addEventListener('animationend', function (event) {
    if (event.target === panel) begin();
  });
  setTimeout(begin, reduce.matches ? 0 : 1800); // fallback if the animation never fires
})();
