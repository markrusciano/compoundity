/* Logan Bishops: Vine app chrome around the square video.
 * A fan-made parody frame of a 2014-2016 Vine post view (not an official product).
 * LB.register('ui', { create(appEl) -> stageContainerDiv, update(t, loops, hints) })
 */
(function () {
  'use strict';
  var LB = window.LB;

  // ------------------------------------------------------------------ post data (STORYBOARD "Vine post chrome")
  var POST = {
    name: 'The Logan Bishops',
    handle: '@LoganBishops',
    location: 'Logan Square, Chicago',
    date: 'Oct 31, 2026',
    dateISO: '2026-10-31',
    loops: 1000000037,
    likes: 6231,
    comments: 418,
    revines: 1337,
    caption: 'it was a CEREMONIAL bonk, your honor #LoganSquare #Chicago #Halloween #anime #LawsuitArc',
  };
  var VIDEO_LABEL = 'Looping 6-second anime-style animation. In a Logan Square apartment on Halloween night, ' +
    'a King in a red cape solemnly raises his scepter and bonks a Friar on the head. The Friar keeps a straight face, ' +
    'eyes an injury-lawyer billboard outside the window and starts a lawsuit arc. A very tall Bishop in a giant mitre ' +
    'casts a video-game heal for +999 HP, the case is dismissed, and a camera flash snaps all three back into their deadpan photo pose.';

  // ------------------------------------------------------------------ inline icons (24x24 line art, currentColor)
  function svgIcon(body, cls, vb) {
    return '<svg class="vn-ico ' + (cls || '') + '" viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  var ICON = {
    menu: svgIcon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    camera: svgIcon('<rect x="2.5" y="6.5" width="12.5" height="11" rx="2.6"/><path d="M15 10.6l5.8-3.3v9.4L15 13.4z"/>'),
    pin: svgIcon('<path d="M12 21.2s-6.4-5.9-6.4-11a6.4 6.4 0 0 1 12.8 0c0 5.1-6.4 11-6.4 11z"/><circle cx="12" cy="10.2" r="2.3"/>', 'vn-ico-pin'),
    loop: svgIcon('<path d="M19.6 13.4A7.7 7.7 0 1 1 17.3 6.4"/><path d="M18.4 2.6v4.3h-4.3"/>', 'vn-ico-loop'),
    heart: svgIcon('<path class="vn-heart-path" d="M12 20.3s-7.6-4.5-9.3-9.3C1.5 7.6 3.6 4.4 7 4.4c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.4 0 5.5 3.2 4.3 6.6-1.7 4.8-9.3 9.3-9.3 9.3z"/>', 'vn-ico-heart'),
    comment: svgIcon('<path d="M5 4.8h14a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2h-7.6L6.6 21v-3.2H5a2.2 2.2 0 0 1-2.2-2.2V7A2.2 2.2 0 0 1 5 4.8z"/>'),
    revine: svgIcon('<path d="M3.8 11.2V10a3.2 3.2 0 0 1 3.2-3.2h12"/><path d="M15.8 3.6l3.2 3.2-3.2 3.2"/>' +
      '<path d="M20.2 12.8V14a3.2 3.2 0 0 1-3.2 3.2H5"/><path d="M8.2 20.4L5 17.2 8.2 14"/>', 'vn-ico-revine'),
    more: svgIcon('<circle cx="5" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none"/>' +
      '<circle cx="19" cy="12" r="1.9" fill="currentColor" stroke="none"/>'),
    // speaker: body + either an X (muted) or two waves (sound on); both drawn, CSS shows one
    speaker: svgIcon('<path d="M3.5 9.2h3.6L12 5v14l-4.9-4.2H3.5z" fill="currentColor"/>' +
      '<path class="vn-spk-x" d="M16 9.5l5 5M21 9.5l-5 5"/>' +
      '<path class="vn-spk-w" d="M15.6 9.3a4 4 0 0 1 0 5.4M18.3 6.6a7.8 7.8 0 0 1 0 10.8"/>', 'vn-ico-spk'),
  };

  // Avatar: three hat silhouettes on Vine green (crown on the King, the Friar's bare round head, the Bishop's tall mitre)
  function avatarSvg() {
    var clip = LB.uid('vn-avclip');
    return '<svg class="vn-avatar-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<defs><clipPath id="' + clip + '"><circle cx="24" cy="24" r="24"/></clipPath></defs>' +
      '<circle cx="24" cy="24" r="24" fill="#00BF8F"/>' +
      '<g clip-path="url(#' + clip + ')" fill="#fff" stroke="#00BF8F" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke">' +
      // shoulders, back to front: Bishop, King, then the stocky Friar in the middle
      '<path d="M26 50c0-11.5 3.8-16.5 9.5-16.5S45 38.5 45 50z"/>' +
      '<path d="M3 50c0-10.5 3.9-15 9.6-15s9.6 4.5 9.6 15z"/>' +
      '<path d="M12.8 50c0-11.2 4.6-16.2 11.2-16.2S35.2 38.8 35.2 50z"/>' +
      // heads: the Bishop's sits highest (by far the tallest), the Friar's is the roundest
      '<circle cx="35.6" cy="25.2" r="4.9"/><circle cx="12.6" cy="27.8" r="4.9"/><circle cx="24" cy="26.6" r="5.5"/>' +
      // the King's crown, tilted toward the Friar like in the photo
      '<path transform="rotate(10 12.6 27.8)" d="M7.2 24.9l-.9-7.1 3.5 3 2.8-5 2.8 5 3.5-3-.9 7.1z"/>' +
      // the Bishop's very tall mitre (gothic pointed arch)
      '<path transform="rotate(-5 35.6 25.2)" stroke-width="1.3" stroke-miterlimit="8" stroke-linejoin="miter" d="M30.5 22.7l-.7-10.1C30.6 8.6 33 5.6 35.6 3.1c2.6 2.5 5 5.5 5.8 9.5l-.7 10.1z"/>' +
      '</g></svg>';
  }

  // ------------------------------------------------------------------ styles
  var CSS = [
    'body.vn-body{margin:0;background:#e6e9e8;overflow-x:hidden;}',
    '.vn-root{--vn-green:#00BF8F;--vn-green-d:#00a27a;--vn-ink:#1e2422;--vn-gray:#6f7674;--vn-soft:#f0f2f1;--vn-line:#e4e8e6;',
    "  font-family:'Source Sans 3',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;",
    '  color:var(--vn-ink);-webkit-text-size-adjust:100%;text-size-adjust:100%;width:100%;}',
    ':where(.vn-root) *,:where(.vn-root) *::before,:where(.vn-root) *::after{box-sizing:border-box;}',
    ':where(.vn-root) button{font:inherit;color:inherit;margin:0;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}',
    '.vn-root button:focus-visible{outline:2px solid var(--vn-green);outline-offset:2px;}',
    '.vn-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}',
    '.vn-ico{width:24px;height:24px;display:block;flex:none;}',
    '.vn-app{width:100%;background:#fff;}',
    // top bar
    '.vn-bar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;background:var(--vn-green);color:#fff;',
    '  padding:env(safe-area-inset-top,0px) max(10px,env(safe-area-inset-right,0px)) 0 max(10px,env(safe-area-inset-left,0px));',
    '  box-shadow:0 1px 0 rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.08);}',
    '.vn-bar-in{display:contents;}',
    '.vn-bar-ico{width:44px;height:50px;display:flex;align-items:center;justify-content:center;opacity:.97;}',
    ".vn-logo{font-family:'Pacifico',cursive;font-size:27px;line-height:50px;height:50px;color:#fff;letter-spacing:.2px;",
    '  transform:translateY(-1px);user-select:none;-webkit-user-select:none;text-shadow:0 1px 0 rgba(0,0,0,.06);}',
    // post header
    '.vn-post{background:#fff;}',
    '.vn-head{display:flex;align-items:flex-start;gap:11px;padding:12px max(14px,env(safe-area-inset-right,0px)) 11px max(14px,env(safe-area-inset-left,0px));}',
    '.vn-avatar{width:46px;height:46px;flex:none;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.06);}',
    '.vn-avatar-svg{width:100%;height:100%;display:block;}',
    '.vn-who{flex:1 1 auto;min-width:0;line-height:1.2;padding-top:1px;}',
    '.vn-name{font-weight:700;font-size:16.5px;letter-spacing:-.1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.vn-handle{color:var(--vn-gray);font-size:14px;margin-top:1px;}',
    '.vn-loc{display:flex;align-items:center;gap:3px;color:var(--vn-gray);font-size:13.5px;margin-top:3px;}',
    '.vn-loc .vn-ico{width:14px;height:14px;color:var(--vn-green);stroke-width:2.4;margin-left:-1px;}',
    '.vn-date{flex:none;color:var(--vn-gray);font-size:13.5px;padding-top:2px;white-space:nowrap;}',
    // video
    '.vn-media{position:relative;background:#07090d;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}',
    '.vn-video{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;background:#07090d;}',
    '.vn-sound{position:absolute;top:10px;left:10px;z-index:3;display:flex;align-items:center;height:36px;padding:0 8px;border:0;border-radius:18px;',
    '  background:rgba(6,8,10,.68);color:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.28);}',
    '.vn-sound .vn-ico{width:20px;height:20px;}',
    '.vn-sound:focus-visible{outline:2px solid #fff;outline-offset:2px;}',
    '.vn-sound-label{font-weight:600;font-size:13.5px;letter-spacing:.1px;white-space:nowrap;overflow:hidden;max-width:110px;margin-left:6px;',
    '  transition:max-width .35s ease,margin .35s ease,opacity .25s ease;}',
    '.vn-sound.vn-compact .vn-sound-label{max-width:0;margin-left:0;opacity:0;}',
    '.vn-sound .vn-spk-w,.vn-pop .vn-spk-w{display:none;}',
    '.vn-unmuted .vn-sound .vn-spk-w,.vn-unmuted .vn-pop .vn-spk-w{display:inline;}',
    '.vn-unmuted .vn-sound .vn-spk-x,.vn-unmuted .vn-pop .vn-spk-x{display:none;}',
    '.vn-pop{position:absolute;left:50%;top:50%;z-index:2;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgba(8,10,14,.55);',
    '  color:#fff;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;}',
    '.vn-pop .vn-ico{width:38px;height:38px;}',
    '.vn-pop.vn-go{animation:vn-pop .8s ease-out both;}',
    // loop counter
    '.vn-loops{display:flex;align-items:center;gap:6px;padding:11px max(14px,env(safe-area-inset-right,0px)) 0 max(14px,env(safe-area-inset-left,0px));',
    '  color:var(--vn-gray);font-size:14.5px;line-height:1.3;}',
    '.vn-loops .vn-ico{width:16px;height:16px;stroke-width:2.4;}',
    '.vn-loops b{font-weight:700;color:#4c5351;}',
    '.vn-num{display:inline-block;clip-path:inset(0 -3px);font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.vn-roll{display:inline-block;position:relative;animation:vn-up .5s cubic-bezier(.3,1.45,.55,1) both;}',
    '.vn-roll::before{content:attr(data-old);position:absolute;left:0;right:0;bottom:100%;text-align:center;}',
    '.vn-roll.vn-down{animation-name:vn-down;}',
    '.vn-roll.vn-down::before{bottom:auto;top:100%;}',
    '.vn-loops.vn-tick b{animation:vn-flash 1.2s ease-out;}',
    '.vn-ico-loop.vn-spin{animation:vn-spin .75s cubic-bezier(.3,.85,.35,1);}',
    // action row
    '.vn-actions{position:relative;display:flex;align-items:center;gap:8px;padding:9px max(10px,env(safe-area-inset-right,0px)) 2px max(12px,env(safe-area-inset-left,0px));}',
    '.vn-act{position:relative;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 13px 0 10px;border:0;border-radius:19px;',
    '  background:var(--vn-soft);color:#59605e;font-weight:700;font-size:14.5px;cursor:pointer;transition:background-color .18s,color .18s;}',
    '.vn-act .vn-ico{width:21px;height:21px;}',
    '.vn-act:active{transform:scale(.96);}',
    '.vn-act[aria-pressed="true"]{background:var(--vn-green);color:#fff;}',
    '.vn-act[aria-pressed="true"] .vn-heart-path{fill:currentColor;}',
    '.vn-ico-heart.vn-beat{animation:vn-heart .45s cubic-bezier(.3,.7,.4,1);}',
    '.vn-ico-revine.vn-turn{animation:vn-turn .5s cubic-bezier(.3,.8,.35,1);}',
    '.vn-burst{position:absolute;left:21px;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;pointer-events:none;',
    '  border:2px solid var(--vn-green);opacity:0;}',
    '.vn-burst.vn-go{animation:vn-burst .5s ease-out;}',
    '.vn-more{margin-left:auto;width:40px;height:38px;display:flex;align-items:center;justify-content:center;border:0;border-radius:19px;background:transparent;',
    '  color:#7c8381;cursor:pointer;}',
    '.vn-more[aria-expanded="true"]{background:var(--vn-soft);}',
    '.vn-menu{position:absolute;right:max(10px,env(safe-area-inset-right,0px));top:48px;z-index:10;width:236px;padding:6px;background:#fff;border-radius:12px;',
    '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 1px 3px rgba(0,0,0,.1);}',
    '.vn-menu[hidden]{display:none;}',
    '.vn-menu button{display:block;width:100%;text-align:left;padding:10px 12px;border:0;border-radius:8px;background:transparent;font-size:15px;font-weight:600;cursor:pointer;}',
    '.vn-menu button:hover{background:var(--vn-soft);}',
    '.vn-menu .vn-menu-note{padding:6px 12px 4px;color:var(--vn-gray);font-size:12px;line-height:1.3;}',
    // caption + comments
    '.vn-caption{margin:0;padding:9px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));font-size:16px;line-height:1.38;',
    '  overflow-wrap:anywhere;}',
    '.vn-tag{color:var(--vn-green);font-weight:600;}',
    '.vn-viewall{display:block;border:0;background:none;padding:6px max(16px,env(safe-area-inset-right,0px)) 14px max(16px,env(safe-area-inset-left,0px));',
    '  color:var(--vn-gray);font-size:14.5px;cursor:pointer;text-align:left;}',
    '.vn-foot{margin:0;text-align:center;color:#858b89;font-size:12px;line-height:1.4;padding:14px 16px calc(18px + env(safe-area-inset-bottom,0px));}',
    '.vn-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:50;transform:translate(-50%,12px);width:max-content;max-width:calc(100vw - 32px);',
    '  padding:10px 16px;border-radius:20px;background:rgba(20,24,23,.92);color:#fff;font-size:14.5px;font-weight:600;text-align:center;',
    '  opacity:0;pointer-events:none;transition:opacity .2s ease,transform .25s ease;}',
    '.vn-toast.vn-on{opacity:1;transform:translate(-50%,0);}',
    // desktop: centered phone-width column on a light gray page
    '@media (min-width:540px){',
    '  body.vn-body{background:#e3e7e5;}',
    '  .vn-root{padding:20px 0 0;}',
    '  .vn-app{width:min(480px,max(360px,calc(100vh - 336px)));margin:0 auto;border-radius:16px;overflow:hidden;',
    '    box-shadow:0 18px 50px rgba(20,40,32,.16),0 2px 8px rgba(20,40,32,.08);}',
    '  .vn-bar{position:relative;}',
    '  .vn-foot{padding-top:12px;}',
    '}',
    '@keyframes vn-up{from{transform:translateY(100%);}to{transform:none;}}',
    '@keyframes vn-down{from{transform:translateY(-100%);}to{transform:none;}}',
    '@keyframes vn-flash{0%,35%{color:var(--vn-green);}}',
    '@keyframes vn-spin{from{transform:rotate(0);}to{transform:rotate(360deg);}}',
    '@keyframes vn-heart{0%{transform:scale(1);}30%{transform:scale(1.42);}55%{transform:scale(.86);}78%{transform:scale(1.08);}100%{transform:scale(1);}}',
    '@keyframes vn-turn{from{transform:rotate(-180deg) scale(.8);}to{transform:none;}}',
    '@keyframes vn-burst{0%{opacity:.95;transform:scale(.6);}100%{opacity:0;transform:scale(2.7);}}',
    '@keyframes vn-pop{0%{opacity:0;transform:scale(.7);}18%{opacity:1;transform:scale(1);}65%{opacity:1;}100%{opacity:0;transform:scale(1.08);}}',
    '@media (prefers-reduced-motion:reduce){',
    '  .vn-roll,.vn-loops.vn-tick b,.vn-ico-loop.vn-spin,.vn-ico-heart.vn-beat,.vn-ico-revine.vn-turn,.vn-burst.vn-go{animation:none!important;}',
    '  .vn-roll::before{display:none;}',
    '  .vn-pop.vn-go{animation-duration:.01s;}',
    '  .vn-sound-label,.vn-toast{transition:none;}',
    '}',
  ].join('\n');

  // ------------------------------------------------------------------ helpers
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function h(tag, cls, html, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // restart a one-shot CSS animation class
  function replay(node, cls) {
    if (!node) return;
    node.classList.remove(cls);
    void node.getBoundingClientRect();
    node.classList.add(cls);
  }
  // odometer: render `str` into `el` as one span per char; chars that differ from `old` (right-aligned) roll in
  function renderNum(el, str, old, dir) {
    var frag = document.createDocumentFragment();
    var off = old != null ? old.length - str.length : 0;
    for (var i = 0; i < str.length; i++) {
      var s = document.createElement('span');
      s.textContent = str.charAt(i);
      if (old != null) {
        var o = old.charAt(i + off);
        if (o !== str.charAt(i)) {
          s.className = 'vn-roll' + (dir === 'down' ? ' vn-down' : '');
          s.setAttribute('data-old', o);
        }
      }
      frag.appendChild(s);
    }
    el.textContent = '';
    el.appendChild(frag);
  }
  function captionHtml(text) {
    return esc(text).replace(/#[A-Za-z0-9_]+/g, function (tag) { return '<span class="vn-tag">' + tag + '</span>'; });
  }

  // ------------------------------------------------------------------ module state
  var S = {
    els: null,
    shownLoops: 0,
    muted: true,
    liked: false,
    revined: false,
    toastTimer: 0,
    styled: false,
  };

  function audio() { return (LB.mod && LB.mod.audio) || null; }

  function setLoops(n, animate) {
    var e = S.els;
    if (!e || n === S.shownLoops) return;
    var prev = fmt(POST.loops + S.shownLoops), next = fmt(POST.loops + n);
    var up = n > S.shownLoops;
    S.shownLoops = n;
    renderNum(e.loopNum, next, animate ? prev : null, up ? 'up' : 'down');
    e.loopSr.textContent = next + ' loops';
    if (animate) {
      replay(e.loopIcon, 'vn-spin');
      replay(e.loopsRow, 'vn-tick');
    }
  }

  function applyMuted(m) {
    var e = S.els;
    S.muted = m;
    e.root.classList.toggle('vn-unmuted', !m);
    e.sound.setAttribute('aria-pressed', m ? 'false' : 'true');
    e.sound.title = m ? 'Tap for sound' : 'Mute';
    if (!m) e.sound.classList.add('vn-compact');
  }

  function toggleSound() {
    var m = !S.muted;
    applyMuted(m);
    var a = audio();
    if (a && a.setMuted) {
      try { a.setMuted(m); } catch (err) { if (window.console) console.warn('[ui] audio.setMuted failed', err); }
    }
    replay(S.els.pop, 'vn-go');
  }

  function toast(msg) {
    var e = S.els;
    e.toast.textContent = msg;
    e.toast.classList.add('vn-on');
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(function () { e.toast.classList.remove('vn-on'); }, 2300);
  }

  function setLiked(on) {
    var e = S.els;
    var prev = fmt(POST.likes + (S.liked ? 1 : 0));
    S.liked = on;
    var cur = POST.likes + (on ? 1 : 0);
    e.like.setAttribute('aria-pressed', on ? 'true' : 'false');
    e.like.setAttribute('aria-label', 'Like, ' + fmt(cur) + ' likes');
    renderNum(e.likeNum, fmt(cur), prev, on ? 'up' : 'down');
    if (on) { replay(e.likeIcon, 'vn-beat'); replay(e.burst, 'vn-go'); }
  }

  function setRevined(on) {
    var e = S.els;
    var prev = fmt(POST.revines + (S.revined ? 1 : 0));
    S.revined = on;
    var cur = POST.revines + (on ? 1 : 0);
    e.revine.setAttribute('aria-pressed', on ? 'true' : 'false');
    e.revine.setAttribute('aria-label', 'Revine, ' + fmt(cur) + ' revines');
    renderNum(e.revineNum, fmt(cur), prev, on ? 'up' : 'down');
    if (on) replay(e.revineIcon, 'vn-turn');
  }

  function setMenu(open, focusFirst) {
    var e = S.els;
    e.menu.hidden = !open;
    e.more.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && focusFirst) e.menu.querySelector('button').focus();
  }

  function copyLink() {
    var url = location.href;
    function fallback() {
      try {
        var ta = h('textarea', 'vn-sr');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand && document.execCommand('copy');
        document.body.removeChild(ta);
        toast(ok ? 'Link copied' : 'Could not copy the link');
      } catch (err) { toast('Could not copy the link'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, fallback);
    } else fallback();
  }

  // ------------------------------------------------------------------ build
  function build(appEl) {
    if (!S.styled) {
      var st = document.createElement('style');
      st.setAttribute('data-lb', 'ui');
      st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
      S.styled = true;
    }
    if (document.body) document.body.classList.add('vn-body');

    var root = h('div', 'vn-root');
    var app = h('div', 'vn-app');
    root.appendChild(app);

    // top bar: menu, wordmark, camera (decorative line icons, like the app's nav bar)
    var bar = h('header', 'vn-bar');
    bar.appendChild(h('span', 'vn-bar-ico', ICON.menu, { 'aria-hidden': 'true' }));
    bar.appendChild(h('span', 'vn-logo', 'Vine', { 'aria-hidden': 'true' }));
    bar.appendChild(h('span', 'vn-bar-ico', ICON.camera, { 'aria-hidden': 'true' }));
    app.appendChild(bar);

    var main = h('main', 'vn-feed');
    app.appendChild(main);
    main.appendChild(h('h1', 'vn-sr', esc(POST.name) + ': a fan-made Vine-style post'));

    var post = h('article', 'vn-post', null, { 'aria-label': 'Post by ' + POST.name });
    main.appendChild(post);

    // post header
    var head = h('div', 'vn-head');
    head.appendChild(h('div', 'vn-avatar', avatarSvg(), { 'aria-hidden': 'true' }));
    var who = h('div', 'vn-who');
    who.appendChild(h('div', 'vn-name', esc(POST.name)));
    who.appendChild(h('div', 'vn-handle', esc(POST.handle)));
    who.appendChild(h('div', 'vn-loc', ICON.pin + '<span><span class="vn-sr">Location: </span>' + esc(POST.location) + '</span>'));
    head.appendChild(who);
    head.appendChild(h('time', 'vn-date', esc(POST.date), { datetime: POST.dateISO }));
    post.appendChild(head);

    // the square video: `video` is returned to main.js, which mounts the stage into it
    var media = h('div', 'vn-media');
    var video = h('div', 'vn-video', null, { role: 'img', 'aria-label': VIDEO_LABEL });
    media.appendChild(video);
    var sound = h('button', 'vn-sound',
      ICON.speaker + '<span class="vn-sound-label" aria-hidden="true">Tap for sound</span>',
      { type: 'button', 'aria-label': 'Sound', 'aria-pressed': 'false', title: 'Tap for sound' });
    media.appendChild(sound);
    var pop = h('div', 'vn-pop', ICON.speaker, { 'aria-hidden': 'true' });
    media.appendChild(pop);
    post.appendChild(media);

    // loop counter
    var loopsRow = h('div', 'vn-loops');
    loopsRow.innerHTML = ICON.loop + '<span class="vn-sr"></span><span aria-hidden="true"><b><span class="vn-num"></span></b> loops</span>';
    post.appendChild(loopsRow);

    // action row
    var actions = h('div', 'vn-actions');
    var like = h('button', 'vn-act vn-like', ICON.heart + '<span class="vn-num" aria-hidden="true"></span><span class="vn-burst" aria-hidden="true"></span>',
      { type: 'button', 'aria-pressed': 'false' });
    var comment = h('button', 'vn-act vn-comment', ICON.comment + '<span class="vn-num" aria-hidden="true"></span>',
      { type: 'button', 'aria-label': 'Comments, ' + fmt(POST.comments) });
    var revine = h('button', 'vn-act vn-revine', ICON.revine + '<span class="vn-num" aria-hidden="true"></span>',
      { type: 'button', 'aria-pressed': 'false' });
    var more = h('button', 'vn-more', ICON.more, { type: 'button', 'aria-label': 'More options', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
    var menu = h('div', 'vn-menu', null, { role: 'group', 'aria-label': 'More options' });
    menu.hidden = true;
    menu.innerHTML = '<button type="button" data-act="copy">Copy link</button>' +
      '<button type="button" data-act="report">Report this bonk</button>' +
      '<button type="button" data-act="close">Cancel</button>' +
      '<div class="vn-menu-note">Fan-made parody for friends. Not affiliated with Vine.</div>';
    [like, comment, revine, more, menu].forEach(function (n) { actions.appendChild(n); });
    post.appendChild(actions);

    // caption + comments line
    post.appendChild(h('p', 'vn-caption', captionHtml(POST.caption)));
    var viewAll = h('button', 'vn-viewall', 'View all ' + fmt(POST.comments) + ' comments', { type: 'button' });
    post.appendChild(viewAll);

    root.appendChild(h('p', 'vn-foot', 'Fan-made parody for friends. Not affiliated with Vine.'));
    var toastEl = h('div', 'vn-toast', '', { role: 'status', 'aria-live': 'polite' });
    root.appendChild(toastEl);

    appEl.appendChild(root);

    S.els = {
      root: root, media: media, video: video, sound: sound, pop: pop,
      loopsRow: loopsRow, loopIcon: loopsRow.querySelector('.vn-ico-loop'), loopNum: loopsRow.querySelector('.vn-num'), loopSr: loopsRow.querySelector('.vn-sr'),
      like: like, likeIcon: like.querySelector('.vn-ico-heart'), likeNum: like.querySelector('.vn-num'), burst: like.querySelector('.vn-burst'),
      revine: revine, revineIcon: revine.querySelector('.vn-ico-revine'), revineNum: revine.querySelector('.vn-num'),
      commentNum: comment.querySelector('.vn-num'), more: more, menu: menu, toast: toastEl,
    };

    // initial values
    var loops0 = (LB.clock && LB.clock.loops) || 0;
    S.shownLoops = loops0;
    renderNum(S.els.loopNum, fmt(POST.loops + loops0), null);
    S.els.loopSr.textContent = fmt(POST.loops + loops0) + ' loops';
    S.liked = false; S.revined = false;
    renderNum(S.els.likeNum, fmt(POST.likes), null);
    like.setAttribute('aria-label', 'Like, ' + fmt(POST.likes) + ' likes');
    renderNum(S.els.revineNum, fmt(POST.revines), null);
    revine.setAttribute('aria-label', 'Revine, ' + fmt(POST.revines) + ' revines');
    renderNum(S.els.commentNum, fmt(POST.comments), null);
    var a = audio();
    var startMuted = true;
    if (a && a.isMuted) { try { startMuted = !!a.isMuted(); } catch (err) { startMuted = true; } }
    applyMuted(startMuted);
    if (startMuted) sound.classList.remove('vn-compact');

    // events: any tap on the video (the speaker button included) toggles sound
    media.addEventListener('click', toggleSound);
    like.addEventListener('click', function () { setLiked(!S.liked); });
    revine.addEventListener('click', function () { setRevined(!S.revined); });
    var sealed = function () { toast(fmt(POST.comments) + ' comments sealed by court order'); };
    comment.addEventListener('click', sealed);
    viewAll.addEventListener('click', sealed);
    more.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setMenu(menu.hidden, ev.detail === 0);
    });
    menu.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var b = ev.target.closest && ev.target.closest('button');
      if (!b) return;
      var act = b.getAttribute('data-act');
      setMenu(false);
      more.focus();
      if (act === 'copy') copyLink();
      else if (act === 'report') toast('Report reviewed: CASE DISMISSED');
    });
    document.addEventListener('click', function () { if (!menu.hidden) setMenu(false); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !menu.hidden) { setMenu(false); more.focus(); }
    });

    // loop counter: +1 on every wrap of the loop clock, with an odometer tick
    if (LB.clock && LB.clock.onLoop) LB.clock.onLoop(function (n) {
      setLoops(n, true);
      // after the first full play the "Tap for sound" label folds into the speaker icon
      sound.classList.add('vn-compact');
    });

    return video;
  }

  LB.register('ui', {
    create: function (appEl) { return build(appEl || document.body); },
    // called every frame by main.js; cheap: only touches the DOM when the loop count changes
    update: function (t, loops, hints) {
      if (!S.els) return;
      if (typeof loops === 'number' && loops !== S.shownLoops) setLoops(loops, loops === S.shownLoops + 1);
    },
    // QA helpers (not part of the contract surface used by other modules)
    _state: function () { return { loops: POST.loops + S.shownLoops, muted: S.muted, liked: S.liked, revined: S.revined }; },
  });
})();
