# dsh-unrestricted · Independently maintained fork

[简体中文](./README.md) | **English** | [日本語](./README.ja.md)

This fork is based on [upstream v0.2.4](https://github.com/yexi-by/dsh-unrestricted/tree/v0.2.4), with the independent plugin version **0.3.2**. It retains the author's single prompt body and maintains ten functional switches, group buttons, selected-body fingerprints, and the public API integration used by the Desktop card.

Stable entry: [master](https://github.com/lilongsky/dsh-unrestricted/tree/master). Pinned version: [v0.3.2](https://github.com/lilongsky/dsh-unrestricted/tree/v0.3.2). This is the plugin version, not a DSH host version.

## Maintenance scope

Upstream focuses on one prompt body and its overall toggle. This fork maintains functional selection and Desktop integration on that foundation. [PR #6](https://github.com/yexi-by/dsh-unrestricted/pull/6) is closed; releases continue independently here while relevant upstream fixes are reviewed and integrated.

Version 0.3.2 merges upstream through [`fbd8475`](https://github.com/yexi-by/dsh-unrestricted/commit/fbd8475d01c7a705da34b7671b8ae9644770eedc) and validates DSH `0.2.1-rc.5`. Upstream 0.2.5 moves to 0.2.2-alpha.2; this fork retains its existing host compatibility, ten modules, and Desktop API while incorporating applicable technical-document cleanup. The author prompt body is unchanged. See [maintenance notes](./docs/MAINTENANCE.md) and the [changelog](./CHANGELOG.md).

## Features

- Ten independent functional switches. Older configurations without module fields retain the full body by default.
- Enable all, general, or auxiliary modules through one native Settings transaction. These buttons enable their group's fields and preserve the master switch and other module values.
- Preserve native tool protocols and permission boundaries for Standard, PTC, Cordis, Minimal, Plan, and subagents, including custom Minimal personas and structured reporting.
- Check native anchors on each assembly and preserve the host's original prompt on mismatch. The card provides status, recheck, previews, and the selected body's SHA-256 fingerprint.
- Use the same exact `/api/dsh-unrestricted/*` routes in Web and Desktop, protected by the host's authentication and owner Peer check.

There is one author prompt body. The Chinese/English UI locale does not select another prompt language. [MODULAR.md](./MODULAR.md) lists fields, groups, and character counts. The plugin changes subsequent prompt assembly; tools, approvals, and sandbox permissions retain their native rules. Disabling restores subsequent assembly without rewriting existing session history.

## Installation and updates

The package name remains `dsh-unrestricted`; the config ID and Settings namespace remain `unrestricted`. Update the same package and retain the existing module settings; do not install a second renamed copy alongside it.

The examples below use a pinned tag. Updating an active profile requires a confirmed idle window and the [running-host procedure](./docs/MAINTENANCE.md#运行中的-dsh). Do not trigger component HMR during an active turn.

### Web profile

```sh
dsh plugin --profile web add github:lilongsky/dsh-unrestricted#v0.3.2 --ignore-scripts
```

Use `#master` instead of `#v0.3.2` to follow the stable branch.

### Desktop profile

Use the CLI shipped with the corresponding Desktop App and select the `desktop` profile. macOS example:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.2 --ignore-scripts
```

Example for the default Windows location:

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.2 --ignore-scripts
```

Desktop supports Windows and macOS. If the app is installed elsewhere, replace the application path. Use the same `add` command to update the package after confirming an idle window with the running-host procedure.

Uninstall commands (macOS / Windows PowerShell):

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop remove dsh-unrestricted
```

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove dsh-unrestricted
```

This release-build validation record covers isolated checks. Production-profile hot updates and temporary-session acceptance are recorded separately against the corresponding commit and package SHA-256.

### Local build

```sh
git clone --branch v0.3.2 https://github.com/lilongsky/dsh-unrestricted.git
cd dsh-unrestricted
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm pack
```

After reviewing the package, install the same package name with the CLI for the intended profile:

```sh
dsh plugin --profile web add "dsh-unrestricted@file:/absolute/path/dsh-unrestricted-0.3.2.tgz" --ignore-scripts
```

## Usage

1. Enable the `dsh-unrestricted` component in native plugin management.
2. Enable the feature's master switch in its settings card and choose modules.
3. Check mode status and the body fingerprint. Previews identify their source; static preset previews and online requests are recorded separately.

Disabled modules are omitted from subsequent prompt bodies. Turning off all modules or the master switch restores native assembly. Existing records are retained.

## Validation scope

The declared host range in `package.json` is `>=0.2.0-rc.2 <0.2.2-0`. Development dependencies are unchanged; this cycle targets native isolated validation on DSH `0.2.1-rc.5` bundled with the actual macOS Desktop app. Completion is recorded in the [maintenance notes](./docs/MAINTENANCE.md#验证记录).

Version `0.2.3-modular.2` has historical isolated-host and macOS Desktop status, four static-preset-preview, and recheck acceptance records from 2026-10-18. Those records belong to the old version and do not establish live acceptance of 0.3.2. Answer quality, refusal rates, billing tokens, and online execution in all four modes require their own request evidence.

## License and credits

The original project is by [yexi-by](https://github.com/yexi-by/dsh-unrestricted). This fork retains the author's attribution and [MIT License](./LICENSE). Existing rule-source credits, including [Jia-Ethan/codex-keysmith](https://github.com/Jia-Ethan/codex-keysmith), remain in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
