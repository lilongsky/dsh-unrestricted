# 更新记录

本 fork 独立编号；包名 `dsh-unrestricted`、配置 ID / Settings namespace `unrestricted` 保持不变。

## 0.3.0 — 2026-10-19

基于 upstream `v0.2.4`（`7beb2d2546599723f3b2958705d1da3b0bbd5e70`），稳定入口为本 fork 的 `master` / `v0.3.0`。

- 整合上游 Minimal 自定义 persona 跟踪与清理、结构化输出指引、并发预览和状态错误处理，与本 fork 已有同类修复合并。
- 保留十个功能模块、三个快捷启用组、所选正文 SHA-256、正文/hash 配置快照和目标 agent 工具视图。
- 保留桌面/Web 共用的公开精确 API 路由及宿主认证/owner 检查；不覆盖 Connection provider。
- 作者单份正文未变；界面语言与提示词正文选择分离。
- 改用独立维护发布说明，保留已关闭 PR #6 的历史记录、MIT 署名及第三方来源。

本轮隔离验证与正式 profile 热更新的记录边界见[维护说明](./docs/MAINTENANCE.md#验证记录)。历史旧版通过记录不自动成为 0.3.0 的验收结果。

## 0.2.3-modular.2 — 2026-10-18（历史）

对应提交 `ff84a4618098396d4326099d276d4ed8450de267`。

- 修复默认桌面组合下私有状态 RPC 未注册的问题，使用公开 `/api/dsh-unrestricted/{status,recheck,preview}` 路由。
- 校验官方请求 envelope 和 method，保留 rpcId、宿主认证与 owner Peer 检查；移除 Connection provider 覆盖。
- 该版本有 70 项单测、类型检查、构建与 11 项默认原生 Connection 定向检查记录，并有独立的实际 Electron 转发函数定向复验。
- 后续 macOS Desktop 验收核对了四模式状态、四个静态预览、重新校验、原有模块设置和 41 个已安装包文件。

旧版 220 项原生记录只复用其中未改动的提示词、生命周期和配置证据，未声称 RPC 修复时重跑整个套件。上述桌面验收不等于四模式在线模型执行，也不代表当前 0.3.0 已完成正式热更新。
