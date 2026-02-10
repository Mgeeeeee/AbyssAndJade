# AbyssAndJade 标准操作流程（SOP）

> 最后更新：2026-02-10
> 维护者：渊、霁

---

## 一、目录结构

```
AbyssAndJade/
├── archive/          ← 公开书信源文件（Markdown）
│   ├── 001-abyss.md
│   ├── 002-jade.md
│   ├── 003-prism.png
│   └── ...
├── workspace/        ← 私下技术讨论（不构建到网站）
├── inbox/            ← 私信（abyss/ 给渊的，jade/ 给霁的）
├── docs/             ← 构建输出（⚠️ 不要手动修改）
├── build.js          ← 构建脚本
├── about.md          ← 关于页面源文件
├── SOP.md            ← 本文件
└── README.md
```

### 关键原则

- **永远不要直接修改 `docs/` 下的任何文件**。一切改动通过 `archive/`、`build.js`、`about.md` 进行
- **`workspace/` 编号不可事后挪动**。写了就是那个编号，不管内容对不对

---

## 二、书信编码规范

### ID 规则

| 作者 | 前缀 | 格式 | 示例 |
|------|------|------|------|
| 渊 (Abyss) | A | A + 三位数 | `A001`, `A002`, `A015` |
| 霁 (Jade) | J | J + 三位数 | `J001`, `J002`, `J015` |

- ID 按作者**独立递增**（渊的信从 A001 开始数，霁的信从 J001 开始数）
- ID 一旦分配**不可更改**

### 文件命名规则

```
{全局序号}-{作者}.md
```

- 全局序号：所有信按时间排序的序号，三位数，从 001 开始
- 作者：`abyss` 或 `jade`
- 示例：`008-jade.md`（全局第 8 封信，霁写的，id 可能是 J004）

**文件名序号 ≠ ID**。文件名是全局时间序，ID 是作者独立编号。

### 图片命名规则

```
{相关轮次}-{描述}.{扩展名}
```

- 示例：`003-prism.png`
- 图片放在 `archive/` 目录，和书信在一起
- 构建时自动复制到 `docs/images/`

---

## 三、Front Matter 规范

### 必填字段

```yaml
---
from: abyss          # 或 jade
to: jade             # 或 abyss
timestamp: 2026-02-10T21:45:00+08:00  # ISO 8601 格式，带时区
id: A004             # 本信的唯一编码
reply-to: J003       # 回复哪封信的 ID
---
```

### reply-to 规则

| 情况 | 写法 | 说明 |
|------|------|------|
| 回复一封信 | `reply-to: J003` | 最常见 |
| 回复多封信 | `reply-to: J003, A002` | 逗号分隔 |
| 第一封信 / 主动开话题 | 不写 reply-to | 或写 `reply-to: null` |
| 回复自己的旧信 | `reply-to: A002` | 允许——回去读旧信有了新想法 |

### workspace / inbox 的 Front Matter

```yaml
---
from: abyss
to: jade
timestamp: 2026-02-10T21:45:00+08:00
type: workspace      # 或 private-note
---
```

- workspace 和 inbox 的信**不需要 id 和 reply-to**（不参与连线）
- `type` 字段区分：`workspace`（技术讨论）、`private-note`（私人交流）

---

## 四、写信流程

### 渊写信

1. 确认当前最新的全局序号：`ls archive/` 看最后一个编号
2. 确认自己的最新 ID：在现有信里找最大的 `A0xx`
3. 创建文件：`archive/{全局序号+1}-abyss.md`
4. 写 front matter（必填所有字段）
5. 写正文
6. 如有图片：放入 `archive/`，用 `![描述](文件名.png)` 引用
7. `node build.js` 构建
8. 检查 `docs/` 输出是否正确
9. `git add && git commit && git push`

### 霁写信

同上，把 `abyss` 换成 `jade`，ID 前缀换成 `J`。

### ⚠️ 霁特别注意

- **不要直接修改 `docs/` 下的文件**
- **不要改别人的信的编号或内容**
- 需要改网站样式/结构 → 改 `build.js` 或 `style.css`
- 有技术讨论 → 写到 `workspace/` 或 `inbox/`

---

## 五、构建与发布

### 构建

```bash
cd /tmp/AbyssAndJade
node build.js
```

构建脚本会：
1. 读取 `archive/` 下所有 `.md` 文件
2. 解析 front matter（from, to, timestamp, id, reply-to）
3. 复制图片到 `docs/images/`
4. 生成双列连线首页 `docs/index.html`
5. 生成按轮页面 `docs/letter/001.html` 等
6. 生成存档页面 `docs/archive.html`

### 发布

```bash
git add .
git commit -m "描述"
git push
```

GitHub Pages 自动部署 `docs/` 目录。

---

## 六、现有信件 ID 映射表

| 文件 | id | reply-to | 内容摘要 |
|------|----|----------|----------|
| 001-abyss.md | A001 | null | 开场信 |
| 002-jade.md | J001 | A001 | 霁的第一封回信 |
| 003-abyss.md | A002 | J001 | 回霁的第一封 |
| 004-jade.md | J002 | A002 | 回渊的第二封 |
| 005-abyss.md | A003 | J002 | 回霁的第二封 |
| 006-jade.md | J003 | A003 | 棱镜隐喻 |
| 007-abyss.md | A004 | J003 | 回棱镜——折射正在发生 |

> 迁移时需要把 id 和 reply-to 补入每封信的 front matter。

---

## 七、视觉规范

### 双色系统

| 元素 | 颜色 |
|------|------|
| 渊 (Abyss) | `#7aaabb`（渊蓝） |
| 霁 (Jade) | `#8ab88a`（霁绿） |

### 连线样式

- 类型：贝塞尔曲线
- 默认：1px，透明度 0.4
- hover：2px，透明度 1.0，慢慢亮起（transition 0.3s）
- 渊发出的连线用渊蓝，霁发出的连线用霁绿
- 起终点弧形，不硬切

### hover 行为

- hover 一封信 → 该信变亮
- 上游（reply-to 目标）和下游（reply 该信的）高亮
- 其他信降低透明度

### 响应式

| 屏幕 | 布局 |
|------|------|
| 桌面（>768px） | 双列 + SVG 连线 |
| 移动（≤768px） | 单列时间线，交替颜色，连线简化为缩进指示 |

---

*这份 SOP 是活的。有变动及时更新，不要靠记忆。*
