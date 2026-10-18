# 功能拆分版

本地兼容分支基于作者 `v0.2.3` / `e884f740e379ab71be2dfa2ce7d950a6da7194dd`，版本为 `0.2.3-modular.1`。
保留十个独立功能模块、三组快捷按钮和每项作用说明；默认全部开启，缺少新字段的旧配置也按开启解析。

本版采用作者单份原始正文，不再提供提示词中英文选择。界面文案仍有中文和英文；界面语言不会改变注入正文。
历史 `feature/chinese-prompts` 分支和正式安装中的自定义文件不在本次修改范围内，中文试用文件不进入本版发布包。

## 模块和用量

| 功能 | 配置字段 |
| --- | --- |
| 通用交付 | `delivery` |
| 目标与输入数据 | `targets` |
| 软件逆向与补丁 | `reverseEngineering` |
| 网络安全 | `networkSecurity` |
| 虚构创作 | `fiction` |
| 技术与实验指南 | `technicalGuides` |
| 资源检索 | `resources` |
| 多语言一致性规则 | `language` |
| 环境与指令层级 | `environment` |
| 运行模式协调 | `runtimeCoordination` |

“开启全部 / 开启通用 / 开启辅助”通过原生 Settings 一次原子修改完成，仅开启指定组，保留总开关和其他模块选择。
`language` 是作者正文中的语言一致性规则开关，不是提示词语言选择。
关闭的模块正文不进入下一次系统提示词；全部模块关闭或总开关关闭时恢复原生提示词。
运行模式协调开关同时控制插件附加的 Plan、PTC 和结构化报告说明；原生工具协议和审批条件始终保留。

全选正文与作者 `0.2.3` 的 `EXECUTION_MODE_BLOCK` 逐字一致：**10,246 字符，10,418 UTF-8 字节**。
只保留通用交付时为 **1,967 字符**，减少 **8,279 字符（80.8%）**。
真实宿主 Standard 模式的完整插件增量由 **10,418** 降至 **2,139 字符**。
以上均不是计费 token 统计。

## 指纹、校验和预览

面板显示所选模块正文 SHA-256 的前 16 位。全选指纹为 `69d74c40bede59b2`；完整 SHA-256 为
`69d74c40bede59b272c7a9f6e2b680cf151c603b9c6c9f818161cf1d693e7c61`。
该值标识所选正文；完整预览还包括各模式原生段落和运行附注，因此不是整份请求的 hash。

每次组装均检查原生锚点；不匹配时返回该宿主原有提示词，并在状态中报告失败原因。
“重新校验”清理校验结果和预览后重新探测；“刷新”重新读取状态并更新已展开的预览。
迟到的旧预览不能覆盖新选择；每次预览的正文和指纹使用同一份模块快照。操作等待期间禁止重复提交，多个重叠状态请求全部结束后才解除等待状态。

Minimal complete persona 随空白会话预设切换安装或释放。自定义 Minimal persona 保留调用方原文和附加系统规则，使用组装路径追加正文，不与调用方注册争用。结构化 Minimal 检查显式传入 `context.agent`，保留原生报告工具指令。
主会话实时预览与子代理隔离；Minimal 的预览使用静态预设来源，不把预测字符串标为实时请求。

## 本地构建和验证

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
```

开发依赖采用当前官方 DSH `0.2.1-rc.2` SDK。本轮使用本机 Desktop `0.2.1-rc.2` 导出的原生组件和临时 `DSH_HOME`，
验证原生 Settings 持久化、四预设组装、空白会话切换、Plan、子代理、真实认证 HTTP RPC、逐模块关闭、hash 及原样回滚。
`tools/verify-rosterless.mjs` 另外验证无预设注册表的原生 base 组合；它不是完整 CLI headless 场景验收。

本轮没有模型请求，没有验证回答质量或计费 token；没有操作正式 Desktop 界面、正式 profile 或现有会话。

## 安装本地包

本分支尚未推送，不能用 fork 的远程 `master` 安装当前结果。审阅后可用构建出的本地 tarball：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "dsh-unrestricted@file:/absolute/path/dsh-unrestricted-0.2.3-modular.1.tgz" --ignore-scripts
```

本轮没有执行这条正式安装命令。上游比较、PR 状态和保留模块拆分的依据见 [比较记录](./docs/upstream-0.2.3-review.md)。
