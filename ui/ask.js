/**
 * 提问（cuckoo-ask）—— UI 插件
 *
 * Copyright 2026 魔汐-INT
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE / NOTICE for details.
 *
 * 捕获 AI 回复里的 ```ask 代码块 → 在 AI 页面弹出全屏问卷 →
 * 用户作答/跳过/取消 → 以一条新用户消息把答案发回聊天 → AI 继续。
 *
 * 不注册工具（避开 plugin-tools 的 30s 超时），走 AI 回复事件捕获。
 */
export const name = 'cuckoo-ask';

const FENCE = String.fromCharCode(96, 96, 96);
const ASK_RE = new RegExp(FENCE + 'ask\\s*\\n([\\s\\S]*?)' + FENCE, 'g');

const CSS = [
  '.cka-layer{position:fixed;inset:0;background:transparent;z-index:2147483647;pointer-events:none;font-family:inherit}',
  '.cka-card{position:absolute;right:24px;bottom:24px;pointer-events:auto;width:max-content;min-width:270px;max-width:min(420px,90vw);max-height:80vh;overflow:hidden auto;background:var(--ck-bg,#fff);color:var(--ck-text,#16181d);border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.06);padding:20px 20px 16px;transform-origin:right bottom;animation:ckaIn .26s cubic-bezier(.22,1.2,.36,1) both;transition:max-height .22s ease,width .22s ease}',  // 入场+高度变化平滑
  '.cka-card.cka-out{animation:ckaOut .18s ease forwards;pointer-events:none}',
  '@keyframes ckaIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}',
  '@keyframes ckaOut{to{opacity:0;transform:translateY(10px) scale(.97)}}',
  '.cka-card.cka-shake{animation:ckaShake .28s ease}',
  '@keyframes ckaShake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}',
  '.cka-head{display:flex;align-items:center;gap:10px;cursor:grab;user-select:none;margin:-4px -4px 0;padding:4px;border-radius:8px}',
  '.cka-head:hover{background:var(--ck-hover-bg,rgba(0,0,0,.035))}',
  '.cka-head.dragging{cursor:grabbing}',
  '.cka-progress{font-size:12px;color:var(--ck-text-dim,#7a8091);flex:1}',
  '.cka-close{border:0;background:transparent;color:var(--ck-text-dim,#7a8091);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;border-radius:6px}',
  '.cka-close:hover{background:var(--ck-hover-bg,rgba(0,0,0,.06))}',
  '.cka-q{font-size:15.5px;font-weight:600;line-height:1.55}',
  '.cka-body{display:flex;flex-direction:column;gap:13px}',
  '.cka-anim-r{animation:ckaSlideInR .24s cubic-bezier(.22,1,.36,1) both}',
  '.cka-anim-l{animation:ckaSlideInL .24s cubic-bezier(.22,1,.36,1) both}',
  '.cka-out-r{animation:ckaSlideOutR .13s ease-in forwards}',
  '.cka-out-l{animation:ckaSlideOutL .13s ease-in forwards}',
  '@keyframes ckaSlideInR{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}',
  '@keyframes ckaSlideInL{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}',
  '@keyframes ckaSlideOutR{to{opacity:0;transform:translateX(26px)}}',
  '@keyframes ckaSlideOutL{to{opacity:0;transform:translateX(-26px)}}',
  '.cka-tip{font-size:11.5px;color:var(--ck-text-dim,#7a8091);margin-top:-8px}',
  '.cka-opts{display:flex;flex-direction:column;gap:8px}',
  '.cka-opt{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--ck-border-strong,#d8dbe2);border-radius:10px;cursor:pointer;font-size:13.5px;line-height:1.4;transition:border-color .14s,background .14s,transform .12s}',
  '.cka-opt:active{transform:scale(.985)}',
  '.cka-opt:hover{background:var(--ck-hover-bg,rgba(0,0,0,.04))}',
  '.cka-opt.focus{border-color:var(--ck-primary,#4d6bfe)}',
  '.cka-opt.on{border-color:var(--ck-primary,#4d6bfe);background:var(--ck-primary-dim,rgba(77,107,254,.08))}',
  '.cka-box{width:16px;height:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--ck-border-strong,#d8dbe2);border-radius:50%;font-size:11px}',
  '.cka-opt.multi .cka-box{border-radius:4px}',
  '.cka-opt.on .cka-box{background:var(--ck-primary,#4d6bfe);border-color:var(--ck-primary,#4d6bfe);color:#fff}',
  '.cka-label{flex:1}',
  '.cka-extra{margin-top:2px}',
  '.cka-extra-input{flex:1;min-width:0;font-family:inherit;font-size:12.5px;color:var(--ck-text,#16181d);background:transparent;border:0;border-bottom:1px solid var(--ck-border-strong,#d8dbe2);outline:none;padding:3px 2px}',
  '.cka-extra-input:disabled{border-bottom-color:transparent;cursor:default}',
  '.cka-extra-input:not(:disabled):focus{border-bottom-color:var(--ck-primary,#4d6bfe)}',
  '.cka-rec{font-size:10.5px;font-weight:600;color:var(--ck-primary,#4d6bfe);background:var(--ck-primary-dim,rgba(77,107,254,.12));padding:2px 7px;border-radius:999px;flex-shrink:0}',
  '.cka-foot{display:flex;gap:8px;justify-content:flex-end;margin-top:2px}',
  '.cka-btn{font-family:inherit;font-size:12.5px;font-weight:600;padding:8px 16px;border-radius:8px;border:1px solid var(--ck-border-strong,#d8dbe2);background:transparent;color:var(--ck-text,#16181d);cursor:pointer;transition:background .14s,transform .1s,opacity .14s}',
  '.cka-btn:not(:disabled):active{transform:scale(.96)}',
  '.cka-btn:hover{background:var(--ck-hover-bg,rgba(0,0,0,.05))}',
  '.cka-btn.pri{background:var(--ck-primary,#4d6bfe);border-color:transparent;color:#fff}',
  '.cka-btn.pri:disabled{opacity:.45;cursor:not-allowed}',
  '.cka-confirm{display:flex;flex-direction:column;gap:10px}',
  '.cka-cf-item{font-size:13px;line-height:1.55;padding:9px 11px;border-radius:8px;background:var(--ck-surface,rgba(0,0,0,.035))}',
  '.cka-cf-q{color:var(--ck-text-dim,#7a8091);font-size:11.5px;margin-bottom:3px}',
  '.cka-cf-a{font-weight:600}',
  '.cka-cf-a.skip{font-weight:400;color:var(--ck-text-dim,#7a8091)}',
  '.cka-empty{font-size:12.5px;color:var(--ck-text-dim,#7a8091);text-align:center;padding:16px 0}',
].join('');

// ---------- 解析 ----------

function parseAskBlocks(text) {
  const out = [];
  ASK_RE.lastIndex = 0;
  let m;
  while ((m = ASK_RE.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj && Array.isArray(obj.questions) && obj.questions.length) out.push(obj);
    } catch (_) { /* 忽略坏块 */ }
  }
  return out;
}

function normQuestions(raw) {
  const list = [];
  for (const q of raw) {
    if (!q || typeof q.text !== 'string' || !q.text.trim()) continue;
    const opts = Array.isArray(q.options) ? q.options.filter((o) => o && typeof o.label === 'string' && o.label.trim()) : [];
    if (!opts.length) continue;
    list.push({
      id: typeof q.id === 'string' ? q.id : 'q' + (list.length + 1),
      text: q.text.trim(),
      multiSelect: q.multiSelect === true,
      options: opts.map((o) => ({ label: o.label, recommended: o.recommended === true })),
    });
  }
  return list;
}

function buildSummary(questions, answers) {
  const lines = ['[提问的回答]'];
  questions.forEach((q, i) => {
    const a = answers[i] || { selected: [], skipped: false };
    if (a.skipped) {
      lines.push((i + 1) + '. ' + q.text + ' → （跳过）');
    } else if (!a.selected.length) {
      lines.push((i + 1) + '. ' + q.text + ' → （未选择）');
    } else {
      lines.push((i + 1) + '. ' + q.text + ' → ' + a.selected.map((idx) => q.options[idx].label).join('、'));
    }
    if (a.extraOn && a.extraText.trim()) {
      lines.push('   补充：' + a.extraText.trim());
    }
  });
  return lines.join('\n');
}

// ---------- 问卷 UI ----------

function createQuestionnaire(questions, onDone) {
  const state = {
    current: 0,
    confirming: false,
    focus: 0,
    answers: questions.map(() => ({ selected: [], skipped: false, extraOn: false, extraText: '' })),
  };

  const backdrop = document.createElement('div');
  backdrop.className = 'cka-layer';

  const card = document.createElement('div');
  card.className = 'cka-card';
  // 内容层：滑动动画只作用在它身上，避免覆盖卡片自身的入场/退场动画
  const body = document.createElement('div');
  body.className = 'cka-body';
  card.appendChild(body);
  backdrop.appendChild(card);

  // 用 offset* 而非 getBoundingClientRect：后者受入场动画 transform 影响，会测偏。
  function fitToViewport() {
    if (!card.isConnected) return;
    const pad = 6;
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!vw || !vh) return;

    // 未拖动：保持 right/bottom 锚定（bottom:24px）—— 内容变高时向上生长。
    // 高度上限必须扣掉底部偏移，否则顶部会越过视口上沿。
    if (!userMoved) {
      const bottomGap = 24;
      card.style.maxHeight = Math.max(120, vh - bottomGap - pad) + 'px';
      return;
    }

    // 已拖动：高度上限按全视口算，越界由下面的 clamp 处理
    card.style.maxHeight = Math.max(120, vh - pad * 2) + 'px';

    // 已拖动：保持 left/top，夹回视口内（内容变高可能越过下/右边界）
    let left = card.offsetLeft;
    let top = card.offsetTop;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    if (top < pad) top = pad;
    if (top + h > vh - pad) top = Math.max(pad, vh - pad - h);
    if (left < pad) left = pad;
    if (left + w > vw - pad) left = Math.max(pad, vw - pad - w);
    card.style.left = Math.round(left) + 'px';
    card.style.top = Math.round(top) + 'px';
  }
  function onWinResize() { try { fitToViewport(); } catch (_) {} }

  function close(summary) {
    const done = () => {
      try { backdrop.remove(); } catch (_) {}
      onDone(summary);
    };
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    window.removeEventListener('resize', onWinResize);
    try { document.body.style.userSelect = ''; } catch (_) {}
    // 播退场动画，结束后再移除（超时兜底）
    let finished = false;
    const fin = () => { if (finished) return; finished = true; done(); };
    try {
      card.classList.add('cka-out');
      card.addEventListener('animationend', fin, { once: true });
      setTimeout(fin, 260);
    } catch (_) { fin(); }
  }

  // ---- 拖动（按住标题栏拖动整张卡片）----
  let userMoved = false; // 用户拖动过 → 改 left/top 绝对定位；否则保持右下角锚定
  let drag = null;
  function onDragMove(e) {
    if (!drag) return;
    const w = card.offsetWidth, h = card.offsetHeight;
    let x = e.clientX - drag.dx;
    let y = e.clientY - drag.dy;
    const maxX = window.innerWidth - w - 6;
    const maxY = window.innerHeight - h - 6;
    x = Math.max(6, Math.min(x, Math.max(6, maxX)));
    y = Math.max(6, Math.min(y, Math.max(6, maxY)));
    card.style.left = x + 'px';
    card.style.top = y + 'px';
  }
  function onDragEnd() {
    drag = null;
    const head = card.querySelector('.cka-head.dragging');
    if (head) head.classList.remove('dragging');
    try { document.body.style.userSelect = ''; } catch (_) {}
  }

  card.addEventListener('mousedown', (e) => {
    const head = e.target && e.target.closest ? e.target.closest('.cka-head') : null;
    if (!head) return;
    if (e.target.closest('.cka-close')) return; // 点按钮不触发拖动
    if (e.button !== 0) return;
    e.preventDefault();
    const r = card.getBoundingClientRect();
    userMoved = true;
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    card.style.left = r.left + 'px';
    card.style.top = r.top + 'px';
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    head.classList.add('dragging');
    try { document.body.style.userSelect = 'none'; } catch (_) {}
  });
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  window.addEventListener('resize', onWinResize);

  function renderProgress() {
    return '第 ' + (state.current + 1) + ' / ' + questions.length + ' 题' +
      (questions[state.current].multiSelect ? ' · 可多选' : ' · 单选');
  }

  let switching = false;
  function render(animate, dir) {
    // 切题：旧内容向反方向滑出，再渲染新内容滑入（前进→左出右进，后退→右出左进）
    if (animate && !switching && body.children.length) {
      switching = true;
      const outCls = dir === -1 ? 'cka-out-r' : 'cka-out-l';
      body.classList.add(outCls);
      setTimeout(() => {
        body.classList.remove(outCls);
        switching = false;
        doRender(animate, dir);
      }, 130);
      return;
    }
    if (switching) return;
    doRender(animate, dir);
  }

  function doRender(animate, dir) {
    body.innerHTML = '';
    try { requestAnimationFrame(fitToViewport); } catch (_) {}
    if (animate) {
      const cls = dir === -1 ? 'cka-anim-l' : 'cka-anim-r';
      body.classList.remove('cka-anim-l', 'cka-anim-r');
      // 强制回流，确保动画类重新生效
      try { void body.offsetWidth; } catch (_) {}
      body.classList.add(cls);
      setTimeout(() => {
        try { body.classList.remove(cls); } catch (_) {}
      }, 280);
    }
    if (state.confirming) return renderConfirm();

    const q = questions[state.current];
    const ans = state.answers[state.current];

    const head = document.createElement('div');
    head.className = 'cka-head';
    const prog = document.createElement('div');
    prog.className = 'cka-progress';
    prog.textContent = renderProgress();
    head.appendChild(prog);

    if (state.current > 0) {
      const back = document.createElement('button');
      back.className = 'cka-close';
      back.textContent = '‹';
      back.title = '上一题';
      back.onclick = () => { state.current--; state.focus = 0; render(true, -1); };
      head.appendChild(back);
    }

    const skip = document.createElement('button');
    skip.className = 'cka-close';
    skip.textContent = '跳过';
    skip.title = '跳过本题';
    skip.style.fontSize = '12px';
    skip.onclick = () => { ans.skipped = true; ans.selected = []; ans.extraOn = false; ans.extraText = ''; next(); };
    head.appendChild(skip);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'cka-close';
    closeBtn.textContent = '✕';
    closeBtn.title = '取消提问';
    closeBtn.onclick = () => close(null);
    head.appendChild(closeBtn);
    body.appendChild(head);

    const qt = document.createElement('div');
    qt.className = 'cka-q';
    qt.textContent = q.text;
    body.appendChild(qt);

    if (q.multiSelect) {
      const tip = document.createElement('div');
      tip.className = 'cka-tip';
      tip.textContent = '可多选，空格键切换';
      body.appendChild(tip);
    }

    const opts = document.createElement('div');
    opts.className = 'cka-opts';
    q.options.forEach((o, idx) => {
      const row = document.createElement('div');
      row.className = 'cka-opt' + (q.multiSelect ? ' multi' : '') +
        (ans.selected.indexOf(idx) >= 0 ? ' on' : '') +
        (state.focus === idx ? ' focus' : '');
      const box = document.createElement('span');
      box.className = 'cka-box';
      box.textContent = ans.selected.indexOf(idx) >= 0 ? '✓' : '';
      const label = document.createElement('span');
      label.className = 'cka-label';
      label.textContent = o.label;
      row.appendChild(box);
      row.appendChild(label);
      if (o.recommended) {
        const rec = document.createElement('span');
        rec.className = 'cka-rec';
        rec.textContent = '推荐';
        row.appendChild(rec);
      }
      row.onclick = () => { toggle(idx); };
      opts.appendChild(row);
    });
    body.appendChild(opts);

    // 固定「补充」项：勾选后右侧输入框可填写自由内容
    const extra = document.createElement('div');
    extra.className = 'cka-opt cka-extra' + (ans.extraOn ? ' on' : '');
    const exBox = document.createElement('span');
    exBox.className = 'cka-box';
    exBox.textContent = ans.extraOn ? '✓' : '';
    const exLabel = document.createElement('span');
    exLabel.className = 'cka-label';
    exLabel.textContent = '补充';
    const exInput = document.createElement('input');
    exInput.className = 'cka-extra-input';
    exInput.type = 'text';
    exInput.placeholder = ans.extraOn ? '填写补充内容…' : '勾选后可填写';
    exInput.value = ans.extraText;
    exInput.disabled = !ans.extraOn;
    exInput.onclick = (e) => e.stopPropagation();
    exInput.oninput = () => { ans.extraText = exInput.value; };
    exInput.onkeydown = (e) => {
      // Enter 在输入框内只换行/结束输入，不触发"下一题"
      if (e.key === 'Enter') e.preventDefault();
    };
    extra.appendChild(exBox);
    extra.appendChild(exLabel);
    extra.appendChild(exInput);
    extra.onclick = (e) => {
      if (e.target === exInput) return;
      ans.extraOn = !ans.extraOn;
      if (!ans.extraOn) ans.extraText = '';
      render(false);
      if (ans.extraOn) {
        try {
          const el = card.querySelector('.cka-extra-input');
          if (el) el.focus();
        } catch (_) {}
      }
    };
    body.appendChild(extra);

    const foot = document.createElement('div');
    foot.className = 'cka-foot';
    const submit = document.createElement('button');
    submit.className = 'cka-btn pri';
    const isLast = state.current === questions.length - 1;
    submit.textContent = isLast ? '下一步' : '下一题';
    submit.disabled = !ans.skipped && ans.selected.length === 0 && !(ans.extraOn && ans.extraText.trim());
    submit.onclick = () => next();
    foot.appendChild(submit);
    body.appendChild(foot);
  }

  function toggle(idx) {
    const q = questions[state.current];
    const ans = state.answers[state.current];
    ans.skipped = false;
    state.focus = idx;
    if (q.multiSelect) {
      const p = ans.selected.indexOf(idx);
      if (p >= 0) ans.selected.splice(p, 1);
      else ans.selected.push(idx);
    } else {
      ans.selected = [idx];
    }
    render(false);
  }

  function next() {
    if (state.current < questions.length - 1) {
      state.current++;
      state.focus = 0;
      const a = state.answers[state.current];
      if (a.selected.length) state.focus = a.selected[0];
      render(true, 1);
    } else {
      state.confirming = true;
      render(true, 1);
    }
  }

  function renderConfirm() {
    const head = document.createElement('div');
    head.className = 'cka-head';
    const prog = document.createElement('div');
    prog.className = 'cka-progress';
    prog.textContent = '确认答案';
    head.appendChild(prog);
    body.appendChild(head);

    const wrap = document.createElement('div');
    wrap.className = 'cka-confirm';
    questions.forEach((q, i) => {
      const a = state.answers[i];
      const item = document.createElement('div');
      item.className = 'cka-cf-item';
      const qd = document.createElement('div');
      qd.className = 'cka-cf-q';
      qd.textContent = (i + 1) + '. ' + q.text;
      const ad = document.createElement('div');
      ad.className = 'cka-cf-a' + (a.skipped || !a.selected.length ? ' skip' : '');
      let adText = a.skipped ? '（跳过）' : (!a.selected.length ? '（未选择）' : a.selected.map((idx) => q.options[idx].label).join('、'));
      if (a.extraOn && a.extraText.trim()) adText += ' ＋ 补充：' + a.extraText.trim();
      ad.textContent = adText;
      item.appendChild(qd);
      item.appendChild(ad);
      wrap.appendChild(item);
    });
    body.appendChild(wrap);

    const foot = document.createElement('div');
    foot.className = 'cka-foot';
    const back = document.createElement('button');
    back.className = 'cka-btn';
    back.textContent = '返回修改';
    back.onclick = () => { state.confirming = false; render(true, -1); };
    const ok = document.createElement('button');
    ok.className = 'cka-btn pri';
    ok.textContent = '确认提交';
    ok.onclick = () => close(buildSummary(questions, state.answers));
    foot.appendChild(back);
    foot.appendChild(ok);
    body.appendChild(foot);
  }

  function onKey(e) {
    if (!backdrop.isConnected) return;
    // 焦点在输入框内时，不拦截键盘（否则空格/回车/方向键会被吞）
    try {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    } catch (_) {}
    const q = questions[state.current];
    if (state.confirming) {
      if (e.key === 'Enter') { e.preventDefault(); close(buildSummary(questions, state.answers)); }
      else if (e.key === 'Escape') { e.preventDefault(); close(null); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); close(null); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.focus = Math.min(q.options.length - 1, state.focus + 1);
      render(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.focus = Math.max(0, state.focus - 1);
      render(false);
    } else if (e.key === ' ' || (e.key === 'Enter' && e.shiftKey)) {
      if (q.multiSelect) { e.preventDefault(); toggle(state.focus); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const ans = state.answers[state.current];
      if (q.multiSelect) {
        if (ans.selected.length) next();
      } else {
        if (!ans.selected.length) toggle(state.focus);
        else next();
      }
    }
  }

  document.addEventListener('keydown', onKey, true);
  // 首帧不播子节点动画：整卡已有入场动画，叠加会显得杂乱
  render(false);
  return backdrop;
}

// ---------- 插件入口 ----------

function dbg(msg) {
  try { ctxLog(msg); } catch (_) {}
  try {
    var api = window.electronAPI;
    if (api && typeof api.pluginDebugLog === 'function') api.pluginDebugLog('[ask] ' + msg);
  } catch (_) {}
}
var ctxLog = function () {};

export function apply(ctx) {
  ctxLog = ctx.log || function () {};
  try { ctx.ui.css(CSS); } catch (_) {}
  dbg('插件已加载，开始监听 cuckoo-ai-response');

  let busy = false;
  let lastText = '';

  function show(questions) {
    busy = true;
    const el = createQuestionnaire(questions, (summary) => {
      busy = false;
      const content = summary || '[提问的回答] 用户取消了本次提问。';
      try {
        const agent = ctx.agents.current();
        if (agent && typeof agent.send === 'function') {
          agent.send({ role: 'user', content }).catch((err) => ctx.log('发送失败: ' + (err && err.message)));
        } else {
          ctx.log('当前无 agent，无法回传答案');
        }
      } catch (err) {
        ctx.log('回传异常: ' + (err && err.message ? err.message : err));
      }
    });
    // 直接挂到 body：避开插件根容器的 pointer-events/层叠上下文限制
    try {
      el.style.pointerEvents = 'none';
      document.body.appendChild(el);
    } catch (_) {
      ctx.ui.mount(el);
      try { el.style.pointerEvents = 'none'; } catch (_) {}
    }
  }

  // 捕获 AI 完整回复（与 bridge 拦截器同一事件源）
  window.addEventListener('cuckoo-ai-response', (ev) => {
    try {
      const detail = ev && ev.detail;
      dbg('收到 cuckoo-ai-response, finished=' + (detail && detail.finished) + ' len=' + ((detail && detail.text) || '').length);
      if (!detail || !detail.finished) return;
      const text = detail.text || '';
      if (!text || text === lastText) return;
      lastText = text;
      const blocks = parseAskBlocks(text);
      dbg('解析 ask 块数量=' + blocks.length + ' 文本尾部=' + JSON.stringify(text.slice(-200)));
      if (!blocks.length) return;
      if (busy) { ctx.log('已有问卷在展示，忽略新的 ask 块'); return; }
      const questions = normQuestions(blocks[0].questions);
      if (!questions.length) return;
      show(questions);
    } catch (err) {
      ctx.log('捕获处理出错: ' + (err && err.message ? err.message : err));
    }
  });

  // 兜底：某些平台可能只派发 stream 的 finished 帧
  window.addEventListener('cuckoo-ai-stream', (ev) => {
    try {
      const d = ev && ev.detail;
      if (!d || !d.finished) return;
      const text = d.text || '';
      if (!text || text === lastText) return;
      if (busy) return;
      const blocks = parseAskBlocks(text);
      if (!blocks.length) return;
      dbg('stream 兜底命中，ask 块=' + blocks.length);
      lastText = text;
      const qs = normQuestions(blocks[0].questions);
      if (qs.length) show(qs);
    } catch (_) {}
  });

  // 侧边栏：最近一次提问/回答记录（辅助入口）
  if (ctx.ui && ctx.ui.shell && typeof ctx.ui.shell.addSidebarPanel === 'function') {
    ctx.ui.shell.addSidebarPanel({
      id: 'cuckoo-ask',
      title: '提问',
      html: '<div style="padding:14px;font-size:12.5px;color:var(--ck-text-dim,#7a8091);line-height:1.7">' +
        '<div style="font-size:14px;font-weight:700;color:var(--ck-text,#16181d);margin-bottom:8px">提问</div>' +
        '当 AI 需要你选择时，会在对话页弹出问卷。答完自动把答案发回聊天。<br><br>' +
        '<span style="color:var(--ck-text-dim,#7a8091)">快捷键：↑↓ 选择 · 空格 多选 · 回车 下一题 · Esc 取消</span>' +
        '</div>',
    }).catch(() => {});
  }
}
