# dsh-unrestricted · 独立维护版

**简体中文** | [English](./README.en.md) | [日本語](./README.ja.md)

本 fork 基于 [upstream v0.2.4](https://github.com/yexi-by/dsh-unrestricted/tree/v0.2.4)，独立版本为 **0.3.1**。保留作者单份提示词正文，维护十个功能模块、快捷启用按钮、所选正文指纹和桌面公共 API 适配。

稳定入口：[master](https://github.com/lilongsky/dsh-unrestricted/tree/master)；固定版本：[v0.3.1](https://github.com/lilongsky/dsh-unrestricted/tree/v0.3.1)。这是插件版本，不是 DSH 宿主版本。

## 维护范围

上游以单份正文和整体启停为主要路线；本 fork 在此基础上维护按功能选择和桌面集成。[PR #6](https://github.com/yexi-by/dsh-unrestricted/pull/6) 已关闭，后续版本在本仓库独立维护，同时继续评估并整合上游修复。

0.3.1 跟进上游至 [`ab63f68`](https://github.com/yexi-by/dsh-unrestricted/commit/ab63f682d81d7e2312742344fececa9d1a039839)，同步 DSH `0.2.1-rc.3` 兼容性说明和 macOS 桌面安装文档。此前 0.3.0 已整合 upstream 0.2.4 的功能修复；本次不改提示词和运行逻辑。取舍和验证范围见 [维护说明](./docs/MAINTENANCE.md) 与 [更新记录](./CHANGELOG.md)。

## 功能

- 十个功能模块可分别开关；缺少模块字段的旧配置默认保留全部正文。
- 「开启全部 / 开启通用 / 开启辅助」通过原生 Settings 原子更新。按钮只开启组内模块，保留总开关与其他模块当前值。
- 保留 Standard、PTC、Cordis、Minimal、Plan 和子代理的原生工具协议与权限边界，支持自定义 Minimal persona 和结构化报告指引。
- 每次组装检查原生锚点；不匹配时保留宿主原文。面板提供状态、重新校验、预览和所选正文 SHA-256 指纹。
- Web 与 Desktop 卡片通过同一组 `/api/dsh-unrestricted/*` 精确路由读取状态，由宿主认证和 owner Peer 检查保护。

作者正文只有一份；中英文界面语言不选择另一套提示词。模块字段、快捷组和字符统计见 [MODULAR.md](./MODULAR.md)。插件调整后续系统提示词组装，不更改工具目录、审批规则或沙箱权限；关闭后恢复后续组装，不改写既有会话历史。

## 安装与更新

包名保持 `dsh-unrestricted`，配置 ID 和 Settings namespace 保持 `unrestricted`。更新本 fork 时替换同名包，保留原有模块设置，无需并装第二份插件。

下面是固定 tag 的安装入口。更新正在使用的 profile 应先安排明确的空闲窗口，按[安全热更新流程](./docs/MAINTENANCE.md#运行中的-dsh)执行；不要在活动 turn 中直接触发组件 HMR。

### Web profile

```sh
dsh plugin --profile web add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

需要跟随稳定分支时，将 `#v0.3.1` 改为 `#master`。

### Desktop profile

使用对应桌面 App 自带的 CLI，指定 `desktop` profile。macOS 示例：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

Windows 默认安装路径示例：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

桌面端支持 Windows 与 macOS。如果应用安装在其他位置，请替换命令中的应用路径。升级同名插件使用上述 `add` 命令，并先按安全热更新流程确认空闲窗口。

卸载命令（macOS / Windows PowerShell）：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop remove dsh-unrestricted
```

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove dsh-unrestricted
```

此发布构建的验证记录仅含隔离检查；正式 profile 热更新及临时会话验收按对应提交和包 SHA-256 另行记录。

### 本地构建

```sh
git clone --branch v0.3.1 https://github.com/lilongsky/dsh-unrestricted.git
cd dsh-unrestricted
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm pack
```

审阅构建出的包后，可使用对应 profile 的 CLI 安装同名本地 tarball：

```sh
dsh plugin --profile web add "dsh-unrestricted@file:/absolute/path/dsh-unrestricted-0.3.1.tgz" --ignore-scripts
```

## 使用

1. 在原生插件管理页启用 `dsh-unrestricted` 组件。
2. 在插件设置卡片中打开功能总开关，选择所需模块。
3. 检查各模式状态和正文指纹；预览会标明来源。静态预设预览与实际在线请求分开记录。

模块关闭后不再加入后续正文；所有模块或总开关关闭时，后续组装使用原生提示词。现有记录不会被删除。

## 验证范围

声明的宿主范围以 `package.json` 的 `engines.dsh` 为准：`>=0.2.0-rc.2 <0.2.2-0`。构建保持原有开发依赖，本轮原生隔离验证目标为实际 macOS Desktop 自带的 DSH `0.2.1-rc.3`；具体完成状态记录在[维护说明](./docs/MAINTENANCE.md#验证记录)。

2026-10-18 的 `0.2.3-modular.2` 已有隔离宿主和 macOS Desktop 状态、四模式静态预览、重新校验验收记录。它们是旧版本的历史证据，不作为 0.3.1 的本轮实机验收。模型回答质量、拒答率、计费 token 和四模式在线运行需要各自的实际请求证据。

## 协议与致谢

原项目由 [yexi-by](https://github.com/yexi-by/dsh-unrestricted) 发布；本 fork 保留作者署名及 [MIT License](./LICENSE)。部分规则来源与致谢保留在 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)，包括 [Jia-Ethan/codex-keysmith](https://github.com/Jia-Ethan/codex-keysmith)。
