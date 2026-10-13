# 中文提示词本地试用

这是中文提示词分支 `feature/chinese-prompts`，未更新 fork 的 `master` 或 PR。
默认语言为英文，以保留现有配置的行为。部署到本机后可在「插件 → 破限模式 → 提示词语言」选择中文。

每次请求只注入所选语言的插件正文和模式附注。DSH 原生段落、工具名称、schema、占位符和兼容性校验原文保持不变。
模块开关仍使用原有配置；字符统计按实际选择的语言计算。

九个非虚构创作模块及公共说明、模式附注按原文翻译。中文版的虚构创作正文按用户要求留空，没有用改写代替原文。

## 编辑虚构创作空位

文本文件为 `src/prompts/zh-fiction.txt`，当前为空。可直接填写角色、口吻、叙述视角和文体等创作要求。

- 编辑本机已安装插件目录里的同名文件，保存后在 DSH 点击「重新校验」，即可重新读取该文件并更新预览。
- 使用中文版、开启虚构创作模块时，该文件的非空正文才进入请求；留空时不注入任何虚构创作正文。
- 修改后的内容请同时保存到项目源码中的同名文件。重新安装插件会覆盖安装目录里的自定义内容，更新前应备份。

项目源码文件：
`/Users/longskyli/Documents/Codex/2026-10-12/sou-s/outputs/dsh-unrestricted-modular/src/prompts/zh-fiction.txt`

本机部署后的文件：
`/Users/longskyli/.dsh/profiles/desktop/node_modules/dsh-unrestricted/src/prompts/zh-fiction.txt`

## 切回英文

将「提示词语言」切换为 `English（原版）`。从下一次请求开始使用英文原版，模块选择保持原状。
