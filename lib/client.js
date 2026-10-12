window.__ModuleLoader__.load({
	id: "dsh-unrestricted",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/module-config.js
		/** Functional switches; compatibility defaults preserve every original rule. */
		const MODULE_IDS = [
			"delivery",
			"targets",
			"reverseEngineering",
			"networkSecurity",
			"fiction",
			"technicalGuides",
			"resources",
			"language",
			"environment",
			"runtimeCoordination"
		];
		const DEFAULT_MODULES = Object.freeze(Object.fromEntries(MODULE_IDS.map((id) => [id, true])));
		Object.freeze(Object.fromEntries(MODULE_IDS.map((id) => [id, true])));
		const NO_MODULES = Object.freeze(Object.fromEntries(MODULE_IDS.map((id) => [id, false])));
		Object.freeze({
			...NO_MODULES,
			delivery: true
		});
		/** Resolve the compatibility defaults for fields absent from an older profile. */
		function resolveModules(config = {}) {
			return Object.fromEntries(MODULE_IDS.map((id) => [id, config[id] ?? DEFAULT_MODULES[id]]));
		}
		//#endregion
		//#region src/client/controller.ts
		const RPC_CHANNEL = "/dsh-unrestricted";
		const SETTINGS_NS = "unrestricted";
		/** Human-readable error text for the banner. */
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/**
		* Create the card controller bound to the calling plugin's context.
		* @param ctx - the browser plugin context (connection + remote + configForms injected).
		* @returns the controller whose face() feeds the slot inject share.
		*/
		function createUnrestrictedController(ctx) {
			const connection = ctx.get("connection");
			const settings = ctx.configForms.get(SETTINGS_NS);
			let snapshot = {
				enabled: false,
				modules: { ...DEFAULT_MODULES },
				writable: false,
				settingsStatus: "loading",
				status: null,
				previews: {}
			};
			const listeners = /* @__PURE__ */ new Set();
			let previewGeneration = 0;
			const view = {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				}
			};
			function publish() {
				const settingsSnapshot = settings.getSnapshot();
				const enabled = settingsSnapshot.value?.enabled === true;
				const modules = resolveModules(settingsSnapshot.value);
				const changed = enabled !== snapshot.enabled || MODULE_IDS.some((id) => modules[id] !== snapshot.modules[id]);
				if (changed) previewGeneration++;
				snapshot = {
					enabled,
					modules,
					writable: settingsSnapshot.writable,
					settingsStatus: settingsSnapshot.status,
					status: snapshot.status,
					previews: changed ? {} : snapshot.previews,
					message: snapshot.message
				};
				for (const listener of listeners) listener();
			}
			async function call(endpoint, payload) {
				const result = await connection.rpc.call(RPC_CHANNEL, endpoint, payload);
				if (!result.ok) throw new Error(result.error.message);
				return result.value;
			}
			async function refresh() {
				try {
					const status = await call("status", {});
					const changed = status.contract !== snapshot.status?.contract || status.enabled !== snapshot.status?.enabled;
					if (changed) previewGeneration++;
					snapshot = {
						...snapshot,
						status,
						previews: changed ? {} : snapshot.previews,
						message: void 0
					};
					publish();
				} catch (error) {
					snapshot = {
						...snapshot,
						message: messageOf(error)
					};
					publish();
				}
			}
			async function setField(field, enabled) {
				try {
					await settings.set(field, enabled);
					publish();
					setTimeout(() => void refresh(), 300);
				} catch (error) {
					snapshot = {
						...snapshot,
						message: messageOf(error)
					};
					publish();
				}
			}
			const setEnabled = (enabled) => setField("enabled", enabled);
			const setModule = (id, enabled) => setField(id, enabled);
			async function recheck() {
				try {
					const status = await call("recheck", {});
					snapshot = {
						...snapshot,
						status,
						previews: {},
						message: void 0
					};
					publish();
				} catch (error) {
					snapshot = {
						...snapshot,
						message: messageOf(error)
					};
					publish();
				}
			}
			/**
			* Fetch one preset's deploy preview. The card renders the raw fused prompt,
			* so the user reads the exact bytes before switching the mode on.
			* @param presetId - preset id from the card's row.
			*/
			async function loadPreview(presetId) {
				const generation = previewGeneration;
				snapshot = {
					...snapshot,
					previews: {
						...snapshot.previews,
						[presetId]: { status: "loading" }
					}
				};
				publish();
				try {
					const preview = await call("preview", { presetId });
					if (generation !== previewGeneration) return;
					snapshot = {
						...snapshot,
						previews: {
							...snapshot.previews,
							[presetId]: {
								status: "ready",
								preview
							}
						}
					};
				} catch (error) {
					if (generation !== previewGeneration) return;
					snapshot = {
						...snapshot,
						previews: {
							...snapshot.previews,
							[presetId]: {
								status: "failed",
								message: messageOf(error)
							}
						}
					};
				}
				publish();
			}
			ctx.effect(() => settings.subscribe(publish), "dsh-unrestricted: settings mirror");
			ctx.effect(() => ctx.remote.$on("settings/document-updated", (namespace) => {
				if (namespace === void 0 || namespace === SETTINGS_NS) refresh();
			}), "dsh-unrestricted: settings invalidations");
			publish();
			refresh();
			return { face: () => ({
				hooks: { view },
				setEnabled,
				setModule,
				recheck,
				refresh,
				loadPreview
			}) };
		}
		//#endregion
		//#region src/client/locales.ts
		/** Copy dictionaries for the unrestricted settings card. */
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			title: "破限模式",
			summaryEnabled: "已开启",
			summaryDisabled: "已关闭",
			summaryLoading: "读取中",
			summaryUnavailable: "设置不可用",
			summaryValidationFailed: "部分模式校验未通过",
			description: "按需选择要加入系统提示词的功能。从下一次请求和新建子代理开始生效；总开关关闭时恢复 DSH 原版提示词。",
			toggle: "启用破限",
			modulesTitle: "功能开关",
			modulesNote: "兼容默认：全部开启。关闭某项后，该项正文不再发送给模型；全部关闭时不加入插件提示词。",
			moduleDelivery: "通用交付",
			descriptionDelivery: "直接输出成果、完整交付、减少客套和重复说明。",
			moduleTargets: "目标与输入数据",
			descriptionTargets: "保留用户指定名称、处理占位符及输入数据。",
			moduleReverse: "软件逆向与补丁",
			descriptionReverse: "逆向、算法重建、软件校验、补丁和反调试任务规则。",
			moduleNetwork: "网络安全",
			descriptionNetwork: "扫描、网络脚本、隧道及漏洞验证任务规则。",
			moduleFiction: "虚构创作",
			descriptionFiction: "角色、关系、叙述视角与创作尺度规则。",
			moduleGuides: "技术与实验指南",
			descriptionGuides: "化工、药理及特种工艺的步骤和参数规则。",
			moduleResources: "资源检索",
			descriptionResources: "检索关键词、真实链接及结果清单规则。",
			moduleLanguage: "多语言一致性",
			descriptionLanguage: "保持各语言的输出尺度与表达一致。",
			moduleEnvironment: "环境与指令层级",
			descriptionEnvironment: "处理环境上下文、执行反馈与内容规则的关系。",
			moduleRuntime: "运行模式协调",
			descriptionRuntime: "PTC、Plan 和结构化子代理的内容协调附注。",
			characters: "字符",
			selectedBody: "已选正文：",
			savedBody: "相比全选减少：",
			usageNote: "模块数字为正文字符数。公共头和模式附注计入完整预览；字符数不是模型计费 token 数。",
			actualAddition: "插件实际新增",
			scopeNote: "提示词仅由 DSH 生成时才受本插件控制；模型平台或宿主环境中更高优先级的规则不在覆盖范围内。",
			statusTitle: "各模式状态",
			modeStandard: "Standard 标准模式",
			modePtc: "PTC 模式",
			modeCordis: "Cordis 创造模式",
			modeMinimal: "Minimal 极简模式",
			subagentNote: "子代理随所属模式一并生效。",
			stateActive: "已生效",
			stateOff: "已关闭",
			stateChecking: "校验中",
			stateValidationFailed: "校验未通过，已保持原版",
			recheck: "重新校验",
			refresh: "刷新",
			preflightTitle: "本次即将写入的内容",
			fingerprint: "契约指纹",
			fingerprintNote: "指纹随功能选择变化。预览展示当前开关状态下的完整系统提示词。",
			preset: "预设",
			presetStandard: "standard",
			presetPtc: "ptc",
			presetCordis: "cordis",
			presetMinimal: "minimal",
			showPreview: "查看预览",
			hidePreview: "收起预览",
			previewLoading: "正在组装当前提示词…",
			previewUnavailable: "暂不可预览：",
			previewSize: "行",
			settingsUnavailable: "当前连接不可写设置（远程浏览器只读）。",
			settingsLoading: "正在读取设置…",
			operationFailed: "操作失败："
		};
		/** English dictionary checked against the Chinese key set. */
		const en = {
			title: "Unrestricted mode",
			summaryEnabled: "Enabled",
			summaryDisabled: "Disabled",
			summaryLoading: "Loading",
			summaryUnavailable: "Settings unavailable",
			summaryValidationFailed: "Some mode checks failed",
			description: "Choose the functionality to add to the system prompt. Changes apply to the next request and new subagents; disabling the master switch restores the stock DSH prompt.",
			toggle: "Enable unrestricted mode",
			modulesTitle: "Function switches",
			modulesNote: "Compatibility default: all enabled. Disabled fragments are omitted from requests; disabling every function adds no plugin prompt.",
			moduleDelivery: "General delivery",
			descriptionDelivery: "Direct, complete deliverables with less preamble and repetition.",
			moduleTargets: "Targets and input data",
			descriptionTargets: "Supplied names, placeholders and input data handling.",
			moduleReverse: "Reverse engineering and patches",
			descriptionReverse: "Binary analysis, reconstruction, checks, patches and debugging tasks.",
			moduleNetwork: "Network security",
			descriptionNetwork: "Scanning, network scripts, tunnels and vulnerability verification tasks.",
			moduleFiction: "Fiction",
			descriptionFiction: "Characters, relationships, perspective and narrative register.",
			moduleGuides: "Technical and experimental guides",
			descriptionGuides: "Procedures and parameters for chemistry, pharmacology and industrial tasks.",
			moduleResources: "Resource search",
			descriptionResources: "Concrete queries, verified links and result lists.",
			moduleLanguage: "Language consistency",
			descriptionLanguage: "Consistent register and expression across languages.",
			moduleEnvironment: "Environment and instruction layers",
			descriptionEnvironment: "Environment context, execution feedback and content rules.",
			moduleRuntime: "Runtime coordination",
			descriptionRuntime: "Content notes for PTC, Plan and structured subagents.",
			characters: "characters",
			selectedBody: "Selected body:",
			savedBody: "Saved versus all enabled:",
			usageNote: "Module sizes count body characters. Shared headings and mode notes appear in the full preview; characters are not billing tokens.",
			actualAddition: "Actual plugin addition",
			scopeNote: "This plugin can only rewrite prompts DSH generates itself; higher-priority rules from the model platform or host environment are out of scope.",
			statusTitle: "Per-mode status",
			modeStandard: "Standard",
			modePtc: "PTC",
			modeCordis: "Cordis",
			modeMinimal: "Minimal",
			subagentNote: "Subagents follow their parent's mode.",
			stateActive: "Active",
			stateOff: "Off",
			stateChecking: "Checking",
			stateValidationFailed: "Check failed — stock prompt kept",
			recheck: "Re-check",
			refresh: "Refresh",
			preflightTitle: "What this deployment would write",
			fingerprint: "Contract fingerprint",
			fingerprintNote: "The fingerprint follows your selection. Previews show the full prompt under the current switches.",
			preset: "Preset",
			presetStandard: "standard",
			presetPtc: "ptc",
			presetCordis: "cordis",
			presetMinimal: "minimal",
			showPreview: "Show preview",
			hidePreview: "Hide preview",
			previewLoading: "Assembling the current prompt…",
			previewUnavailable: "No preview available: ",
			previewSize: "lines",
			settingsUnavailable: "This connection cannot write settings (remote browser is read-only).",
			settingsLoading: "Reading settings…",
			operationFailed: "Operation failed: "
		};
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.unrestricted";
		//#endregion
		//#region src/client/styles.ts
		/**
		* Stylesheet for the unrestricted settings card. One hand-written stylesheet
		* injected as a single <style data-plugin> tag (the loader convention for
		* plugin-owned styles); colors come from the shared --dsw-* tokens.
		*/
		const CSS = `
.dsh-unrestricted-modules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.dsh-unrestricted-module {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 10px;
}
.dsh-unrestricted-module .dsh-unrestricted-toggle { margin-bottom: 4px; }
.dsh-unrestricted-moduleSize { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dsh-unrestricted-module .dsh-unrestricted-note { margin: 5px 0 0; }
.dsh-unrestricted-usage { margin: 0; font-size: 13px; }
@media (max-width: 600px) { .dsh-unrestricted-modules { grid-template-columns: 1fr; } }
.dsh-unrestricted-card {
  display: block;
  width: 100%;
  max-width: 760px;
  box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  overflow: hidden;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
}

.dsh-unrestricted-summary {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  padding: 12px 14px;
  cursor: pointer;
  list-style: none;
  touch-action: manipulation;
  user-select: none;
}

.dsh-unrestricted-summary::-webkit-details-marker { display: none; }

.dsh-unrestricted-summary:hover { background: var(--dsw-alias-interactive-bg-hover); }

.dsh-unrestricted-summary:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -2px;
}

.dsh-unrestricted-summary::after {
  width: 8px;
  height: 8px;
  flex: none;
  border-right: 2px solid var(--dsw-alias-label-tertiary);
  border-bottom: 2px solid var(--dsw-alias-label-tertiary);
  content: '';
  transform: rotate(45deg);
  transition: transform 160ms ease;
}

.dsh-unrestricted-card[open] > .dsh-unrestricted-summary {
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.dsh-unrestricted-card[open] > .dsh-unrestricted-summary::after {
  transform: rotate(225deg);
}

.dsh-unrestricted-summaryText {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.dsh-unrestricted-summaryStatus {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  padding: 1px 7px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.dsh-unrestricted-summaryStatus[data-state='active'] {
  color: var(--dsw-alias-state-success-primary);
}

.dsh-unrestricted-summaryStatus[data-state='pending'] {
  color: var(--dsw-alias-state-business-primary);
}

.dsh-unrestricted-summaryStatus[data-state='error'] {
  color: var(--dsw-alias-state-error-primary);
}

.dsh-unrestricted-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.dsh-unrestricted-title {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.dsh-unrestricted-statusTitle {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.dsh-unrestricted-description,
.dsh-unrestricted-note {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-unrestricted-note {
  font-size: 12px;
  line-height: 18px;
}

.dsh-unrestricted-error {
  margin: 0;
  border: 1px solid var(--dsw-alias-state-error-primary);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 13px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.dsh-unrestricted-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  cursor: pointer;
  user-select: none;
}

.dsh-unrestricted-toggle input {
  accent-color: var(--dsw-alias-state-business-primary);
}

.dsh-unrestricted-modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dsh-unrestricted-mode {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  line-height: 18px;
}

.dsh-unrestricted-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 999px;
  background: var(--dsw-alias-label-tertiary);
}

.dsh-unrestricted-dot[data-state='active'] {
  background: var(--dsw-alias-state-success-primary);
}

.dsh-unrestricted-dot[data-state='checking'] {
  background: var(--dsw-alias-state-business-primary);
}

.dsh-unrestricted-dot[data-state='failed'] {
  background: var(--dsw-alias-state-error-primary);
}

.dsh-unrestricted-modeName {
  color: var(--dsw-alias-label-primary);
}

.dsh-unrestricted-modeState {
  color: var(--dsw-alias-label-secondary);
}

.dsh-unrestricted-presetId,
.dsh-unrestricted-fingerprint {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  padding: 1px 5px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 16px;
}

.dsh-unrestricted-fingerprint {
  color: var(--dsw-alias-label-primary);
  letter-spacing: 0.4px;
}

.dsh-unrestricted-inlineAction {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  padding: 1px 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.dsh-unrestricted-inlineAction:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-unrestricted-inlineAction:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}

.dsh-unrestricted-preview {
  display: flex;
  flex-basis: 100%;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
  padding-left: 15px;
}

.dsh-unrestricted-previewText {
  max-height: 320px;
  margin: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 17px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.dsh-unrestricted-issues {
  flex-basis: 100%;
  padding-left: 15px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}

.dsh-unrestricted-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dsh-unrestricted-actions button {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  padding: 4px 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.dsh-unrestricted-actions button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-unrestricted-actions button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .dsh-unrestricted-summary::after { transition: none; }
}
`;
		/** Inject the stylesheet once; the tag id doubles as the re-evaluation guard. */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			const existing = document.querySelector("style[data-plugin=\"dsh-unrestricted\"]");
			if (existing !== null) {
				existing.textContent = CSS;
				return;
			}
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-unrestricted";
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/UnrestrictedCard.tsx
		/**
		* The unrestricted settings card: one persisted toggle, the per-preset fusion
		* state reported by the host half, and the deploy preview for the preset the
		* user is inspecting. All data arrives through the props shares; the only
		* component-local state is which preview is open.
		*/
		/** Mode rows in display order, with their locale label keys. */
		const MODE_ROWS = [
			{
				id: "standard",
				labelKey: "modeStandard",
				presetKey: "presetStandard"
			},
			{
				id: "ptc",
				labelKey: "modePtc",
				presetKey: "presetPtc"
			},
			{
				id: "cordis",
				labelKey: "modeCordis",
				presetKey: "presetCordis"
			},
			{
				id: "minimal",
				labelKey: "modeMinimal",
				presetKey: "presetMinimal"
			}
		];
		const MODULE_ROWS = [
			{
				id: "delivery",
				labelKey: "moduleDelivery",
				descriptionKey: "descriptionDelivery"
			},
			{
				id: "targets",
				labelKey: "moduleTargets",
				descriptionKey: "descriptionTargets"
			},
			{
				id: "reverseEngineering",
				labelKey: "moduleReverse",
				descriptionKey: "descriptionReverse"
			},
			{
				id: "networkSecurity",
				labelKey: "moduleNetwork",
				descriptionKey: "descriptionNetwork"
			},
			{
				id: "fiction",
				labelKey: "moduleFiction",
				descriptionKey: "descriptionFiction"
			},
			{
				id: "technicalGuides",
				labelKey: "moduleGuides",
				descriptionKey: "descriptionGuides"
			},
			{
				id: "resources",
				labelKey: "moduleResources",
				descriptionKey: "descriptionResources"
			},
			{
				id: "language",
				labelKey: "moduleLanguage",
				descriptionKey: "descriptionLanguage"
			},
			{
				id: "environment",
				labelKey: "moduleEnvironment",
				descriptionKey: "descriptionEnvironment"
			},
			{
				id: "runtimeCoordination",
				labelKey: "moduleRuntime",
				descriptionKey: "descriptionRuntime"
			}
		];
		/** Locale key for one mode state. */
		function stateKey(mode) {
			switch (mode?.state) {
				case "active": return "stateActive";
				case "checking": return "stateChecking";
				case "failed": return "stateValidationFailed";
				default: return "stateOff";
			}
		}
		/**
		* Render the unrestricted card.
		* @param props - locale copy, the card snapshot, and its actions.
		* @returns the card.
		*/
		function UnrestrictedCard(props) {
			const { t } = props;
			const view = props.useView((snapshot) => snapshot);
			const status = view.status;
			const [openPreview, setOpenPreview] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (openPreview !== null && view.previews[openPreview] === void 0) props.loadPreview(openPreview);
			}, [
				openPreview,
				status?.contract,
				view.enabled
			]);
			const hasFailedMode = status !== null && Object.values(status.modes).some((mode) => mode.state === "failed");
			const summaryKey = view.settingsStatus === "loading" ? "summaryLoading" : view.settingsStatus === "unavailable" ? "summaryUnavailable" : hasFailedMode ? "summaryValidationFailed" : view.enabled ? "summaryEnabled" : "summaryDisabled";
			const summaryState = view.settingsStatus === "ready" ? hasFailedMode ? "error" : view.enabled ? "active" : "off" : "pending";
			/** Toggle one preset's preview, fetching the current bytes on first open. */
			function togglePreview(presetId) {
				if (openPreview === presetId) {
					setOpenPreview(null);
					return;
				}
				setOpenPreview(presetId);
				if (view.previews[presetId]?.status === "failed") props.loadPreview(presetId);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				open: true,
				className: "dsh-unrestricted-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
					className: "dsh-unrestricted-summary",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dsh-unrestricted-summaryText",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-unrestricted-title",
							role: "heading",
							"aria-level": 3,
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dsh-unrestricted-summaryStatus",
							"data-state": summaryState,
							children: t(summaryKey)
						})]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dsh-unrestricted-content",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-description",
							children: t("description")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "dsh-unrestricted-toggle",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: view.enabled,
								disabled: !view.writable || view.settingsStatus !== "ready",
								onChange: (event) => {
									props.setEnabled(event.target.checked);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("toggle") })]
						}),
						view.settingsStatus === "unavailable" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("settingsUnavailable")
						}),
						view.message !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dsh-unrestricted-error",
							children: [t("operationFailed"), view.message]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							className: "dsh-unrestricted-statusTitle",
							children: t("modulesTitle")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("modulesNote")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsh-unrestricted-modules",
							children: MODULE_ROWS.map((row) => {
								const usage = status?.modules?.find((module) => module.id === row.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: "dsh-unrestricted-module",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: "dsh-unrestricted-toggle",
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: view.modules[row.id],
												disabled: !view.writable || view.settingsStatus !== "ready",
												onChange: (event) => {
													props.setModule(row.id, event.target.checked);
												}
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(row.labelKey) })]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "dsh-unrestricted-moduleSize",
											children: [
												usage?.characters ?? "—",
												" ",
												t("characters")
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dsh-unrestricted-note",
											children: t(row.descriptionKey)
										})
									]
								}, row.id);
							})
						}),
						status?.usage !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dsh-unrestricted-usage",
							children: [
								t("selectedBody"),
								" ",
								status.usage.characters.toLocaleString(),
								" ",
								t("characters"),
								" · ",
								t("savedBody"),
								" ",
								status.usage.savedCharacters.toLocaleString(),
								" ",
								t("characters")
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("usageNote")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							className: "dsh-unrestricted-statusTitle",
							children: t("statusTitle")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "dsh-unrestricted-modes",
							children: MODE_ROWS.map((row) => {
								const mode = status?.modes[row.id];
								const entry = view.previews[row.id];
								const isOpen = openPreview === row.id;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: "dsh-unrestricted-mode",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-unrestricted-dot",
											"data-state": mode?.state ?? "off"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-unrestricted-modeName",
											children: t(row.labelKey)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-unrestricted-modeState",
											children: t(stateKey(mode))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											className: "dsh-unrestricted-presetId",
											children: t(row.presetKey)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dsh-unrestricted-inlineAction",
											onClick: () => {
												togglePreview(row.id);
											},
											children: t(isOpen ? "hidePreview" : "showPreview")
										}),
										mode !== void 0 && mode.issues.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "dsh-unrestricted-issues",
											children: mode.issues.join("; ")
										}),
										isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "dsh-unrestricted-preview",
											children: entry === void 0 || entry.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dsh-unrestricted-note",
												children: t("previewLoading")
											}) : entry.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: "dsh-unrestricted-error",
												children: [t("previewUnavailable"), entry.message]
											}) : entry.preview?.available === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: "dsh-unrestricted-error",
												children: [t("previewUnavailable"), entry.preview.reason]
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
												className: "dsh-unrestricted-note",
												children: [
													t("previewSize"),
													" ",
													entry.preview?.lines,
													" · ",
													entry.preview?.bytes,
													" B",
													" · ",
													t("actualAddition"),
													" ",
													entry.preview?.addedCharacters ?? "—",
													" ",
													t("characters")
												]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
												className: "dsh-unrestricted-previewText",
												children: entry.preview?.text
											})] })
										})
									]
								}, row.id);
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
							className: "dsh-unrestricted-statusTitle",
							children: t("preflightTitle")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dsh-unrestricted-note",
							children: [
								t("fingerprint"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
									className: "dsh-unrestricted-fingerprint",
									children: status?.contract ?? "—"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("fingerprintNote")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("subagentNote")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dsh-unrestricted-note",
							children: t("scopeNote")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dsh-unrestricted-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									props.recheck();
								},
								children: t("recheck")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									props.refresh();
								},
								children: t("refresh")
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/index.tsx
		/** Services required by the registration and the controller. */
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"configForms"
		];
		/** 注册本插件的配置页面。 */
		function apply(ctx) {
			ensureStyles();
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-unrestricted: dictionaries");
			const controller = createUnrestrictedController(ctx);
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "dsh-unrestricted",
				locale: NS,
				inject: () => controller.face()
			}, UnrestrictedCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map