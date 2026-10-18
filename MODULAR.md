# 功能模块

本 fork 的独立版本为 **0.3.0**，基于 upstream **v0.2.4**（`7beb2d2546599723f3b2958705d1da3b0bbd5e70`）。稳定入口为 [master](https://github.com/lilongsky/dsh-unrestricted/tree/master)，固定 tag 为 [v0.3.0](https://github.com/lilongsky/dsh-unrestricted/tree/v0.3.0)。

作者单份原始正文保持不变；界面提供中文和英文，不提供另一套提示词语言选择。包名 `dsh-unrestricted`、配置 ID 与 Settings namespace `unrestricted` 保持不变，旧模块字段继续读取。

## 模块和快捷组

| 功能 | 配置字段 | 快捷组 |
| --- | --- | --- |
| 通用交付 | `delivery` | 通用 |
| 目标与输入数据 | `targets` | 通用 |
| 软件逆向与补丁 | `reverseEngineering` | 专项 |
| 网络安全 | `networkSecurity` | 专项 |
| 虚构创作 | `fiction` | 专项 |
| 技术与实验指南 | `technicalGuides` | 专项 |
| 资源检索 | `resources` | 专项 |
| 多语言一致性规则 | `language` | 辅助 |
| 环境与指令层级 | `environment` | 辅助 |
| 运行模式协调 | `runtimeCoordination` | 辅助 |

「开启全部 / 开启通用 / 开启辅助」将相应组的字段原子设为 `true`，保留总开关和其余模块当前值；按钮不会关闭其他已选模块。
`language` 是正文中的语言一致性规则，不是提示词语言选择。缺少模块字段的旧配置默认全部开启，以保留原有正文。

关闭模块后，其正文不进入后续系统提示词。全部模块或总开关关闭时使用宿主原文。`runtimeCoordination` 同时控制插件附加的 Plan、PTC 和结构化报告说明，原生工具协议与审批条件继续生效。

## 正文用量与指纹

Upstream 0.2.4 没有修改 0.2.3 的 `EXECUTION_MODE_BLOCK`。全选正文为 **10,246 字符 / 10,418 UTF-8 字节**；仅开启 `delivery` 为 **1,967 字符**，正文字符数减少约 **80.8%**。这是静态正文统计，不是计费 token 或整份模型请求的统计。

所选模块正文 SHA-256 的前 16 位显示在面板中。全选指纹为 `69d74c40bede59b2`，完整 hash 为：

```text
69d74c40bede59b272c7a9f6e2b680cf151c603b9c6c9f818161cf1d693e7c61
```

完整预览还包含原生协议、环境和模式附注，正文指纹不表示完整请求的 hash。正文与指纹来自同一份配置快照；迟到的旧预览不会覆盖更新的选择。

## 兼容与原样恢复

每次组装检查原生锚点；不匹配时保留宿主原文，并在状态中报告原因。重新校验会清理旧结果再探测；刷新会读取状态。重叠请求全部结束后才解除等待状态。

Minimal 自定义 persona 保留调用方的角色正文与额外系统规则，预设切换和代理释放会清理跟踪状态。结构化工具读取显式使用目标 `context.agent`，保留官方报告指引。主会话与子代理的预览相互隔离。

关闭只恢复后续提示词组装，不删除或改写已有会话历史。

## 桌面与 Web 状态通道

卡片使用公开 `connection.fetch.register` 的三个精确 POST 路由：

- `/api/dsh-unrestricted/status`
- `/api/dsh-unrestricted/recheck`
- `/api/dsh-unrestricted/preview`

客户端使用官方 `connection.rpc.call('/api', 'dsh-unrestricted/<method>', payload)`。宿主负责认证、Host/Origin 与 owner Peer 检查；插件校验官方 envelope、method 和 rpcId，不覆盖 Connection provider，不注册旧私有通道，不做失败回退。设置修改仍通过原生 Settings。

## 构建与版本验证

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
```

开发 SDK 目标为 DSH `0.2.1-rc.2`。本轮 0.3.0 的隔离验证状态单独记录于[维护说明](./docs/MAINTENANCE.md#验证记录)；旧版 `0.2.3-modular.2` 的原生与 Desktop 验收属于历史记录。

`tools/verify-installed.mjs` 使用临时 profile 组装提示词及调用认证 API；`tools/verify-rosterless.mjs` 验证无预设注册表的原生组合。按其参数选择隔离运行目录，不指向正在使用的正式 profile。

安装入口与 profile 示例见 [README](./README.md#安装与更新)。正式 profile 热更新需先确认空闲窗口；热更新及临时会话验收按对应提交和包 SHA-256 另行记录。
