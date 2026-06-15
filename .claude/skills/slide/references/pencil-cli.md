# Pencil CLI 호출 가이드 (slide-pencil 단일 진실 원천)

slide-pencil은 **Pencil CLI** (`@pencil.dev/cli`)를 사용해 `.pen` 파일을 만들고 편집한다. VS Code 확장 / Pencil MCP transport에 의존하지 않으므로 어떤 셸·에이전트 호스트(Claude Code 터미널/데스크탑, Codex, OpenClaw 등)에서도 동작한다.

## 설치 (1회)

```bash
npm install -g @pencil.dev/cli
pencil login                          # 이메일+비밀번호 또는 OTP, 인터랙티브
pencil status                         # "● Active" 떠야 진행 가능
```

토큰은 `~/.pencil/`에 저장되며 이후 세션에서 자동 재사용. 비인터랙티브 환경에선 `PENCIL_CLI_KEY` env var 대체 가능.

## Preflight (매 `/slide` 실행 시작)

```bash
pencil status
```

- `● Active` → 진행
- `Not authenticated` → 사용자에게 `pencil login` 실행 안내 후 파이프라인 중단

`pencil --version`이나 `which pencil`만으로 ready 판정 금지 — 인증이 끊겨 있을 수 있다.

## 호출 패턴 — interactive shell heredoc

Pencil CLI의 `interactive` 서브커맨드가 MCP가 제공하던 모든 도구 (`get_editor_state`, `batch_design`, `batch_get`, `get_variables`, `set_variables`, `get_guidelines`, `find_empty_space_on_canvas`, `export_nodes`, `get_screenshot`, `snapshot_layout`, …)를 그대로 노출한다. 다만 통신 방식이 stdin REPL.

**기본 골격 (반드시 이 형태로 호출):**

```bash
( cat <<'PENCIL'
get_editor_state({ include_schema: false })
batch_get({ readDepth: 2 })
batch_design({ input: '...' })
save()
PENCIL
sleep 1
echo "exit()" ) | pencil interactive --in <file.pen> --out <file.pen>
```

**왜 `sleep 1`이 필요한가** ⚠️ (HARD RULE):

`save()`가 **비동기**다. heredoc 마지막에 `save()`를 두고 바로 `exit()`을 보내면 transport가 save 완료 전에 종료돼 **0바이트 파일**이 생긴다. `save()`와 `exit()` 사이에 셸 레벨에서 최소 1초 대기를 두어야 한다. 검증: `( cat <<'PENCIL'\n...\nsave()\nPENCIL\n sleep 1\n echo "exit()" ) | pencil interactive ...` 형태.

## 모드별 호출

### A. 새 .pen 파일 생성

```bash
( cat <<'PENCIL'
batch_design({ input: 'hero=I(document,{type:"frame",name:"Slide01-Hero",x:0,y:0,width:1280,height:720,fill:"#FAFAF9",layout:"none"})' })
save()
PENCIL
sleep 1; echo "exit()" ) | pencil interactive --out output/<slug>/pencil-new.pen
```

`--in` 없으면 빈 캔버스로 시작. `--out`은 헤드리스 모드 필수.

### B. 기존 .pen 파일 편집

```bash
( cat <<'PENCIL'
get_editor_state({ include_schema: false })
batch_get({ readDepth: 3 })
batch_design({ input: '...' })
save()
PENCIL
sleep 1; echo "exit()" ) | pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen
```

`--in`과 `--out`을 같은 경로로 설정해서 in-place 편집.

### C. Pencil 자체 AI 디자이너 (one-shot 모드)

slide-pencil 파이프라인은 fine-grained 도구 호출 위주라 거의 안 쓰지만, 시각 레퍼런스용 프로토타입이 필요할 때만 유용:

```bash
pencil --out /tmp/sketch.pen --prompt "AI 도구 도입 발표 3장" --export /tmp/sketch.png --export-scale 2
```

## 도구 매핑 (MCP → CLI interactive)

| 구 MCP 호출 | CLI interactive 호출 |
|---|---|
| `mcp__pencil__open_document(filePath)` | `--in <filePath>` 인자 |
| `mcp__pencil__open_document('new')` | `--in` 없이 `--out <newFile>` |
| `mcp__pencil__get_editor_state({ include_schema })` | `get_editor_state({ include_schema })` |
| `mcp__pencil__batch_get(...)` | `batch_get(...)` |
| `mcp__pencil__batch_design({ input })` | `batch_design({ input })` |
| `mcp__pencil__get_variables()` | `get_variables()` |
| `mcp__pencil__set_variables({ variables })` | `set_variables({ variables })` |
| `mcp__pencil__get_guidelines(...)` | `get_guidelines(...)` |
| `mcp__pencil__find_empty_space_on_canvas(...)` | `find_empty_space_on_canvas(...)` |
| `mcp__pencil__get_screenshot({ nodeId })` | `get_screenshot({ nodeId })` — base64 JSON 반환 |
| `mcp__pencil__export_nodes({ nodeIds, outputDir, ... })` | `export_nodes({ nodeIds, outputDir, ... })` |
| `mcp__pencil__snapshot_layout(...)` | `snapshot_layout(...)` |

**`filePath` 인자가 사라진다** — CLI가 `--in`/`--out`로 이미 알고 있어서 도구 호출에 안 넣어도 된다.

## 시각 검증 (Step 3 평가용)

CLI `get_screenshot`은 base64 PNG를 JSON으로 반환하므로 Claude의 Read tool로 바로 못 본다. **`export_nodes`로 PNG를 디스크에 떨군 뒤 Read tool로 읽는다**:

```bash
( cat <<'PENCIL'
export_nodes({ nodeIds: ["<slideFrameId>"], outputDir: "output/<slug>/_eval", format: "png", scale: 2 })
PENCIL
sleep 1; echo "exit()" ) | pencil interactive --in output/<slug>/pencil-new.pen --out output/<slug>/pencil-new.pen
```

→ `output/<slug>/_eval/<nodeId>.png`로 생성. Claude는 `Read("output/<slug>/_eval/<nodeId>.png")`로 시각 검증.

## Binding 주의

`batch_design` 안에서 `slide=I(...)`처럼 정의한 binding은 **같은 batch_design 호출 내에서만 유효**. 다음 호출(save 또는 다른 batch_design)에선 사라진다. 다음 호출에서 노드를 다시 가리키려면 `get_editor_state` 결과의 실제 node ID(예: `Bw9r7`)를 사용한다.

## 한 줄(single-line) 도구 호출 규칙 ⚠️ (HARD RULE)

REPL이 stdin을 **줄 단위로 파싱**한다. 도구 호출 한 건은 **한 줄에 끝내야** 한다. 멀티라인 JSON으로 인자를 쪼개 보내면 첫 줄부터 `[ERROR] Invalid syntax. Expected: tool_name({ key: value })`이 반복되고 호출이 무시되지만 — 에러 출력만 시끄럽고 `save()`는 성공한 것처럼 보일 수 있어 0바이트가 아닌 **잘못된 .pen**을 만든다 (예: `set_variables`가 실패하면 `fill:"$accent"` 참조가 다 빈 값으로 풀려 전부 검정/투명으로 렌더).

```bash
# ❌ 멀티라인 — REPL이 부분 파싱 후 실패
set_variables({ variables: {
  "bg": {"type":"color","value":"#FFFFFF"},
  "text": {"type":"color","value":"#000000"}
} })

# ✅ 단일라인 — 정상
set_variables({ variables: { "bg": {"type":"color","value":"#FFFFFF"}, "text": {"type":"color","value":"#000000"} } })
```

`batch_design`의 `input` 문자열 안에서는 `\n`으로 연산을 구분하는 게 OK (이건 도구 호출 자체가 아니라 JS-syntax payload). 즉:
- **도구 호출 (`tool_name({...})`) → 한 줄**
- **`batch_design({ input: '...' })`의 `input` 문자열 안에는 `\n` 사용 가능**

## 자주 만나는 실패 모드

| 증상 | 원인 / 해결 |
|---|---|
| `[ERROR] Authentication required` | `pencil login` 또는 `PENCIL_CLI_KEY` 미설정 |
| `[ERROR] --out (-o) is required in headless mode` | 헤드리스(`--app` 없이) 호출 시 `--out` 누락 |
| 저장된 .pen 파일이 0바이트 | `save()`와 `exit()` 사이 sleep 1 누락 |
| `[ERROR] Failed to find a node with id "foo"` | binding 이름을 다른 호출에서 사용. `get_editor_state`로 real ID 재조회 후 호출 |
| `Font family 'Xxx' is invalid` | Pencil 내부 폰트 카탈로그에 없음. `fontFamily` 생략하거나 Pencil이 인식하는 값 사용 |
| `Invalid properties: /textGrowth expected one of "auto", "fixed-width", "fixed-width-height"` | enum 값 실수. 메시지가 가르쳐주는 enum만 사용 |
| `Invalid properties: /strokeWidth unexpected property` | `stroke`는 객체. `stroke:{thickness:N,fill:"$color"}` 사용 (`strokeWidth` / `stroke:"$color"` 형태는 invalid) |
| `[ERROR] Invalid syntax. Expected: tool_name({ key: value })` 반복 | 도구 호출을 멀티라인으로 보냄. 단일 라인으로 재호출 — "한 줄 도구 호출 규칙" 참조 |
| 모든 색이 검정/투명으로 렌더 | `set_variables`가 멀티라인 파싱 실패로 토큰 미등록. 단일 라인으로 재호출 후 새로 .pen 생성 |
| Batch 전체 롤백 | 한 연산이라도 실패하면 batch_design은 전부 rollback. 메시지에서 실패 연산 식별 후 재시도 |

## 복구 runbook (장애 시 순서대로)

1. `pencil status` 실행 — `● Active` 떠야 ready ("Preflight" 참조).
2. `Not authenticated` 또는 인증 만료면 `pencil login`(인터랙티브) 또는 `PENCIL_CLI_KEY` env var 설정 ("설치" 참조).
3. `command not found: pencil`면 `npm install -g @pencil.dev/cli`로 재설치.
4. `pencil interactive --out /tmp/probe.pen <<< 'get_editor_state({ include_schema: false })'` 1줄 probe로 transport 확인.
5. 저장된 .pen이 0바이트면 heredoc의 `save()` ~ `exit()` 사이에 `sleep 1`이 들어갔는지 확인 ("왜 sleep 1이 필요한가" 참조).
6. 그래도 실패하면 `npm view @pencil.dev/cli version`과 `pencil version`을 비교해 CLI 업그레이드.

## 한 줄 진단 (`/slide` 시작 시 health-check 통합)

```bash
pencil status 2>&1 | grep -q "● Active" && echo "PENCIL_READY" || echo "PENCIL_BLOCKED"
```

`PENCIL_BLOCKED`이면 Step 2를 진행하지 말고 사용자에게 알린다 (`pencil login` 요청 또는 `PENCIL_CLI_KEY` 설정).
