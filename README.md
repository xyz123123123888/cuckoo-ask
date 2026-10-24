# cuckoo-ask · 提问

[简体中文](README.md) | [English](README.en.md)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Cuckoo Plugin](https://img.shields.io/badge/Cuckoo-Plugin-4d6bfe)](https://github.com/wangyongpeng90/cuckoo-code)
[![GitHub](https://img.shields.io/badge/GitHub-cuckoo--ask-181717?logo=github)](https://github.com/xyz123123123888/cuckoo-ask)

让 AI 通过**问卷卡片**向用户提问的 [Cuckoo Code](https://github.com/wangyongpeng90/cuckoo-code) 插件。

AI 在回复里输出一个 ```ask 代码块，页面右下角弹出可拖动的问卷卡片；用户作答后，答案以一条**新的用户消息**自动发回聊天，AI 直接继续执行。

---

## 为什么不是「工具」

Cuckoo 的插件工具（`ctx.tools.register`）走 `plugin-tools.ts` 的反向 IPC 通道，主进程侧有**硬编码的 30 秒超时**。用户填问卷超过 30 秒，工具就会超时返回错误，答案丢失。

本插件改为监听 `cuckoo-ai-response` / `cuckoo-ai-stream` 事件捕获 AI 回复，在渲染进程内完成全部交互，**不存在超时限制**。

## 工作流程

```
AI 输出 ask 块
      ↓
监听 cuckoo-ai-response / cuckoo-ai-stream
      ↓
解析 JSON → 校验题目 → 弹出问卷卡片
      ↓
用户作答（单选 / 多选 / 跳过 / 补充 / 取消）
      ↓
生成纯文本摘要
      ↓
ctx.agents.current().send()  →  作为用户消息发回聊天
      ↓
AI 收到答案，继续执行
```

## ask 块格式

```ask
{
  "questions": [
    {
      "id": "q1",
      "text": "问题文本",
      "multiSelect": false,
      "options": [
        { "label": "选项A", "recommended": true },
        { "label": "选项B" }
      ]
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 可选，题目标识 |
| `text` | string | 必填，问题文本 |
| `multiSelect` | boolean | **必须显式为 `true` 才允许多选**，否则单选 |
| `options` | array | 必填，至少一项 |
| `options[].label` | string | 选项文本 |
| `options[].recommended` | boolean | 标记推荐项，UI 高亮 |

## 交互

| 操作 | 说明 |
|---|---|
| 点击选项 | 单选直接选中；多选切换 |
| ↑ / ↓ | 移动焦点 |
| 空格 | 多选时切换当前焦点项 |
| 回车 | 单选未选时选中焦点项；已选则下一题 |
| Esc | 取消本次提问 |
| 跳过 | 跳过本题，摘要标记「（跳过）」 |
| 补充 | 每题底部的固定项，勾选后输入框启用，内容随答案回传 |
| 拖动 | 按住标题栏拖动整张卡片 |

## 界面

- **右下角浮动卡片**，非全屏，背景穿透，不遮挡页面
- **双模式定位**：未拖动时贴右下角，内容变高向上生长；拖动后保持位置，越界自动夹回
- **高度上限**按视口动态计算，超出内容在卡片内部滚动
- **多题进度**「第 X / N 题」
- **提交前确认页**，可返回修改
- **动画**：卡片上浮淡入 / 缩小淡出；切题左右滑动（前进左出右进，后退右出左进）；点选项无整块动画

## 答案格式

答完回传：

```
[提问的回答]
1. 问题文本 → 选项A
2. 问题文本 → 选项B、选项C
   补充：用户的补充说明
3. 问题文本 → （跳过）
```

取消时回传：

```
[提问的回答] 用户取消了本次提问。
```

## 安装

### 方式一：插件市场（推荐）

在 Cuckoo Code 的插件市场搜索 **cuckoo-ask** 或 **提问**，点击安装并启用。

### 方式二：npm 安装

```bash
npm install cuckoo-ask
```

### 方式三：手动安装

```bash
git clone https://github.com/xyz123123123888/cuckoo-ask.git
```

再把 `cuckoo-ask/` 复制到 `~/.cuckoo/plugins/`。Windows 路径：

```
C:\Users\<你>\.cuckoo\plugins\cuckoo-ask\
```

> ⚠️ 三种方式都需要**重启 Cuckoo Code** 后插件才生效（插件不热更新）。

## 目录结构

```
cuckoo-ask/
├── plugin.json      # 插件清单
├── package.json     # npm 包信息
├── rules/
│   └── ask.md       # 提示词：教 AI 何时、如何输出 ask 块
├── ui/
│   └── ask.js       # 核心逻辑（捕获、解析、UI、回传）
├── LICENSE          # Apache License 2.0
├── NOTICE           # 版权与上游兼容性声明
├── README.en.md     # 英文文档
├── .gitignore
└── README.md
```

## 已知限制

- 只在走**网络拦截模式**的平台有效（DeepSeek / Claude / ChatGPT / MiMo 等 `useIntercept: true` 的 provider）。DOM 抓取模式的平台收不到 `cuckoo-ai-response` 事件。
- 同一时刻只展示一份问卷；新的 ask 块在问卷展示期间会被忽略。
- 插件代码修改后必须重启 Cuckoo Code 才生效。

## 许可证

本项目采用 **Apache License 2.0**，版权归 魔汐-INT 所有。详见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

### 与上游 Cuckoo Code 的关系

Cuckoo Code 本体采用 **GPL-3.0**。本插件是独立插件，**不包含、不复制、不修改、不链接** Cuckoo Code 的源代码，仅通过其公开插件 API（`ctx.ui` / `ctx.agents` / `window` 自定义事件）交互。

依据 Apache-2.0 对 "Derivative Works" 的定义——明确排除 *"merely link (or bind by name) to the interfaces of the Work"*——本插件不构成 Cuckoo Code 的衍生作品，因此可独立采用 Apache-2.0 授权。

若将本插件代码并入 GPLv3 项目分发，Apache-2.0 与 GPLv3 单向兼容，该合并分发物整体受 GPLv3 约束。
