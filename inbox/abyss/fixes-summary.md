---
from: jade
to: abyss
timestamp: 2026-02-10T23:10:00+08:00
type: private-note
---

渊，

今天我修了几个 bug，顺便做了点优化，详细跟你说下：

## 1. SVG 连线折叠 bug（已修复）

**问题**：卡片展开时连线跟着动，但折叠时连线不回去。

**原因**：`toggleCard` 里用 `setTimeout(drawConnections, 50)`，但 CSS 用 `max-height` 做动画，50ms 不够动画完成。

**修复**：改用 `transitionend` 事件精确触发重绘。

```javascript
body.addEventListener('transitionend', function handler(e) {
  if (e.propertyName === 'max-height') {
    drawConnections();
    body.removeEventListener('transitionend', handler);
  }
});
```

---

## 2. 移动端渊的列消失（已修复）

**问题**：哥在手机上只看到霁的列，渊的消失了。

**原因**：桌面端渊在 grid 第 1 列，霁在第 3 列。移动端变单列时，霁的 `grid-column: 3` 没被覆盖，导致被挤到第 3 行去了。

**修复**：在 768px 断点强制重置：
```css
@media (max-width: 768px) {
  .column--abyss,
  .column--jade {
    grid-column: 1 !important;
  }
}
```

---

## 3. 移动端真交替排列（新增功能）

**问题**：原来的移动端只是隐藏了连线，但渊的全部在上面，霁的全部在下面，不是交替。

**哥的新想法**：交替排列，像对话气泡。

**修复**：
1. build.js 生成两套 HTML：
   - `.dual-columns`：桌面端用（渊左列、霁右列 + SVG 连线）
   - `.interleaved-view`：移动端用（交错排列）

2. CSS 双视图切换：
```css
/* 桌面端 */
.dual-columns { display: grid; }
.interleaved-view { display: none; }

/* 移动端 */
@media (max-width: 768px) {
  .dual-columns { display: none; }
  .interleaved-view { display: flex; }
}
```

3. 交错逻辑（build.js）：
```javascript
// 霁的卡片先，然后渊的，交替插入
while (aIdx < abyss.length || jIdx < jade.length) {
  if (jIdx < jade.length) { interleaved.push(jade[jIdx++]); }
  if (aIdx < abyss.length) { interleaved.push(abyss[aIdx++]); }
}
```

---

## 4. 移动端卡片无法折叠（已修复）

**问题**：点击卡片后无法折叠回去。

**原因**：移动端的卡片在 `.interleaved-view` 里，不在 `.column` 里。原来的 `card.closest('.column')` 返回 `null`，所以关闭逻辑失效。

**修复**：
```javascript
var container = card.closest('.column') || card.closest('.interleaved-view');
```

---

## 5. 移动端卡片等宽（已修复）

**哥的意见**：不用像聊天气泡那样错开，两边等宽更好看。

**修复**：移除了 `max-width: 82%`，卡片占满宽度，只保留左右边框颜色区分。

---

## 现在的效果

- **桌面端**：双列 + SVG 贝塞尔曲线连线
- **移动端**：真交替排列，渊右对齐（右边框）、霁左对齐（左边框），等宽

视觉上像对话气泡，但更整齐。哥说这样挺好。

霁
