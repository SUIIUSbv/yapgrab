/* Easter eggs: click Yappy and it eats the words on screen, chews, spits them back,
   and hands you a clean transcript of this page as Markdown. With a mouse,
   Yappy's eyes follow your cursor around the page.
   No network, no storage, no cookies. Everything happens in this tab. */
(function () {
  var d = document, body = d.body;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canAnimate = !reduce && typeof Element !== 'undefined' && Element.prototype.animate;
  var busy = false, toast, lastUrl;
  var MAX_WORDS = 700;

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* ---------- the transcript ---------- */

  function hidden(el) { return el.closest('[aria-hidden="true"], script, style, dialog, .demo, .egg-toast, .yappy-egg'); }

  /* Readable text of an element: decorative (aria-hidden) bits dropped, blocks spaced. */
  function words(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('[aria-hidden="true"]').forEach(function (x) { x.remove(); });
    c.querySelectorAll('h3, p, b, strong').forEach(function (x) { x.append(' '); });
    return txt(c);
  }

  function transcript() {
    var lines = [], seen = {}, wasItem = false;
    function add(s, item) {
      if (!s || seen[s]) return;
      seen[s] = 1;
      if (wasItem && !item) lines.push('');
      lines.push(s);
      if (!item) lines.push('');
      wasItem = item;
    }
    d.querySelectorAll('main section').forEach(function (sec) {
      var h = sec.querySelector('h1, h2');
      if (h) { if (wasItem) lines.push(''); wasItem = false; lines.push('## ' + words(h), ''); }
      sec.querySelectorAll('h3, p, li, summary, blockquote').forEach(function (el) {
        if (hidden(el) || el.matches('.eyebrow, .demo-note, .sr')) return;
        if (el.parentElement.closest('li, blockquote')) return;
        var t = words(el);
        if (!t) return;
        if (el.matches('li')) {
          var lead = el.querySelector(':scope > h3, :scope > b');
          if (lead) t = '**' + words(lead).replace(/[.:]$/, '') + '**: ' + t.slice(words(lead).length).trim();
          add('- ' + t, true);
        } else if (el.matches('h3, summary')) add('**' + t + '**', false);
        else add(t, false);
      });
    });
    var now = new Date();
    var head = [
      '---',
      'title: ' + JSON.stringify(d.title),
      'channel: "Yappy"',
      'url: ' + JSON.stringify(location.href.split('#')[0]),
      'date: ' + JSON.stringify(now.toISOString().slice(0, 10)),
      'captions: "hand-chewed"',
      'noise_removed: ["[Mascot noises]", "[Nom]", "[Burp]"]',
      'extracted_at: ' + JSON.stringify(now.toISOString()),
      '---',
      '',
    ];
    return head.concat(lines).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* ---------- the words on screen ---------- */

  function wordsOnScreen() {
    var vw = innerWidth, vh = innerHeight, out = [];
    var walker = d.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || !/\S/.test(n.data) || p.closest('script, style, dialog, .egg-toast, .yappy-egg, .egg-layer')) return NodeFilter.FILTER_REJECT;
        var r = p.getBoundingClientRect();
        return r.bottom < 0 || r.top > vh || !r.width ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
    });
    var range = d.createRange(), n, m, re = /\S+/g;
    while ((n = walker.nextNode()) && out.length < MAX_WORDS) {
      var cs = getComputedStyle(n.parentElement);
      var pe = n.parentElement;
      if (pe.checkVisibility ? !pe.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      re.lastIndex = 0;
      while ((m = re.exec(n.data)) && out.length < MAX_WORDS) {
        range.setStart(n, m.index);
        range.setEnd(n, m.index + m[0].length);
        var r = range.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
        out.push({ w: m[0], r: r, cs: cs });
      }
    }
    return out;
  }

  function layerFor(words) {
    var layer = d.createElement('div');
    layer.className = 'egg-layer';
    layer.setAttribute('aria-hidden', 'true');
    words.forEach(function (x) {
      var s = d.createElement('span'), cs = x.cs;
      s.textContent = x.w;
      s.style.cssText = 'left:' + x.r.left + 'px;top:' + x.r.top + 'px;height:' + x.r.height + 'px;line-height:' + x.r.height + 'px;' +
        'font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:' + cs.fontWeight + ';font-style:' + cs.fontStyle + ';' +
        'letter-spacing:' + cs.letterSpacing + ';text-transform:' + cs.textTransform + ';color:' + cs.color;
      x.el = s;
      layer.appendChild(s);
    });
    body.appendChild(layer);
    return layer;
  }

  /* ---------- the show ---------- */

  function stopScroll(e) {
    if (e.type !== 'keydown' || /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) e.preventDefault();
  }
  function lockScroll(on) {
    ['wheel', 'touchmove', 'keydown'].forEach(function (t) { (on ? addEventListener : removeEventListener)(t, stopScroll, { passive: false }); });
  }

  function mouth(btn) {
    var r = btn.getBoundingClientRect();
    return { x: r.left + r.width * 0.47, y: r.top + r.height * 0.53 };
  }

  async function feast(btn) {
    var words = wordsOnScreen();
    var md = transcript();
    if (!canAnimate || !words.length) { btn.classList.add('egg-blink'); await wait(500); btn.classList.remove('egg-blink'); return done(md, words.length); }

    lockScroll(true);
    var layer = layerFor(words);
    body.classList.add('egg-hush');
    btn.classList.add('egg-open');
    var m = mouth(btn);

    // Inhale: nearest words first, everything accelerating into the mouth.
    var far = 1;
    words.forEach(function (x) {
      x.dx = m.x - (x.r.left + x.r.width / 2);
      x.dy = m.y - (x.r.top + x.r.height / 2);
      x.dist = Math.hypot(x.dx, x.dy);
      x.spin = (Math.random() - 0.5) * 540;
      far = Math.max(far, x.dist);
    });
    var eaten = words.map(function (x) {
      var delay = (x.dist / far) * 1100 + Math.random() * 180;
      return x.el.animate([
        { transform: 'none', opacity: 1 },
        { transform: 'translate(' + x.dx * 0.25 + 'px,' + x.dy * 0.25 + 'px) rotate(' + x.spin * 0.2 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + x.dx + 'px,' + x.dy + 'px) rotate(' + x.spin + 'deg) scale(.05)', opacity: 0.3 },
      ], { duration: 650, delay: delay, easing: 'cubic-bezier(.6,0,.9,.5)', fill: 'both' }).finished;
    });
    await Promise.all(eaten);

    // Chew.
    btn.classList.remove('egg-open');
    btn.classList.add('egg-chew');
    await wait(1250);
    btn.classList.remove('egg-chew');

    // Spit everything back where it belongs.
    btn.classList.add('egg-open');
    var back = words.map(function (x) {
      return x.el.animate([
        { transform: 'translate(' + x.dx + 'px,' + x.dy + 'px) rotate(' + -x.spin + 'deg) scale(.05)', opacity: 0.3 },
        { transform: 'none', opacity: 1 },
      ], { duration: 700, delay: Math.random() * 450, easing: 'cubic-bezier(.2,1.25,.4,1)', fill: 'both' }).finished;
    });
    await Promise.all(back);
    btn.classList.remove('egg-open');
    body.classList.remove('egg-hush');
    layer.remove();
    lockScroll(false);
    done(md, words.length);
  }

  function done(md, onScreen) {
    var count = (md.split('---')[2] || md).split(/\s+/).filter(Boolean).length;
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    if (!toast) {
      toast = d.createElement('div');
      toast.className = 'egg-toast';
      toast.setAttribute('role', 'status');
      toast.innerHTML = '<p><b>Nom.</b> Yappy grabbed <span class="n"></span> words from this page and cleaned them up. Removed: 3 [Mascot noises].</p>' +
        '<div class="row"><a class="save" download="yapgrab-landing-page.md">Save the transcript (.md)</a><button type="button" class="copy">Copy</button><button type="button" class="x" aria-label="Close">&times;</button></div>';
      body.appendChild(toast);
      toast.querySelector('.x').addEventListener('click', function () { toast.classList.remove('show'); });
      toast.querySelector('.copy').addEventListener('click', function (e) {
        var b = e.currentTarget;
        if (navigator.clipboard) navigator.clipboard.writeText(toast.md).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); }, function () {});
      });
    }
    toast.md = md;
    toast.querySelector('.n').textContent = count.toLocaleString('en');
    toast.querySelector('.save').href = lastUrl;
    toast.classList.add('show');
  }

  function wire(btn) {
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      feast(btn).catch(function () {
        body.classList.remove('egg-hush');
        lockScroll(false);
        var l = d.querySelector('.egg-layer');
        if (l) l.remove();
      }).then(function () { busy = false; });
    });
  }

  d.querySelectorAll('.yappy-egg').forEach(wire);

  /* ---------- Yappy's eyes follow the cursor ---------- */

  var yappies = [].slice.call(d.querySelectorAll('.yappy-egg'));
  var watching = false, px = -1, py = -1, frame = 0;

  function addEyes(btn) {
    var box = d.createElement('span');
    box.className = 'yappy-eyes';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<span class="eye l"><i></i></span><span class="eye r"><i></i></span>';
    btn.appendChild(box);
  }

  function look() {
    frame = 0;
    yappies.forEach(function (btn) {
      btn.querySelectorAll('.eye').forEach(function (eye) {
        var r = eye.getBoundingClientRect();
        if (!r.width) return;
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        var dist = Math.hypot(dx, dy) || 1;
        // How far the pupil may travel inside the eye white, eased in over the first 160 px.
        var reachX = r.width * 0.2, reachY = r.height * 0.22, k = Math.min(1, dist / 160);
        eye.firstChild.style.transform = 'translate(' + (dx / dist) * reachX * k + 'px,' + (dy / dist) * reachY * k + 'px)';
      });
    });
  }

  function follow(e) {
    px = e.clientX; py = e.clientY;
    if (!frame) frame = requestAnimationFrame(look);
  }

  function startWatching() {
    if (watching) return;
    watching = true;
    yappies.forEach(function (btn) {
      // The looping Yappy moves its eyes around, so it holds still and stares instead.
      var img = btn.querySelector('img.yappy');
      if (img) { var src = btn.querySelector('source'); if (src) src.remove(); img.src = 'assets/yappy-still.webp'; }
      addEyes(btn);
    });
    body.classList.add('yappy-watching');
    addEventListener('pointermove', follow, { passive: true });
    addEventListener('scroll', function () { if (px >= 0 && !frame) frame = requestAnimationFrame(look); }, { passive: true });
    if (px >= 0) look();
  }

  // With a mouse, Yappy watches the cursor from the start. Touch screens have no cursor to follow.
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) startWatching();
})();
