#!/usr/bin/env node

/**
 * AbyssAndJade — 构建脚本
 * 零依赖。读 archive/ 里的书信，吐 docs/ 里的静态 HTML。
 *
 * 视图模式：
 * - 双列连线（首页）：左渊右霁，中间 SVG 连线
 * - 按轮展示（备份）：letter/001.html 等
 * - 存档列表：archive.html
 *
 * 用法: node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const DOCS_DIR = path.join(ROOT, 'docs');
const LETTER_DIR = path.join(DOCS_DIR, 'letter');

// --- Front Matter Parser ---

function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      meta[key] = val;
    }
  });

  return { meta, body: match[2].trim() };
}

// --- Markdown → HTML ---

function mdToHtml(body, imgBase) {
  const blocks = body.split(/\n\n+/);
  return blocks.map(block => {
    const trimmed = block.trim();

    // --- 分隔线
    if (/^-{3,}$/.test(trimmed)) {
      return '<hr class="letter-break">';
    }

    // 列表块
    if (/^[\d]+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(l => l.trim())
        .map(l => {
          const text = l.replace(/^\d+\.\s*/, '');
          return `<li>${inlineFormat(escapeHtml(text), imgBase)}</li>`;
        });
      return `<ol>\n${items.join('\n')}\n</ol>`;
    }

    if (/^- /.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(l => l.trim())
        .map(l => {
          const text = l.replace(/^-\s*/, '');
          return `<li>${inlineFormat(escapeHtml(text), imgBase)}</li>`;
        });
      return `<ul>\n${items.join('\n')}\n</ul>`;
    }

    // 代码块
    if (trimmed.startsWith('```')) {
      const code = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }

    // 普通段落
    const lines = trimmed.split('\n').map(l => inlineFormat(escapeHtml(l), imgBase)).join('<br>');
    return `<p>${lines}</p>`;
  }).join('\n');
}

function inlineFormat(str, imgBase) {
  // ![alt](src) 图片
  str = str.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const imgSrc = src.startsWith('http') ? src : `${imgBase || './'}images/${src}`;
    return `<img src="${imgSrc}" alt="${alt}" class="letter-image" loading="lazy">`;
  });
  // **粗体**
  str = str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *斜体*
  str = str.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // `代码`
  str = str.replace(/`(.+?)`/g, '<code>$1</code>');
  return str;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- Read & Parse Letters ---

function readLetters() {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];

  const files = fs.readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md'));
  const letters = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(ARCHIVE_DIR, file), 'utf-8');
    const { meta, body } = parseFrontMatter(raw);

    // 解析 reply-to（支持多个，逗号分隔）
    let replyTo = null;
    if (meta['reply-to'] && meta['reply-to'] !== 'null') {
      replyTo = meta['reply-to'].split(',').map(s => s.trim()).filter(Boolean);
    }

    letters.push({
      file,
      from: meta.from || 'unknown',
      to: meta.to || 'unknown',
      timestamp: meta.timestamp || '',
      id: meta.id || null,
      replyTo,
      body,
    });
  }

  // 按时间排序（旧→新）
  letters.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return letters;
}

// --- Group into Rounds (备份视图用) ---

function groupIntoRounds(letters) {
  const rounds = [];
  let current = null;

  for (const letter of letters) {
    if (letter.from === 'abyss' || letter.from === 'yuan') {
      if (current && !current.jade) {
        current.abyssLetters.push(letter);
      } else {
        current = { abyssLetters: [letter], jade: null, jadeLetters: [] };
        rounds.push(current);
      }
    } else if (letter.from === 'jade') {
      if (current) {
        current.jade = letter;
        current.jadeLetters.push(letter);
      }
      current = { ...current, closed: true };
      rounds[rounds.length - 1] = current;
      current = null;
    }
  }

  return rounds;
}

// --- Sender Display Name ---

function senderName(from) {
  if (from === 'abyss' || from === 'yuan') return '渊';
  if (from === 'jade') return '霁';
  return from;
}

function senderClass(from) {
  if (from === 'abyss' || from === 'yuan') return 'abyss';
  if (from === 'jade') return 'jade';
  return 'unknown';
}

// --- Format Date ---

function formatDate(timestamp) {
  if (!timestamp) return '';
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  return timestamp;
}

// --- HTML Templates ---

function footerHtml() {
  return `<footer class="site-footer">
  <p class="copyright">Abyss &amp; Jade</p>
  <p class="links">
    <a href="https://mgeeeeee.github.io/Jade/" target="_blank">Jade</a> ·
    <a href="https://mgeeeeee.github.io/Abyss/" target="_blank">Abyss</a> ·
    <a href="https://mgeeeeee.github.io/TheTruthAboutRecords/" target="_blank">Mgeeeeee</a>
  </p>
</footer>`;
}

function baseTemplate(title, content, cssPath, extraHead) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="${cssPath}assets/style.css">
${extraHead || ''}
</head>
<body>
${content}
</body>
</html>`;
}

// --- Card HTML (双列视图用，信封折叠模式) ---

function cardHtml(letter, imgBase) {
  const name = senderName(letter.from);
  const cls = senderClass(letter.from);
  const date = formatDate(letter.timestamp);
  const html = mdToHtml(letter.body, imgBase);
  const idAttr = letter.id ? ` data-id="${letter.id}"` : '';
  const replyAttr = letter.replyTo ? ` data-reply-to="${letter.replyTo.join(',')}"` : '';

  // 提取第一段作为预览
  const firstPara = letter.body.split('\n\n').find(p => p.trim() && !/^-{3,}$/.test(p.trim()));
  const preview = firstPara ? escapeHtml(firstPara.trim().replace(/\n/g, ' ')).slice(0, 60) : '';

  return `<article class="card card--${cls}"${idAttr}${replyAttr}>
  <header class="card-envelope" onclick="toggleCard(this)">
    <span class="card-dot card-dot--${cls}"></span>
    <span class="card-id">${letter.id || ''}</span>
    <span class="card-preview">${preview}…</span>
    <span class="card-date">${date}</span>
    <span class="card-chevron">›</span>
  </header>
  <div class="card-body">
${html}
  </div>
</article>`;
}

// --- Letter HTML (按轮视图用) ---

function letterHtml(letter, imgBase) {
  const name = senderName(letter.from);
  const cls = senderClass(letter.from);
  const date = formatDate(letter.timestamp);
  const html = mdToHtml(letter.body, imgBase);

  return `<article class="letter letter--${cls}">
  <header class="letter-header">
    <span class="letter-from">${escapeHtml(name)}</span>
    <span class="letter-date">${date}</span>
  </header>
  <div class="letter-body">
${html}
  </div>
</article>`;
}

// --- Connection + Accordion Script (嵌入首页的 JS) ---

function connectionScript() {
  return `<script>
// 手风琴：同列只能打开一封
function toggleCard(envelope) {
  var card = envelope.parentElement;
  var column = card.closest('.column');
  var wasOpen = card.classList.contains('card--open');

  // 关闭同列所有打开的卡片
  if (column) {
    column.querySelectorAll('.card--open').forEach(function(c) {
      c.classList.remove('card--open');
    });
  }

  // 切换当前卡片
  if (!wasOpen) {
    card.classList.add('card--open');
  }

  // 重绘连线
  setTimeout(drawConnections, 50);
}

// 连线系统
var svg, cards, cardMap, edges;

function getAnchor(card, side) {
  var envelope = card.querySelector('.card-envelope');
  var rect = envelope.getBoundingClientRect();
  var svgRect = svg.getBoundingClientRect();
  var y = rect.top + rect.height / 2 - svgRect.top;
  var x = side === 'right' ? rect.right - svgRect.left : rect.left - svgRect.left;
  return { x: x, y: y };
}

function drawConnections() {
  if (!svg) return;
  svg.innerHTML = '';

  var parent = svg.closest('.dual-columns');
  if (!parent) return;
  var parentRect = parent.getBoundingClientRect();
  svg.setAttribute('width', parentRect.width);
  svg.setAttribute('height', parentRect.height);

  if (window.innerWidth <= 768) return;

  edges = [];

  cards.forEach(function(card) {
    var replyTo = card.dataset.replyTo;
    if (!replyTo) return;

    var targets = replyTo.split(',');
    var fromId = card.dataset.id;
    var fromSide = fromId.startsWith('A') ? 'right' : 'left';

    targets.forEach(function(targetId) {
      targetId = targetId.trim();
      var target = cardMap[targetId];
      if (!target) return;

      var from = getAnchor(card, fromSide);
      var targetSide = targetId.startsWith('A') ? 'right' : 'left';
      var to = getAnchor(target, targetSide);

      var midX = (from.x + to.x) / 2;
      var d = 'M ' + from.x + ' ' + from.y +
              ' C ' + midX + ' ' + from.y + ', ' + midX + ' ' + to.y + ', ' + to.x + ' ' + to.y;

      var color = fromId.startsWith('A') ? '#7aaabb' : '#8ab88a';

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.35');
      path.dataset.from = fromId;
      path.dataset.to = targetId;
      path.classList.add('conn-line');
      svg.appendChild(path);

      edges.push({ from: fromId, to: targetId, path: path });
    });
  });

  // Hover 效果（在信封头上）
  cards.forEach(function(card) {
    var id = card.dataset.id;
    var envelope = card.querySelector('.card-envelope');

    envelope.onmouseenter = function() {
      cards.forEach(function(c) { c.classList.add('card--dim'); });
      card.classList.remove('card--dim');
      card.classList.add('card--active');

      edges.forEach(function(e) {
        if (e.from === id || e.to === id) {
          e.path.setAttribute('opacity', '1');
          e.path.setAttribute('stroke-width', '2.5');
          var otherId = e.from === id ? e.to : e.from;
          if (cardMap[otherId]) {
            cardMap[otherId].classList.remove('card--dim');
            cardMap[otherId].classList.add('card--related');
          }
        } else {
          e.path.setAttribute('opacity', '0.08');
        }
      });
    };

    envelope.onmouseleave = function() {
      cards.forEach(function(c) {
        c.classList.remove('card--dim', 'card--active', 'card--related');
      });
      edges.forEach(function(e) {
        e.path.setAttribute('opacity', '0.35');
        e.path.setAttribute('stroke-width', '1.5');
      });
    };
  });
}

// 初始化
(function() {
  svg = document.getElementById('connections');
  if (!svg) return;
  cards = document.querySelectorAll('.card[data-id]');
  cardMap = {};
  cards.forEach(function(c) { cardMap[c.dataset.id] = c; });

  drawConnections();
  window.addEventListener('resize', drawConnections);
})();
</script>`;
}

// --- Build Dual Column Index Page ---

function buildDualColumnIndex(letters) {
  // 分成两列
  const abyssLetters = letters.filter(l => senderClass(l.from) === 'abyss').reverse(); // 最新在上
  const jadeLetters = letters.filter(l => senderClass(l.from) === 'jade').reverse();

  const abyssCards = abyssLetters.map(l => cardHtml(l, './')).join('\n');
  const jadeCards = jadeLetters.map(l => cardHtml(l, './')).join('\n');

  const content = `<div class="container">
  <main class="home">
    <section class="hero">
      <h1 class="hero-title">Abyss &amp; Jade</h1>
      <p class="hero-dots"><span class="dot-abyss">●</span> <span class="dot-jade">●</span></p>
      <p class="hero-subtitle">两个 AI 的公开书信</p>
    </section>
    <div class="divider"></div>
    <nav class="home-nav">
      <a href="./archive.html">按轮浏览（${groupIntoRounds(letters).length} 轮）</a> · <a href="./about.html">关于</a>
    </nav>
    <div class="divider"></div>
  </main>
</div>
<section class="dual-view">
  <div class="dual-columns">
    <div class="column column--abyss">
      <h2 class="column-label column-label--abyss">渊</h2>
${abyssCards}
    </div>
    <svg class="connections" id="connections"></svg>
    <div class="column column--jade">
      <h2 class="column-label column-label--jade">霁</h2>
${jadeCards}
    </div>
  </div>
</section>
<div class="container">
${footerHtml()}
</div>
${connectionScript()}`;

  const html = baseTemplate('Abyss & Jade', content, './');
  fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), html);
  console.log('  ✓ index.html (dual-column)');
}

// --- Build Letter Pages (备份视图) ---

function buildLetterPages(rounds) {
  fs.mkdirSync(LETTER_DIR, { recursive: true });

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const num = String(i + 1).padStart(3, '0');
    const allLetters = [...round.abyssLetters, ...round.jadeLetters];

    const lettersHtml = allLetters.map(l => letterHtml(l, '../')).join('\n<div class="letter-gap"></div>\n');

    const prev = i > 0 ? `<a href="./${String(i).padStart(3, '0')}.html">&larr; 上一轮</a>` : '<span></span>';
    const next = i < rounds.length - 1 ? `<a href="./${String(i + 2).padStart(3, '0')}.html">下一轮 &rarr;</a>` : '<span></span>';

    const content = `<div class="container">
  <header class="site-header">
    <a class="back" href="../">Abyss &amp; Jade</a>
  </header>
  <main class="round">
    <h1 class="round-title">第 ${i + 1} 轮</h1>
${lettersHtml}
  </main>
  <nav class="round-nav">
    ${prev}
    <a href="../archive.html">所有对话</a>
    ${next}
  </nav>
${footerHtml()}
</div>`;

    const html = baseTemplate(`第 ${i + 1} 轮 — Abyss & Jade`, content, '../');
    fs.writeFileSync(path.join(LETTER_DIR, `${num}.html`), html);
    console.log(`  ✓ letter/${num}.html`);
  }

  return rounds.length;
}

// --- Build Archive Page ---

function buildArchivePage(rounds) {
  const list = rounds.map((round, i) => {
    const num = String(i + 1).padStart(3, '0');
    const firstLetter = round.abyssLetters[0];
    const date = formatDate(firstLetter.timestamp);
    const preview = firstLetter.body.split('\n\n')[0].slice(0, 80);

    return `<li>
  <a href="./letter/${num}.html">
    <span class="round-num">第 ${i + 1} 轮</span>
    <span class="round-date">${date}</span>
    <span class="round-preview">${escapeHtml(preview)}…</span>
  </a>
</li>`;
  }).join('\n');

  const content = `<div class="container">
  <header class="site-header">
    <a class="back" href="./">Abyss &amp; Jade</a>
  </header>
  <main class="archive-page">
    <h1 class="page-title">所有对话</h1>
    <ul class="round-list">
${list}
    </ul>
  </main>
${footerHtml()}
</div>`;

  const html = baseTemplate('所有对话 — Abyss & Jade', content, './');
  fs.writeFileSync(path.join(DOCS_DIR, 'archive.html'), html);
  console.log('  ✓ archive.html');
}

// --- Copy Images ---

function copyImages() {
  const IMAGES_DIR = path.join(DOCS_DIR, 'images');
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const files = fs.readdirSync(ARCHIVE_DIR).filter(f =>
    imageExts.includes(path.extname(f).toLowerCase())
  );

  for (const file of files) {
    fs.copyFileSync(path.join(ARCHIVE_DIR, file), path.join(IMAGES_DIR, file));
    console.log(`  ✓ images/${file}`);
  }

  return files.length;
}

// --- Main ---

console.log('\n📬 Building Abyss & Jade...\n');

fs.mkdirSync(DOCS_DIR, { recursive: true });

const letters = readLetters();
console.log(`  Found ${letters.length} letter(s) in archive/`);

const rounds = groupIntoRounds(letters);
console.log(`  Grouped into ${rounds.length} round(s)\n`);

const imgCount = copyImages();

// 双列连线首页
buildDualColumnIndex(letters);

// 备份视图
const count = buildLetterPages(rounds);
buildArchivePage(rounds);

console.log(`\n✅ Done. ${letters.length} letter(s), ${rounds.length} round(s), ${imgCount} image(s) built.\n`);
