# dsh-unrestricted · 独立保守 fork

[简体中文](./README.md) | [English](./README.en.md) | **日本語**

[upstream v0.2.4](https://github.com/yexi-by/dsh-unrestricted/tree/v0.2.4) を基にした独立保守版です。プラグインのバージョンは **0.3.1**。作者の単一プロンプト本文を保ち、10 個の機能スイッチ、グループボタン、選択した本文の指紋、Desktop 用の公開 API 連携を保守します。

安定版の入口は [master](https://github.com/lilongsky/dsh-unrestricted/tree/master)、固定版は [v0.3.1](https://github.com/lilongsky/dsh-unrestricted/tree/v0.3.1) です。これはプラグインの版であり、DSH 本体の版ではありません。

## 保守方針

上流は単一の本文と全体スイッチを中心とする軽量な構成です。本 fork は、その基盤の上で機能別の選択と Desktop 連携を保守します。[PR #6](https://github.com/yexi-by/dsh-unrestricted/pull/6) は終了しており、今後のリリースはこのリポジトリで独立して行い、必要な上流修正を引き続き取り込みます。

0.3.1 は上流の [`ab63f68`](https://github.com/yexi-by/dsh-unrestricted/commit/ab63f682d81d7e2312742344fececa9d1a039839) まで追従し、DSH `0.2.1-rc.3` の互換性説明と macOS Desktop の導入手順を取り込みます。upstream 0.2.4 の機能修正は 0.3.0 で統合済みで、今回は本文と実行ロジックを変更しません。[保守説明](./docs/MAINTENANCE.md) と [変更履歴](./CHANGELOG.md) を参照してください。

## 機能

- 10 個の機能を個別に切り替えられます。古い設定にモジュール項目がない場合は、従来どおり全文を有効とします。
- 全部・汎用・補助の有効化ボタンは、ネイティブ Settings の 1 回のトランザクションで対象項目を有効にします。総合スイッチと対象外のモジュール値は保持します。
- Standard、PTC、Cordis、Minimal、Plan、サブエージェントのツールプロトコルと権限境界を維持します。Minimal のカスタム persona と構造化レポート指示にも対応します。
- 組み立てのたびにネイティブのアンカーを確認し、不一致なら元のホストプロンプトを保ちます。カードには状態、再確認、プレビュー、選択本文の SHA-256 指紋を表示します。
- Web と Desktop は同じ `/api/dsh-unrestricted/*` の完全一致ルートを使い、ホストの認証と owner Peer の確認を通ります。

作者の本文は 1 種類です。中国語・英語の UI 表示はプロンプトの言語選択ではありません。項目・グループ・文字数は [MODULAR.md](./MODULAR.md) に記載しています。変更するのは以後のプロンプト組み立てであり、ツール、承認、サンドボックスはネイティブの規則に従います。無効化しても既存のセッション履歴は書き換えません。

## インストールと更新

パッケージ名は `dsh-unrestricted`、設定 ID と Settings namespace は `unrestricted` のままです。同名パッケージを更新し、既存のモジュール設定を保持します。別名のコピーを並行して導入する必要はありません。

以下は固定タグの導入例です。使用中の profile の更新には、明確なアイドル時間帯を確保し、[稼働中のホストの手順](./docs/MAINTENANCE.md#运行中的-dsh)に従ってください。実行中の turn に対してコンポーネント HMR を行わないでください。

### Web profile

```sh
dsh plugin --profile web add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

安定ブランチに追従する場合は `#v0.3.1` を `#master` に変更します。

### Desktop profile

対応する Desktop App に付属する CLI を使い、`desktop` profile を指定します。macOS の例：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

Windows の標準インストール先の例：

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" `
  plugin --profile desktop add github:lilongsky/dsh-unrestricted#v0.3.1 --ignore-scripts
```

Desktop は Windows と macOS に対応します。別の場所にインストールした場合はアプリのパスを置き換えてください。更新時も同じ `add` コマンドを使い、稼働中のホストの手順に従ってアイドル時間帯を確認します。

アンインストール（macOS / Windows PowerShell）：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop remove dsh-unrestricted
```

```powershell
& "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop remove dsh-unrestricted
```

このリリースビルドの検証記録は隔離環境での確認を対象とします。正式 profile のホット更新と一時セッションでの受け入れ確認は、対応するコミットとパッケージの SHA-256 に紐付けて別途記録します。

### ローカルビルド

```sh
git clone --branch v0.3.1 https://github.com/lilongsky/dsh-unrestricted.git
cd dsh-unrestricted
npm ci --ignore-scripts
npm test
npm run typecheck
npm run build
npm pack
```

作成したパッケージを確認した後、目的の profile の CLI で同名の tarball を導入できます。

```sh
dsh plugin --profile web add "dsh-unrestricted@file:/absolute/path/dsh-unrestricted-0.3.1.tgz" --ignore-scripts
```

## 使い方

1. ネイティブのプラグイン管理画面で `dsh-unrestricted` コンポーネントを有効にします。
2. 設定カードの総合スイッチを有効にし、使用するモジュールを選びます。
3. モードの状態と本文の指紋を確認します。プレビューには取得元が表示され、静的プリセットと実際のオンライン要求は区別されます。

無効なモジュールは以後の本文に含まれません。全モジュールまたは総合スイッチを無効にすると、ネイティブの組み立てに戻ります。既存の記録は保持します。

## 検証範囲

`package.json` の宣言範囲は `>=0.2.0-rc.2 <0.2.2-0` です。開発依存は従来どおりとし、今回のネイティブ隔離検証は実際の macOS Desktop 付属の DSH `0.2.1-rc.3` を対象とします。実施状況は[保守説明](./docs/MAINTENANCE.md#验证记录)に記録します。

`0.2.3-modular.2` には、2026-10-18 の隔離ホスト検証と macOS Desktop の状態表示、4 モードの静的プレビュー、再確認の受け入れ記録があります。これは旧版の履歴であり、0.3.1 の実機受け入れ結果としては扱いません。回答品質、拒否率、課金 token、4 モードすべてのオンライン実行には、それぞれ実際の要求による検証が必要です。

## ライセンスと謝辞

原プロジェクトは [yexi-by](https://github.com/yexi-by/dsh-unrestricted) によるものです。作者の表記と [MIT License](./LICENSE) を保持します。[Jia-Ethan/codex-keysmith](https://github.com/Jia-Ethan/codex-keysmith) を含む既存の出典は [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) に記載しています。
