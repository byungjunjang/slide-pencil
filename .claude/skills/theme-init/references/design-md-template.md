# DESIGN.md — 새 테마용 템플릿

`/theme-init` Step 4.5에서 LLM이 이 템플릿을 채워 `references/<new-theme>/DESIGN.md`를 생성한다. slide-plan 스킬이 입력으로 소비한다.

> 모든 섹션은 **반드시** 채운다. 빈 섹션은 사용자에게 명시적으로 묻거나 안전한 default를 적고 사용자 검토 단계에서 확정.

```markdown
# <theme-name> — DESIGN.md

> slide-pencil 활성 테마 `<theme-name>`의 디자인 시스템 통합 사양. **slide-plan 스킬이 입력으로 소비**한다.
>
> 단일 진실 원천(SSOT)은 분야별로 흩어져 있다 — `theme-rules.md`(테마 룰), 패턴 HTML, 가이드 MD. 이 문서는 plan 단계가 한 번에 흡수할 수 있도록 distill한 통합본이다.
>
> /theme-init 자동 생성 + 사용자 검토 결과 (yyyy-mm-dd).

## 1. Visual theme & atmosphere

**감각:** <한 단락 — 시각적 톤·참고 디자인 시스템·핵심 인상>

핵심 원칙 (입력 가이드에서 추출):
- <원칙 1>
- <원칙 2>
- <원칙 3>

**Calibration anchors (자체 평가용):**
| Score | Reference |
|---|---|
| 10점 | <최고 수준 reference> |
| 8점 | <중간> |
| 6점 | <보통> |

## 2. Palette & contrast behavior

**고정 accent:** `<HEX>` (`var(--accent)`). 사용 빈도·위치 룰 명시.

**컬러 토큰:**
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `<HEX>` | 슬라이드 루트 |
| `--surface` | `<HEX>` | 카드 기본 |
| `--surface-alt` | `<HEX>` | 카드 alt |
| `--text` | `<HEX>` | 본문 |
| `--text-secondary` | `<HEX>` | 서브타이틀 |
| `--border` | `<HEX>` | 1px 구분선 |
| `--accent` | `<HEX>` | 메인 강조 |
| `--accent-soft` | `<HEX>` | accent 배경 |

(Semantic colors 있으면 추가 표)

**Contrast 규칙:**
- 슬라이드 bg 허용 컬러: <목록>
- 카드 bg 허용 컬러: <목록>
- accent 사용 빈도: <"한 슬라이드당 1~2회" 같은 처방적 룰>
- (다크 모드 허용 / 라이트 전용 명시)

## 3. Typography hierarchy

**폰트:** <font-family 풀 stack>

**시맨틱 클래스 (slide-pencil 토큰 컨트랙트 v1 고정):**

| Role | Class | Size | Weight | Color Token |
|---|---|---|---|---|
| Display | `.display` | <Npx> | <weight> | `--text` |
| Display-sm | `.display-sm` | <Npx> | <weight> | `--accent` or `--text` |
| Headline (h2) | `.headline` | <Npx> | <weight> | `--text` |
| Title | `.title` | <Npx> | <weight> | `--text` |
| Body | `.body` | <Npx> | <weight> | `--text` |
| Caption | `.caption` | <Npx> | <weight> | `--text-secondary` |
| Label-caption | `.label-caption` | <Npx> | <weight> UPPERCASE | `--text-secondary` |

**허용 fontSize 스케일:** {<목록>}. 외 값 사용 금지.
**절대 최솟값:** <Npx>.

(letter-spacing / line-height 룰 있으면 추가)

## 4. Spacing & density

**N px 그리드.** 모든 spacing은 토큰.

| Token | Value | Usage |
|---|---|---|
| `--space-N` | `<Npx>` | <용도> |

**카드:**
- radius: <Npx>
- padding: <Npx>
- gap: <Npx>
- border: <스펙>

**Density rules (HARD — slide-plan과 /slide 양쪽에서 강제):**
- <빈 공간 룰>
- <콘텐츠 슬라이드 최소 요소 수>
- <카드 내부 layer 수>
- <텍스트 전용 슬라이드 연속 룰>
- <고밀도 쿼터>

## 5. Layout grammar (layout families)

slide-plan의 `recommended_layout_family` 어휘. 각 family는 1~다수의 패턴으로 매핑.

| layout_family | 의도 | 매핑 패턴 (<theme-name>) |
|---|---|---|
| `cover` | 첫 슬라이드 | <패턴 ID> |
| `section-divider` | 주제 전환 | <패턴 ID> |
| `agenda` | 덱 구조 미리보기 | <패턴 ID> |
| `point-grid` | 균일 카드 N개 병렬 | <패턴 ID> |
| `kpi-dashboard` | 수치 중심 | <패턴 ID> |
| `comparison` | 두 옵션 비교 | <패턴 ID> |
| `narrative-split` | 좌측 요약 + 우측 콘텐츠 | <패턴 ID> |
| `tabular` | 표 중심 | <패턴 ID> |
| `matrix` | 매트릭스 | <패턴 ID> |
| `statement` | Key Statement / Quote | <패턴 ID> |
| `media` | 풀블리드 미디어 | <패턴 ID> |
| `summary-closing` | 마무리 | <패턴 ID> |

> **참고:** 13개 family는 권장이지만 preset마다 자유 변형 가능. 단 slide-plan이 `recommended_layout_family`로 받는 어휘와 일치해야 함. 새 family 추가 시 사용자에게 확인.

**Diversity 규칙:**
- 동일 family 연속 N장 금지
- N장 이하: 최소 N종 / N장 이상: 최소 N종

## 6. Header / body / footer structure

**모든 콘텐츠 슬라이드:**

```
┌─ Header — <스펙>
├─ Body — <스펙>
└─ Footer — <스펙 (Governing Message 사용 여부 등)>
```

**HARD RULES:**
- <supertitle 룰 등>

## 7. Page flow (Title / Body / End)

| 페이지 종류 | 시각 | 클래스 |
|---|---|---|
| Title (cover) | <스펙> | <클래스> |
| Section divider | <스펙> | <클래스> |
| Body | <스펙> | <클래스> |
| End (closing) | <스펙> | <클래스> |

**커버 유형 (덱별 다른 유형 선택):**
- A. <이름> — <스펙>
- B. <이름> — <스펙>
- ...

## 8. Chart / table treatment

slide-plan의 `chart_strategy`는 표준 9종 + custom 어휘 사용. 시각 구현은 본 테마 boilerplate가 책임.

| Strategy | 매핑 패턴 |
|---|---|
| `growth-trend` | <패턴> |
| `forecast` | <패턴> |
| `structural-break` | <패턴> |
| `focus-comparison` | <패턴> |
| `distribution` | <패턴 또는 custom> |
| `quadrant` | <패턴> |
| `priority-matrix` | <패턴 또는 custom> |
| `split-segment` | <패턴> |
| `funnel` | <패턴 또는 custom> |
| `custom` | 자유 |

**차트 색상 룰:**
- <accent + opacity 변형 룰>
- <차트 컨테이너 사이즈>
- <애니메이션 룰>

**테이블 룰:**
- <비교 테이블 winner highlight 룰>
- <헤더·아이콘 룰>
- <takeaway 의무>

## 9. Icon system

- <아이콘 스타일: line / filled / 등>
- <stroke / size / wrapper 룰>
- <number badge 사용 시점>
- <이모지 금지 룰>

## 10. Anti-patterns

본 테마에서 절대 금지하는 패턴 목록. 가능하면 anti-slop.md 같은 별도 SSOT 파일을 가리키되, 핵심은 여기 박제.

| # | Rule | 핵심 |
|---|---|---|
| 1 | <룰 이름> | <한 줄 설명> |
| ... | ... | ... |

**Slide-level self-check (slide-plan에서 강제):**
- <체크 항목 1>
- <체크 항목 2>
- ...

---

## Appendix — slide-plan ↔ <theme-name> 매핑 빠른 참조

slide-plan이 채워야 할 슬라이드별 필드 → 본 테마 자산:

| Plan field | 매핑 |
|---|---|
| `recommended_layout_family` | §5의 family 어휘 |
| `chart_strategy` | §8의 어휘 |
| `core_message` | <어디에 들어가는지> |
| `audience_takeaway` | <어디에 들어가는지> |
| `content_blocks[].block_type` | <매핑 룰> |
| `evidence_sources` | <어디에 들어가는지> |
| `must_not_include` | §10 anti-patterns 자동 추가 |
```

---

## 작성 가이드 (LLM이 사용자 입력에서 채우는 룰)

### 입력 → 섹션 매핑

| 사용자 입력 위치 | DESIGN.md 섹션 |
|---|---|
| 가이드 MD의 "테마 이름·설명" / "철학" | §1 Visual theme |
| 가이드 MD의 "컬러 팔레트" / `.pen`의 컬러 변수 | §2 Palette |
| 가이드 MD의 "폰트 / 타이포 스케일" / `.pen`의 텍스트 스타일 | §3 Typography |
| 가이드 MD의 "spacing" / `.pen`의 layout 변수 | §4 Spacing |
| 사용자 제공 패턴 HTML / 5종 시드 | §5 Layout grammar |
| 가이드 MD의 "header / footer / GM" 언급 / 추론 | §6 Header/body/footer |
| 가이드 MD의 "커버 전략" / 5종 시드 | §7 Page flow |
| 가이드 MD의 "차트·표" / 추론 | §8 Chart/table |
| 가이드 MD의 "아이콘" / 추론 | §9 Icon system |
| 가이드 MD의 "금지/지양/피한다" 항목 | §10 Anti-patterns |

### 누락 처리

가이드 MD에 해당 정보 없으면:
1. 안전한 default 채우고 `<!-- TODO: 사용자 검토 -->` 주석으로 표시
2. /theme-init Step 4.5의 사용자 검토 체크포인트에서 명시적으로 묻기
3. 사용자가 "기본값 ok" 응답 시 주석만 제거

### 13 family 어휘 호환성

§5 layout_family 어휘는 slide-plan이 직접 소비. 어휘 자체는 자유 변형 가능하지만, **추가/제거/이름 변경 시 사용자 명시 confirm 필요**. 기본 13개 외에 새 family 추가는 별도 design 결정.

### length 가이드라인

- 너무 짧으면 plan에 정보 부족 → ~3~6KB 권장 (jangpm DESIGN.md 참고: ~10KB는 풍부, ~3KB는 minimum)
- 표·코드 블록 적극 활용 — 자연어보다 처방적
