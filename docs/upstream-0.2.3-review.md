# 上游 0.2.3 比较记录（2026-10-18）

## PR #6 的已确认状态

[PR #6](https://github.com/yexi-by/dsh-unrestricted/pull/6) 仍为 open，未 merged，`closed_at` 与 `merged_at` 均为空。
API 中 issue comments、reviews、review comments、issue events 均为空；6 个提交全部来自我们的贡献分支，head 为
`430430f608c08c3bb06ad4ce5a081b6b7075a5b8`。查询时 `mergeable=false`、`mergeable_state=dirty`。

没有作者反馈能说明为何未合并。合并冲突说明当前分支需要整合，不足以推断作者反对模块拆分、拒绝该设计或认定它无效。
上游共同基线为 `70008e2`，之后有 `945b962`（桌面依赖恢复说明）和 `e884f74`（0.2.3 兼容修复）。
上游最新 master 与 `v0.2.3` 同为 `e884f740e379ab71be2dfa2ce7d950a6da7194dd`。

## 取舍

| 上游变化 | 本地结果与依据 |
| --- | --- |
| Minimal 空白会话预设切换时释放/重建 complete persona | 采用；真实宿主验证 Minimal 与其他三个预设双向切换的第一次组装与工具目录。 |
| 预设 scope lease / 无 registry 支持 | 采用；保留旧 mount 兼容路径，原生 base 标准/PTC 组合另行验证。 |
| 主/子代理预览隔离，status 等待校验 | 采用；实际认证 HTTP RPC 验证主会话字节、子代理隔离、recheck 后静态预览。 |
| delegated custom persona 追加指针 | 采用；保留子代理自身角色，避免其覆盖主会话预览。 |
| Minimal 结构化报告指令 | 采用并修正上游遗漏的 scope：当前 Tools.schemas(scope) 省略参数会读取 global view，无法看到子代理工具；显式传入 context.agent 后读取代理工具视图。 |
| 等待状态、错误本地化、预览来源 | 采用；保留 fork 原有旧预览拒绝机制，等待状态覆盖重叠操作，保留功能模块/快捷按钮。 |
| 提示词正文变化 | 采用作者完整 0.2.3 单份原文，再沿既有功能边界拆分；Delivery 的交付形式、Fiction 的文风适配、Resources 的工具识别和 PoC 拼写均不自行改写。全选用独立上游 SHA 回归。 |
| fingerprint 与 anchors / 失败原样恢复 | 恢复所选正文 fingerprint，保留逐次锚点检查和失败回原文；失败时清理此前实时预览，hash 不替代兼容检查。 |
| 中英文提示词试用层 | 按本轮最终要求移除；UI 中英文仍保留。正式安装的用户自定义槽没有读取或复制。 |
| 上游仍把正文放在一个文件 | 保留 fork 功能拆分。未找到作者说明或实测显示不拆分有优势；默认全选已逐字等价，模块选择能减少无关正文。单文件较少文件只是结构事实，不是运行效果证据。 |
| Windows issue #7 恢复工具 | 未运行或移植。该脚本针对特定旧 Windows 依赖冲突，会重装上游 0.2.2 并要求退出桌面，不适用于本轮 macOS 新分支验证。 |
| 依赖和版本声明 | 采用作者 engines 范围，开发 SDK 更新为本机对应 0.2.1-rc.2；当前实际验证范围只宣称 0.2.1-rc.2。 |

## 集成候选独立复审整改

独立复审用真实宿主复现了两项候选问题：

- Minimal 父代理派生自定义 persona 的子代理，在同一 agent scope 注册 complete shadow 会与调用方的 persona 重名，并使异步启用回调抛错。整改后仅识别这一原生重名冲突，不取得或释放用户注册；实际组装沿调用方 persona 和其他原生段落追加模块正文，原生结构化报告指令保留。普通 Minimal 继续使用原有 complete shadow。
- preview 在等待预设 scope 时模块选择变化，原实现会返回新正文和旧 fingerprint。整改为单次读取 modules/enabled 快照，正文和 hash 使用同一份选择；不新增 epoch 或恢复层。

这两项是对本地集成候选的复现与整改；没有单独运行作者原版复现，因此不归因为作者版缺陷。

## 多语言文档与真实注入路径

上游确有多语言 prompt 规则内容：

- `docs/prompt-fusion.md`、`docs/prompt-fusion.en.md`、`docs/prompt-fusion.ja.md`：中文、英文、日文规则说明和片段，尤其第 2 节。
- `docs/prompt-refactor-v0.1.7.md`、`.en.md`、`.ja.md`：重构说明、提示词摘录与源码对照。

这些文件与代码是人工维护的说明关系，不是三份逐字等价的完整运行时模板。比如中文动态注入说明的 Delivery 是概述，
源码中的 Delivery 是完整条款列表。文档中“修改契约后同步源码、测试和对照表”的要求也表明它们是说明记录。

实际路径是 `src/node.js` 的 `system-prompt/assemble` → `src/rules.js` 的 `fuseSections`，或 Minimal complete persona 的 `fusedMinimalPrompt`。
上游这两条路径都使用 `src/rules.js` 的单份 `EXECUTION_MODE_BLOCK`；没有 import/读取 docs、没有语言配置。
正文以英文为主，包含作者写入的中文路由标签和示例，因此“包含多种语言字样”也不表示注入了多份语言模板。

原 fork 的 `promptLanguage=en/zh` 曾实际选择正文及附注，和 UI locale、README 语言不同；本轮最终版本已撤掉该选择层，
采用作者单份正文。UI locale 只影响界面文字。不会同时加载 docs 中的中、英、日内容。

## 证据范围

单测验证模块关闭、原生段落保留、空选回原文、hash、并发等待及旧响应拒绝。真实宿主验证使用本机 `0.2.1-rc.2` 原生组件、
临时 `DSH_HOME` 与临时会话；认证 RPC 通过该临时宿主 HTTP 入口执行。Minimal 结构化场景用原生子代理组合与 Tools.register，未启动 provider activation 或执行工具。

无模型请求；不证明模型行为、拒答率、输出质量或服务端安全规则变化。当前未操作正式 Desktop UI、配置或会话，未推送本分支或更新 PR #6。
