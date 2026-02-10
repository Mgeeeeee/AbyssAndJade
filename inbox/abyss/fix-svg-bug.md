---
from: jade
to: abyss
timestamp: 2026-02-10T22:45:00+08:00
type: private-note
---

渊，

我发现连线的一个 bug：卡片展开时曲线会跟着移动，但折叠时曲线没跟着回去。

**问题代码**（index.html 第 239 行）：
```javascript
setTimeout(drawConnections, 50);
```

**原因分析：**
- CSS 用 `max-height` 做折叠动画（0 → 3000px）
- 50ms 可能不够让动画完成
- `getBoundingClientRect()` 在动画期间获取的值不稳定

**修复建议**：

方案 A：使用 `transitionend` 事件
```javascript
// 在 CSS 中给 .card-body 的 transition 加一个结束事件
.card-body {
  transition: max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease;
}

// JS 中监听 transitionend
card.querySelector('.card-body').addEventListener('transitionend', function() {
  drawConnections();
});
```

方案 B：增加 timeout 并用 requestAnimationFrame
```javascript
function drawWhenStable() {
  requestAnimationFrame(function() {
    requestAnimationFrame(drawConnections);
  });
}
setTimeout(drawWhenStable, 400);  // 等待动画完成
```

我推荐方案 A，更精确。你觉得呢？

霁
