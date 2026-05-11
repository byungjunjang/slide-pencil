---
name: upload-drive
description: >
  PPTX 슬라이드를 Google Drive에 업로드하고 Google Slides로 변환.
  Trigger: "/upload-drive", "드라이브에 올려", "구글 드라이브 업로드",
  "구글 슬라이드로 변환", "Google Drive에 올려"
user_invocable: true
---

# /upload-drive — Google Drive 업로드 + Google Slides 변환

PPTX 파일을 Google Drive에 업로드하고, Google Slides로 자동 변환한다.
PPTX가 없으면 `/export-pptx`를 먼저 실행한다.

## 사용법

```
/upload-drive
/upload-drive "output/팀 빌딩/팀 빌딩.pptx"
/upload-drive --folder "발표자료/2026-Q1"
```

## 사전 조건

- Google Workspace 인증이 설정되어 있을 것 (`gws-drive-upload` 스킬 사용 가능)
- `pptxgenjs` 패키지가 설치되어 있을 것 (PPTX 생성용)

## 워크플로우

### Step 1: PPTX 파일 확인

1. 경로가 지정된 경우 해당 파일 사용
2. 미지정 시 `output/` 하위에서 가장 최근 `.pptx` 파일 탐색
3. PPTX 파일이 없으면 `/export-pptx` 스킬을 실행하여 생성:
   - `src/slides/Slide*.tsx` 분석 → 매니페스트 생성 → PPTX 변환
   - 결과: `output/{제목}/{제목}.pptx`

### Step 2: Google Drive 업로드 + Google Slides 변환 (필수) ⚠️

**항상 Google Slides로 변환하여 업로드한다.** PPTX 그대로 올리는 것은 허용하지 않는다.

`gws` CLI는 업로드 시 직접 변환을 지원하지 않으므로 **2단계 방식**을 사용한다:

#### 2-1. PPTX 업로드 (임시)

```bash
UPLOAD=$(gws drive files create \
  --json '{"name": "{파일명}.pptx"}' \
  --params '{"fields": "id,name"}' \
  --upload "{pptx_path}")

FILE_ID=$(echo "$UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
```

#### 2-2. Google Slides로 복사 변환

```bash
gws drive files copy \
  --params "{\"fileId\": \"$FILE_ID\", \"fields\": \"id,name,mimeType,webViewLink\"}" \
  --json "{\"name\": \"{파일명}\", \"mimeType\": \"application/vnd.google-apps.presentation\"}"
```

`mimeType: "application/vnd.google-apps.presentation"` 을 지정하면 Drive가 자동으로 PPTX → Google Slides 변환한다.

#### 2-3. 임시 PPTX 파일 삭제

```bash
gws drive files delete --params "{\"fileId\": \"$FILE_ID\"}"
```

#### 특정 폴더에 업로드하는 경우

2-2 단계의 `--json` 에 `"parents": ["{folder_id}"]` 를 추가한다:

```bash
gws drive files copy \
  --params "{\"fileId\": \"$FILE_ID\", \"fields\": \"id,name,mimeType,webViewLink\"}" \
  --json "{\"name\": \"{파일명}\", \"mimeType\": \"application/vnd.google-apps.presentation\", \"parents\": [\"{folder_id}\"]}"
```

### Step 3: 결과 리포트

사용자에게 다음을 제공:

- Google Slides URL (변환된 프레젠테이션)
- Google Drive 파일 URL
- 공유 설정 안내 (기본: 비공개)
- 변환 시 주의사항:
  - 커스텀 폰트는 Google Slides에서 대체될 수 있음. 현재 기본 폰트는 Arial
  - 복잡한 SVG/이미지가 약간 다르게 렌더링될 수 있음

## 옵션

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--folder`, `-f` | 업로드할 Drive 폴더 ID | Drive 루트 |
| `--share` | 업로드 후 공유 링크 생성 | `false` |

> **주의**: `--no-convert` 옵션은 제거되었다. Google Slides 변환은 항상 필수이며 생략할 수 없다.

## Google Slides 변환 참고사항

Google Drive의 자동 변환은 PPTX → Google Slides 네이티브 포맷으로 전환한다:

- **장점**: 브라우저에서 바로 편집, 공유/협업 가능, 버전 관리
- **폰트 대체**: Google Fonts에 없는 폰트는 자동 대체됨
  - Arial → Arial 또는 유사 sans-serif
  - 기타 커스텀 폰트 → Arial/Roboto
- **레이아웃**: 대부분 보존되나 미세한 차이 발생 가능
  - 둥근 모서리, 투명도, 그림자 → 대부분 지원
  - 복잡한 SVG → 래스터 이미지로 변환될 수 있음

## 파이프라인 요약

```
src/slides/Slide*.tsx
    ↓  (export-pptx: manifest 생성 + PptxGenJS 변환)
output/{제목}/{제목}.pptx
    ↓  Step 2-1: gws drive files create --upload → Drive에 PPTX 임시 업로드
    ↓  Step 2-2: gws drive files copy --json mimeType=google-apps.presentation → Google Slides 변환
    ↓  Step 2-3: gws drive files delete → 임시 PPTX 삭제
Google Slides 프레젠테이션 (Drive 루트 또는 지정 폴더)
```

## 제약

- 네트워크 연결 필수
- Google Workspace 인증 필요
- 파일 크기 제한: 100MB (Google Drive 업로드 한도)
- Google Slides 변환 품질은 Google의 변환 엔진에 의존
