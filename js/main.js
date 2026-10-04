/*
 * Page behaviour: theme switch, scroll progress, timeline fill, nav indicator,
 * scroll reveals, line-by-line work points, count-up numbers, card tilt and
 * copy-to-clipboard.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Theme ---------- */
  var toggle = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set === 'light' || set === 'dark') return set;
    return darkQuery.matches ? 'dark' : 'light';
  }

  function syncToggle() {
    var dark = currentTheme() === 'dark';
    root.classList.toggle('is-dark', dark);
    if (!toggle) return;
    toggle.setAttribute('aria-checked', String(dark));
    toggle.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // The system theme is the default. A choice is only saved while it differs
  // from the system; switching back to match the system clears it again.
  function applyTheme(next) {
    var system = darkQuery.matches ? 'dark' : 'light';
    try {
      if (next === system) {
        root.removeAttribute('data-theme');
        localStorage.removeItem('theme');
      } else {
        root.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
      }
    } catch (e) {
      /* storage blocked (private mode): the choice lasts for this visit only */
      if (next === system) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', next);
    }
    syncToggle();
  }

  function switchTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduce.matches) {
      applyTheme(next);
      return;
    }
    // Grow the new theme out of the toggle button.
    var box = toggle.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;
    var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var transition = document.startViewTransition(function () { applyTheme(next); });
    transition.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
  }

  syncToggle();
  if (toggle) toggle.addEventListener('click', switchTheme);
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncToggle);

  /* ---------- Scroll-linked: progress bar, header border, timeline fill ---------- */
  var header = document.querySelector('[data-header]');
  var timeline = document.querySelector('[data-timeline]');
  var nodes = timeline ? Array.prototype.slice.call(timeline.querySelectorAll('[data-node]')) : [];
  var ticking = false;

  function onScroll() {
    ticking = false;
    var max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--scroll', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8);

    if (timeline) {
      // The line fills up to a point 60% down the viewport.
      var box = timeline.getBoundingClientRect();
      var reach = window.innerHeight * 0.6 - box.top;
      var fill = Math.max(0, Math.min(1, reach / box.height));
      timeline.style.setProperty('--fill', fill.toFixed(4));
      nodes.forEach(function (node) {
        node.classList.toggle('is-reached', node.getBoundingClientRect().top - box.top <= reach - 12);
      });
    }
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  onScroll();

  /* ---------- Nav: sliding indicator for the section in view ---------- */
  var nav = document.querySelector('[data-nav]');
  var pill = document.querySelector('[data-nav-pill]');
  var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var activeId = null;

  function movePill() {
    var link = links.filter(function (a) { return a.getAttribute('href') === '#' + activeId; })[0];
    links.forEach(function (a) {
      var on = a === link;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if (!pill) return;
    if (!link) { pill.classList.remove('is-on'); return; }
    pill.style.setProperty('--pill-x', link.offsetLeft + 'px');
    pill.style.setProperty('--pill-w', link.offsetWidth + 'px');
    pill.classList.add('is-on');
    // On narrow screens the nav scrolls sideways; keep the active link visible.
    if (nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: link.offsetLeft - 24, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
  }

  if ('IntersectionObserver' in window && links.length) {
    var visible = {};
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { visible[entry.target.id] = entry.isIntersecting; });
      var next = null;
      links.forEach(function (a) {
        var id = a.getAttribute('href').slice(1);
        if (visible[id]) next = id;
      });
      if (next !== activeId) { activeId = next; movePill(); }
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('[data-section]').forEach(function (section) { sectionObserver.observe(section); });
    window.addEventListener('resize', movePill);
  }

  /* ---------- Reveal on scroll ---------- */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  // Headings marked "mask" get an inner wrapper that slides up into view.
  revealables.forEach(function (node) {
    if (node.getAttribute('data-reveal') !== 'mask') return;
    var inner = document.createElement('span');
    inner.className = 'mask__in';
    while (node.firstChild) inner.appendChild(node.firstChild);
    node.appendChild(inner);
  });

  // Siblings that reveal together get a small stagger.
  revealables.forEach(function (node) {
    var siblings = Array.prototype.filter.call(node.parentElement.children, function (child) {
      return child.hasAttribute('data-reveal');
    });
    var index = siblings.indexOf(node);
    if (index > 0 && !node.hasAttribute('data-node')) node.style.setProperty('--i', Math.min(index, 4));
  });

  if ('IntersectionObserver' in window && !reduce.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (node) { revealObserver.observe(node); });
  } else {
    revealables.forEach(function (node) { node.classList.add('is-in'); });
  }

  /* ---------- Paddy project: samples that sort into four clusters ---------- */
  var dots = document.querySelector('[data-dots]');
  if (dots) {
    // Small seeded generator so the scatter is the same on every load.
    var seed = 7;
    var rand = function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    var centres = [[58, 52], [132, 84], [200, 44], [262, 86]];
    var svgNS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 44; i++) {
      var k = i % 4;
      var angle = rand() * Math.PI * 2;
      var spread = 6 + rand() * 20;
      var circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('r', (3 + rand() * 1.6).toFixed(1));
      circle.setAttribute('class', 'k' + k);
      circle.style.setProperty('--x0', (16 + rand() * 288).toFixed(1) + 'px');
      circle.style.setProperty('--y0', (14 + rand() * 106).toFixed(1) + 'px');
      circle.style.setProperty('--x1', (centres[k][0] + Math.cos(angle) * spread).toFixed(1) + 'px');
      circle.style.setProperty('--y1', (centres[k][1] + Math.sin(angle) * spread * 0.8).toFixed(1) + 'px');
      circle.style.setProperty('--i', i);
      dots.appendChild(circle);
    }
  }

  /* ---------- Work points arrive one line at a time ---------- */
  var pointLists = Array.prototype.slice.call(document.querySelectorAll('[data-timeline] .points'));
  pointLists.forEach(function (list) {
    Array.prototype.forEach.call(list.children, function (item, index) {
      item.style.setProperty('--n', index);
    });
  });
  if ('IntersectionObserver' in window && !reduce.matches) {
    var pointObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        pointObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.15 });
    pointLists.forEach(function (list) { pointObserver.observe(list); });
  } else {
    pointLists.forEach(function (list) { list.classList.add('is-in'); });
  }

  /* ---------- Numbers count up when they come into view ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  function format(node, value) {
    return value.toFixed(parseInt(node.getAttribute('data-decimals') || '0', 10)) +
           (node.getAttribute('data-suffix') || '');
  }
  function countUp(node) {
    var target = parseFloat(node.getAttribute('data-count'));
    var duration = 1500;
    var began = null;
    function frame(now) {
      if (began === null) began = now;
      var t = Math.min(1, (now - began) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format(node, target * eased);
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window && !reduce.matches) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 1 });
    counters.forEach(function (node) {
      node.textContent = format(node, 0);
      countObserver.observe(node);
    });
  }

  /* ---------- Pointer effects (mouse only) ---------- */
  if (finePointer.matches && !reduce.matches) {
    // The main certificate card tilts toward the cursor, with a sheen that follows it.
    var tiltCard = document.querySelector('[data-tilt]');
    if (tiltCard) {
      tiltCard.addEventListener('pointermove', function (event) {
        var box = tiltCard.getBoundingClientRect();
        var px = (event.clientX - box.left) / box.width - 0.5;
        var py = (event.clientY - box.top) / box.height - 0.5;
        tiltCard.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
        tiltCard.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
        tiltCard.style.setProperty('--shine', ((px + 0.5) * 100).toFixed(1) + '%');
        tiltCard.classList.add('is-tilting');
      });
      tiltCard.addEventListener('pointerleave', function () {
        tiltCard.classList.remove('is-tilting');
        tiltCard.style.setProperty('--ry', '0deg');
        tiltCard.style.setProperty('--rx', '0deg');
      });
    }

    // Project cards get a highlight that follows the cursor.
    document.querySelectorAll('[data-spot]').forEach(function (card) {
      card.addEventListener('pointermove', function (event) {
        var box = card.getBoundingClientRect();
        card.style.setProperty('--sx', (event.clientX - box.left) + 'px');
        card.style.setProperty('--sy', (event.clientY - box.top) + 'px');
      });
    });
  }

  /* ---------- Copy email address ---------- */
  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
    // Older browsers and some local-file contexts: fall back to a hidden field.
    return new Promise(function (resolve, reject) {
      var field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(field);
      if (ok) resolve(); else reject();
    });
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    var label = button.querySelector('[data-copy-label]');
    var original = label.textContent;
    var timer;

    function show(text, copied) {
      label.textContent = text;
      button.classList.toggle('is-copied', copied);
      clearTimeout(timer);
      timer = setTimeout(function () {
        label.textContent = original;
        button.classList.remove('is-copied');
      }, 2200);
    }

    button.addEventListener('click', function () {
      copyText(button.getAttribute('data-copy')).then(
        function () { show('Copied', true); },
        function () { show('Press Ctrl+C to copy', false); }
      );
    });
  });
})();
