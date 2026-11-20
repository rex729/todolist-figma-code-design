#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CODE_OUT="$SCRIPT_DIR/plugin/code.js"
UI_OUT="$SCRIPT_DIR/plugin/ui.html"

PYTHON_BIN="/usr/bin/python3"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3)"
fi

build_once() {
"$PYTHON_BIN" - "$SCRIPT_DIR" "$CODE_OUT" "$UI_OUT" <<'PY'
import html
import json
import re
import sys
from datetime import datetime
from pathlib import Path

script_dir = Path(sys.argv[1])
code_out = Path(sys.argv[2])
ui_out = Path(sys.argv[3])
code_out.parent.mkdir(parents=True, exist_ok=True)
build_time = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")


def extract_body(file_path: Path) -> str:
    raw = file_path.read_text(encoding="utf-8")
    body, count_start = re.subn(
        r"^[\s\S]*?\(async\s*\(\)\s*=>\s*\{",
        "",
        raw,
        count=1,
    )
    if count_start != 1:
        raise RuntimeError(f"{file_path.name}: 找不到頂層 (async () => {{")
    body, count_end = re.subn(r"\}\)\(\);\s*$", "", body, count=1)
    if count_end != 1:
        raise RuntimeError(f"{file_path.name}: 找不到結尾 }})();")
    return body.strip()


def format_screen_title(stem: str) -> str:
    # 例如 "login" -> "Login", "main_home" -> "Main Home"
    cleaned = re.sub(r"^\d+[_-]?", "", stem)
    return " ".join(part.capitalize() for part in re.split(r"[_-]+", cleaned) if part) or stem


fn_foundations = extract_body(script_dir / "foundations.js")
fn_components = extract_body(script_dir / "components.js")
helpers_code = (script_dir / "helpers" / "figma_helpers.js").read_text(encoding="utf-8").strip()

screens_dir = script_dir / "screens"
screen_files = sorted(screens_dir.glob("*.js")) if screens_dir.exists() else []

screen_entries = []
screen_fn_defs = []
for sf in screen_files:
    stem = sf.stem
    safe_id = re.sub(r"[^a-zA-Z0-9_]", "_", stem)
    fn_name = f"runScreen_{safe_id}"
    target_key = f"screen:{stem}"
    display_name = format_screen_title(stem)
    body = extract_body(sf)
    screen_fn_defs.append(f"async function {fn_name}() {{\n{body}\n}}")
    screen_entries.append({
        "target": target_key,
        "fn_name": fn_name,
        "display_name": display_name,
        "file_name": f"screens/{sf.name}",
    })

screen_dispatch_lines = []
for entry in screen_entries:
    screen_dispatch_lines.append(
        f"    if (msg.target === {json.dumps(entry['target'])} || msg.target === 'all') {{\n"
        f"      await {entry['fn_name']}();\n"
        f"      figma.ui.postMessage({{ type: 'log', message: '✅ [Screen] {entry['display_name']} built successfully' }});\n"
        f"    }}"
    )

ui_height = min(560, 380 + len(screen_entries) * 44)

code = f"""// ⚠️ 此檔案由 build_plugin.sh 自動從 foundations.js / components.js / helpers/* / screens/*.js 生成，請勿手動修改！
const PLUGIN_BUILD_TIME = {json.dumps(build_time)};

{helpers_code}

async function runFoundations() {{
{fn_foundations}
}}

async function runComponents() {{
{fn_components}
}}

{chr(10).join(screen_fn_defs)}

figma.showUI(__html__, {{ width: 340, height: {ui_height}, themeColors: true }});

figma.ui.onmessage = async (msg) => {{
  if (!msg || msg.type !== 'run') return;
  const start = Date.now();
  figma.ui.postMessage({{ type: 'log', message: '🕒 code.js built at: ' + PLUGIN_BUILD_TIME }});
  try {{
    if (msg.target === 'foundations' || msg.target === 'all') {{
      await runFoundations();
      figma.ui.postMessage({{ type: 'log', message: '✅ Foundations built successfully' }});
    }}
    if (msg.target === 'components' || msg.target === 'all') {{
      await runComponents();
      figma.ui.postMessage({{ type: 'log', message: '✅ Components built successfully' }});
    }}
{chr(10).join(screen_dispatch_lines)}
    const elapsedMs = Date.now() - start;
    figma.notify('🎉 TodoList FigmaDesigner finished (' + elapsedMs + 'ms)');
    figma.ui.postMessage({{ type: 'done', elapsedMs }});
  }} catch (err) {{
    const errMsg = (err && err.message) ? err.message : String(err);
    console.error('❌ Plugin execution error:', err);
    figma.notify('❌ Error: ' + errMsg, {{ error: true }});
    figma.ui.postMessage({{ type: 'error', message: errMsg }});
  }}
}};
"""

screen_buttons_html = "\n".join(
    f'  <button class="btn btn-secondary" data-action="{html.escape(e["target"])}">\n'
    f'    <span>Screen: {html.escape(e["display_name"])}</span>\n'
    f'    <span class="tag">{html.escape(e["file_name"])}</span>\n'
    f'  </button>'
    for e in screen_entries
)

ui_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "PingFang TC", sans-serif;
      background: #0B0F17;
      color: #F9FAFB;
      padding: 16px;
      font-size: 13px;
      line-height: 1.45;
    }}
    .header {{ margin-bottom: 14px; }}
    .title {{ font-size: 15px; font-weight: 700; color: #F9FAFB; }}
    .subtitle {{ font-size: 11px; color: #9CA3AF; margin-top: 2px; }}
    .btn {{
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: opacity 0.15s ease, transform 0.05s ease;
    }}
    .btn:active {{ transform: scale(0.99); }}
    .btn:disabled {{ opacity: 0.5; cursor: not-allowed; }}
    .btn-primary {{
      background: #0066FF;
      color: #FFFFFF;
      margin-bottom: 12px;
      padding: 12px 14px;
    }}
    .btn-primary:hover:not(:disabled) {{ background: #1D75FF; }}
    .btn-secondary {{
      background: #151C28;
      color: #E5E7EB;
      border: 1px solid #2E3A4E;
      margin-bottom: 8px;
      text-align: left;
    }}
    .btn-secondary:hover:not(:disabled) {{
      background: #1E2736;
      border-color: #3385FF;
    }}
    .tag {{ font-size: 11px; font-weight: 500; color: #9CA3AF; }}
    .btn-primary .tag {{ color: #DBEAFE; }}
    .section-label {{
      font-size: 11px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 10px 0 6px;
    }}
    .log-box {{
      margin-top: 10px;
      background: #151C28;
      border: 1px solid #2E3A4E;
      border-radius: 8px;
      padding: 10px;
      min-height: 88px;
      max-height: 120px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #9CA3AF;
      white-space: pre-wrap;
      word-break: break-word;
    }}
    .log-ok {{ color: #34D399; }}
    .log-err {{ color: #F87171; }}
    .log-info {{ color: #60A5FA; }}
  </style>
</head>
<body>
  <div class="header">
    <div class="title">TodoList FigmaDesigner</div>
    <div class="subtitle">Design-as-Code Full Rebuild &amp; Single-Screen Redraw</div>
  </div>

  <button class="btn btn-primary" data-action="all">
    <span>🚀 Rebuild All</span>
    <span class="tag">Foundations ➔ Components ➔ Screens</span>
  </button>

  <div class="section-label">Foundations &amp; Shared Components</div>

  <button class="btn btn-secondary" data-action="foundations">
    <span>Foundations</span>
    <span class="tag">foundations.js</span>
  </button>

  <button class="btn btn-secondary" data-action="components">
    <span>Components</span>
    <span class="tag">components.js</span>
  </button>

  <div class="section-label">Single Screen Rebuild (screens/*.js)</div>

{screen_buttons_html}

  <div id="log" class="log-box">
    <div>Ready. Choose &quot;Rebuild All&quot; or redraw an individual screen.</div>
    <div class="log-info">🕒 code.js built at: {html.escape(build_time)}</div>
  </div>

  <script>
    const buttons = Array.from(document.querySelectorAll('button[data-action]'));
    const logEl = document.getElementById('log');

    function setBusy(busy) {{
      buttons.forEach(b => {{ b.disabled = busy; }});
    }}

    function appendLog(text, cls) {{
      const line = document.createElement('div');
      if (cls) line.className = cls;
      line.textContent = text;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }}

    buttons.forEach(btn => {{
      btn.addEventListener('click', () => {{
        const action = btn.dataset.action;
        logEl.innerHTML = '';
        appendLog('⏳ Running [' + action + ']...', 'log-info');
        setBusy(true);
        parent.postMessage({{ pluginMessage: {{ type: 'run', target: action }} }}, '*');
      }});
    }});

    window.onmessage = (event) => {{
      const msg = event.data && event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === 'log') {{
        appendLog(msg.message, 'log-ok');
      }} else if (msg.type === 'done') {{
        appendLog('🎉 Done! (' + msg.elapsedMs + ' ms)', 'log-ok');
        setBusy(false);
      }} else if (msg.type === 'error') {{
        appendLog('❌ Error: ' + msg.message, 'log-err');
        setBusy(false);
      }}
    }};
  </script>
</body>
</html>
"""

code_out.write_text(code, encoding="utf-8")
ui_out.write_text(ui_html, encoding="utf-8")
print(f"✅ 已生成 {code_out.name} ({len(code.splitlines())} 行) 與 {ui_out.name}（收錄 {len(screen_entries)} 個畫面，更新時間 {build_time}）")
PY
}

if [[ "${1:-}" == "--watch" ]]; then
  build_once
  echo "👀 Watch 模式已啟動：監聽 FigmaDesigner/*.js 變更中 (按 Ctrl+C 停止)..."
  LAST_SIG=""
  while true; do
    SIG="$("$PYTHON_BIN" - "$SCRIPT_DIR" <<'PY'
import sys
from pathlib import Path
root = Path(sys.argv[1])
targets = [root / "foundations.js", root / "components.js", root / "helpers" / "figma_helpers.js"]
targets.extend(sorted((root / "screens").glob("*.js")))
print("|".join(f"{p.name}:{p.stat().st_mtime_ns}" for p in targets if p.exists()))
PY
)"
    if [[ -n "$LAST_SIG" && "$SIG" != "$LAST_SIG" ]]; then
      echo "🔄 偵測到設計腳本變更，重新打包 Plugin..."
      build_once
    fi
    LAST_SIG="$SIG"
    sleep 1
  done
else
  build_once
fi
