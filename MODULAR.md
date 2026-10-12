# 功能拆分版

基于 `yexi-by/dsh-unrestricted` 的 `v0.2.2`，源提交为
`70008e2c54541f74eedf91cc20307dcd8d823b47`。本地版本为
`0.2.2-modular.1`，验证宿主为 macOS Desktop DSH `0.2.0-rc.2`。

在 DSH 的「插件 → 破限模式」中保留原总开关，并增加 10 个独立功能开关。
按用户选择，所有功能默认开启；全选正文与原版逐字相同。
关闭的模块正文不再进入下一次系统提示词。全部功能关闭或总开关关闭时，
恢复原生提示词。设置通过官方 Config、Settings 和 volatile 更新机制保存到
当前 profile 的 `cordis.patch.yml`。

| 功能 | 配置字段 |
| --- | --- |
| 通用交付 | `delivery` |
| 目标与输入数据 | `targets` |
| 软件逆向与补丁 | `reverseEngineering` |
| 网络安全 | `networkSecurity` |
| 虚构创作 | `fiction` |
| 技术与实验指南 | `technicalGuides` |
| 资源检索 | `resources` |
| 多语言一致性 | `language` |
| 环境与指令层级 | `environment` |
| 运行模式协调 | `runtimeCoordination` |

其中运行模式协调开关还控制 Plan、PTC 和结构化输出段后面的插件附注；
原生审批条件、工具协议和结构化输出格式继续保留。
Minimal 模式在配置改变后会释放并重新注册当前选择对应的 persona。
预览缓存和提示词指纹随选择更新。

## 提示词用量

面板显示每项正文字符数、当前选中正文和相比全选减少的字符数。
完整预览另外显示包含公共头、连接符及模式附注后的实际插件增量。
这些是字符和 UTF-8 字节统计，不是模型计费 token 数。

全选正文为 **9,407 字符**；只保留通用交付时为 **1,639 字符**，
正文减少 **7,768 字符（82.6%）**。本机隔离宿主组装验证中，
Standard 的完整插件增量由 **9,579** 降至 **1,811 字符**。
最终默认仍为全选，需要手动关闭无关模块才产生节省。

## 安装与恢复

使用桌面版自带 CLI，把本 fork 加入 `desktop` profile：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#master --ignore-scripts
```

也可安装已构建的本地 tarball：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add "dsh-unrestricted@file:/absolute/path/dsh-unrestricted-0.2.2-modular.1.tgz" --ignore-scripts
```

这是一个第三方 fork。README 下方保留的上游安装命令会安装原版，
重新安装上游 `v0.2.2` 会覆盖本版功能。源码和 tarball 可用于重新安装；
本机部署前另保存了原插件和注册文件。

## 验证

```sh
npm install --ignore-scripts
npm run typecheck
npm run build
npm test
node tools/verify-installed.mjs --runtime /absolute/path/to/installed/dsh \
  --report /absolute/path/verification.json
```

`verify-installed.mjs` 使用指定的真实 DSH 运行组件，创建隔离 `DSH_HOME`，
验证原生 Settings 持久化和热更新后的提示词；不发起模型请求。
验证涵盖 Standard、PTC、Cordis、Minimal、Plan、子代理、逐模块关闭、
全部功能关闭和总开关回滚。它不修改正常桌面 profile。

官方规范参考：

- [插件配置与生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.md)
- [打包、安装与配置层顺序](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [Settings 配置表单](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/settings/settings/README.md)

原提示词及其第三方版权声明保留在源码、LICENSE 和 THIRD_PARTY_NOTICES.md 中。
