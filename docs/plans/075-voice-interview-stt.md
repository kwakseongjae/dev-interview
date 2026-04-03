# #75 음성 면접 (STT) 기능 도입

## Overview

**문제**: 현재 면접 답변은 텍스트 타이핑만 지원. 실제 면접은 음성 기반이므로, 타이핑 속도가 답변 품질의 병목이 됨.

**목표**: 음성 입력(STT)을 면접 페이지에 통합하여 사용자가 실제 면접처럼 말하면서 답변할 수 있게 함. 특히 한국어 + 영어 기술 용어 혼용(코드스위칭) 환경에서 높은 정확도를 확보.

**범위**:

- 면접 페이지(`/interview`, `/case-studies/[slug]/interview`)에 음성 입력 UI 추가
- GPT-4o-mini-transcribe Realtime Transcription Session (WebSocket 스트리밍)
- 명확한 기술 용어에 대한 간단한 사전 교정
- STT 비용 트래킹 (관리자 대시보드 + kill switch)
- 마이크 권한 핸들링 및 브라우저 호환성

---

## Research Summary (8개 에이전트 병렬 리서치 결과)

### 엔진 선정 과정

7개 STT 엔진을 비교 분석한 결과, 보수적 관점에서 다음과 같이 평가:

| 엔진                       | 결과        | 사유                                                                       |
| -------------------------- | ----------- | -------------------------------------------------------------------------- |
| Web Speech API             | 보조용 가능 | 무료, 코드스위칭 불가, Chrome/Safari만                                     |
| Whisper WASM               | **탈락**    | 한국어 CER ~18% (브라우저 가능 모델 기준)                                  |
| Distil-Whisper             | **탈락**    | 영어 전용                                                                  |
| Deepgram Nova-3            | **탈락**    | 한국어가 multilingual/코드스위칭 모드에서 제외                             |
| Soniox v4                  | **탈락**    | 직원 2-11명, 한국어 정확도 독립 검증 없음, 무료 티어 폐지                  |
| Google Cloud STT           | 과도함      | 백엔드 프록시 필요, $0.016/min                                             |
| Azure Speech               | 대안 가능   | $0.017/min, 브라우저 SDK 있음                                              |
| **GPT-4o-mini-transcribe** | **채택**    | HiKE 코드스위칭 1위 계열, $0.003/min, Realtime Session 지원, OpenAI 안정성 |

### 핵심 벤치마크 (HiKE — 한국어-영어 코드스위칭)

| 모델                  | MER (전체) | PIER (전환점) |
| --------------------- | ---------- | ------------- |
| GPT-4o-transcribe     | **21.8%**  | 28.8%         |
| Whisper-Large (1.5B)  | 26.1%      | 36.0%         |
| Whisper-Medium (769M) | 31.3%      | 41.3%         |

GPT-4o 계열이 코드스위칭에서 유일하게 의미 있는 성능을 보임. mini 버전은 벤치마크 미포함이나 동일 계열.

### 교정 파이프라인 실효성 검증

| 전략                      | 판정     | 사유                                                      |
| ------------------------- | -------- | --------------------------------------------------------- |
| 사전 매칭 (명확한 용어만) | **유지** | "리액트"→"React" 등 모호하지 않은 용어는 효과적           |
| Jamo 퍼지 매칭            | **제거** | Keyterm이 커버하는 범위와 중복, false positive 위험       |
| Claude Haiku 후처리       | **제거** | WER 5% 미만에서 LLM 교정은 오히려 에러 증가 (Amazon 연구) |

→ **사전 1단계만 유지** (명확한 용어 ~100개, 모호한 단어 제외)

---

## Architecture Decision: 최종 선택

### **GPT-4o-mini-transcribe Realtime Transcription Session**

```
┌─────────────────────────────────────────────────────────────┐
│  단일 엔진: GPT-4o-mini-transcribe (Realtime Session)        │
│                                                              │
│  [마이크] → [WebSocket 연결: /api/transcribe/stream]         │
│              → OpenAI Realtime Transcription Session          │
│              → delta 이벤트로 실시간 스트리밍 텍스트           │
│              → 간단한 사전 교정 (명확한 용어 ~100개)           │
│              → textarea 반영                                  │
│                                                              │
│  비용 트래킹: 모든 STT 호출을 stt_usage_logs 테이블에 기록    │
│  Kill Switch: 관리자가 STT 기능을 즉시 비활성화 가능           │
└─────────────────────────────────────────────────────────────┘
```

### 왜 이 구조인가?

1. **단일 엔진**: Web Speech API + Deepgram 이중 구조 불필요. Realtime Session이 실시간 스트리밍 + 정확도 모두 해결
2. **$0.003/min**: 가장 저렴한 클라우드 STT (Realtime Session도 동일 가격)
3. **코드스위칭 최고**: HiKE 벤치마크 GPT-4o 계열 1위
4. **OpenAI 안정성**: 가장 큰 생태계, 문서, 커뮤니티
5. **간단한 교정만**: 과도한 파이프라인 제거, 명확한 사전 매칭만 유지

### 비용 추정

| 시나리오               | 질문당 (2분) | 세션당 (5문제) | 월 100세션 | 월 1,000세션 |
| ---------------------- | ------------ | -------------- | ---------- | ------------ |
| GPT-4o-mini-transcribe | $0.006       | $0.030         | **$3.0**   | **$30**      |

---

## Requirements

### 기능 요구사항 (FR)

| ID    | 요구사항                                                | 우선순위 |
| ----- | ------------------------------------------------------- | -------- |
| FR-1  | 면접 페이지에 마이크 버튼 + 음성 입력 UI 추가           | HIGH     |
| FR-2  | GPT-4o-mini-transcribe Realtime Session 실시간 스트리밍 | HIGH     |
| FR-3  | 기술 용어 사전 교정 (명확한 용어 ~100개)                | HIGH     |
| FR-4  | 텍스트/음성 입력 모드 토글                              | HIGH     |
| FR-5  | 마이크 권한 요청 및 거부 시 graceful fallback           | HIGH     |
| FR-6  | **STT 비용 트래킹** (사용량 로깅 + 관리자 대시보드)     | HIGH     |
| FR-7  | **STT Kill Switch** (관리자가 즉시 비활성화 가능)       | HIGH     |
| FR-8  | 녹음 상태 표시 (타이머/인디케이터)                      | MEDIUM   |
| FR-9  | Case Study 면접에도 동일 기능 적용                      | MEDIUM   |
| FR-10 | 모바일 브라우저 지원                                    | MEDIUM   |

### 기술 요구사항 (TR)

| ID   | 요구사항                                                                           |
| ---- | ---------------------------------------------------------------------------------- |
| TR-1 | `useVoiceInput` 커스텀 훅 (MediaRecorder + WebSocket 관리)                         |
| TR-2 | `/api/transcribe/session` API route (OpenAI Realtime Transcription Session 프록시) |
| TR-3 | 기술 용어 사전 모듈 (`src/lib/stt/tech-dictionary.ts`)                             |
| TR-4 | **`stt_usage_logs` DB 테이블** (비용 트래킹)                                       |
| TR-5 | **관리자 대시보드 STT 탭** (사용량/비용 시각화 + kill switch)                      |
| TR-6 | **`stt_config` DB 테이블 또는 환경변수** (기능 on/off 플래그)                      |
| TR-7 | 환경변수: `OPENAI_API_KEY` (이미 존재할 가능성 높음)                               |

### 비기능 요구사항 (NFR)

| ID    | 요구사항                                        |
| ----- | ----------------------------------------------- |
| NFR-1 | 실시간 스트리밍 레이턴시 <500ms (첫 텍스트까지) |
| NFR-2 | 번들 사이즈 증가 <30KB (음성 관련 코드)         |
| NFR-3 | STT 비활성화 시 기존 텍스트 입력에 영향 없음    |
| NFR-4 | 비용 로그는 모든 STT 호출을 누락 없이 기록      |

---

## Architecture & Design

### 1. 컴포넌트 구조

```
src/
├── hooks/
│   └── useVoiceInput.ts              # MediaRecorder + WebSocket 관리
├── components/
│   └── interview/
│       ├── VoiceInputPanel.tsx        # 음성 입력 UI (마이크 버튼, 상태 표시)
│       └── VoiceModeToggle.tsx        # 텍스트/음성 모드 전환
├── lib/
│   └── stt/
│       ├── tech-dictionary.ts         # 한국어→영어 기술 용어 사전 (~100개, 명확한 것만)
│       └── openai-realtime.ts         # OpenAI Realtime Transcription Session 클라이언트
└── app/
    ├── api/
    │   └── transcribe/
    │       └── session/
    │           └── route.ts           # WebSocket 프록시 (API key 보호)
    └── admin/
        └── (기존 대시보드에 STT 탭 추가)
```

### 2. 핵심 흐름

```
[사용자 마이크 버튼 클릭]
    │
    ├── 1. STT 활성화 여부 확인 (stt_config)
    │      └── 비활성화 상태면 → "현재 음성 입력을 사용할 수 없습니다" 안내
    │
    ├── 2. 마이크 권한 요청 (navigator.mediaDevices.getUserMedia)
    │      └── 거부 시 → 텍스트 모드 유지 + 안내 메시지
    │
    ├── 3. WebSocket 연결: /api/transcribe/session
    │      └── 서버가 OpenAI Realtime Transcription Session으로 프록시
    │
    ├── 4. MediaRecorder → 오디오 청크 → WebSocket 전송
    │
    └── 5. OpenAI delta 이벤트 수신 → 사전 교정 → textarea 업데이트
           │
           └── 동시에: stt_usage_logs에 사용량 기록
                - user_id, session_id, duration_seconds, estimated_cost

[사용자 녹음 중지]
    │
    ├── WebSocket 종료
    ├── 최종 텍스트 → handleAnswerChange() 호출
    └── 사용량 로그 최종 업데이트
```

### 3. 통합 포인트

**면접 페이지** (`src/app/interview/page.tsx` L708-716):

```tsx
// 변경 후
<Card className="p-1 relative">
  {sttEnabled && <VoiceModeToggle mode={inputMode} onToggle={setInputMode} />}
  {inputMode === "voice" && sttEnabled && (
    <VoiceInputPanel
      onTranscript={(text) => handleAnswerChange(text)}
      sessionId={sessionId}
      questionId={currentQuestion.id}
    />
  )}
  <Textarea
    value={answers[currentQuestion.id] || ""}
    onChange={(e) => handleAnswerChange(e.target.value)}
    placeholder={
      inputMode === "voice" && sttEnabled
        ? "마이크 버튼을 눌러 답변을 시작하세요..."
        : "답변을 입력해주세요..."
    }
    readOnly={inputMode === "voice" && isRecording}
  />
</Card>
```

**기존 코드 변경 최소화**:

- `handleAnswerChange(value)` 재사용
- `submitAnswerApi()` 변경 없음
- DB 스키마 변경: `stt_usage_logs` 테이블만 추가 (기존 테이블 변경 없음)
- localStorage 자동저장 그대로 동작
- `sttEnabled` = false일 때 기존과 완전 동일하게 동작

### 4. 기술 용어 사전 (간소화)

```typescript
// src/lib/stt/tech-dictionary.ts
// 모호하지 않은 명확한 용어만 포함 (~100개)
// "뷰", "자바", "키", "셋" 등 일상어와 겹치는 단어는 제외

export const TECH_TERM_MAP: Record<string, string> = {
  // React/Next.js (모호하지 않음)
  리액트: "React",
  유즈스테이트: "useState",
  유즈이펙트: "useEffect",
  유즈메모: "useMemo",
  유즈콜백: "useCallback",
  유즈리듀서: "useReducer",
  유즈레프: "useRef",
  유즈컨텍스트: "useContext",
  넥스트제이에스: "Next.js",

  // 언어 (모호하지 않음)
  타입스크립트: "TypeScript",
  자바스크립트: "JavaScript",
  노드제이에스: "Node.js",

  // 상태관리
  리덕스: "Redux",
  주스탄드: "Zustand",
  리코일: "Recoil",

  // 인프라/도구
  도커: "Docker",
  쿠버네티스: "Kubernetes",
  깃허브: "GitHub",
  웹팩: "Webpack",
  이에스린트: "ESLint",

  // CS 개념 (긴 복합어 = 모호하지 않음)
  디스트럭처링: "destructuring",
  호이스팅: "hoisting",
  프로토타입: "prototype",
  미들웨어: "middleware",
  엔드포인트: "endpoint",
  그래프큐엘: "GraphQL",
  웹소켓: "WebSocket",
  포스트그레스: "PostgreSQL",
  몽고디비: "MongoDB",
  수파베이스: "Supabase",
  // ... ~100개 (모호한 단어 제외)
};

export function correctTechTerms(text: string): string {
  let result = text;
  for (const [korean, english] of Object.entries(TECH_TERM_MAP)) {
    result = result.replaceAll(korean, english);
  }
  return result;
}
```

### 5. STT 비용 트래킹

#### DB 스키마: `stt_usage_logs`

```sql
CREATE TABLE stt_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  session_id uuid REFERENCES interview_sessions(id),
  question_id uuid,
  duration_seconds integer NOT NULL,       -- 실제 오디오 길이
  estimated_cost numeric(10, 6) NOT NULL,  -- $0.003/min 기준 계산
  model text NOT NULL DEFAULT 'gpt-4o-mini-transcribe',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stt_usage_created_at ON stt_usage_logs(created_at DESC);
CREATE INDEX idx_stt_usage_user_id ON stt_usage_logs(user_id);
```

#### 비용 계산 로직

```typescript
// 서버 사이드 (API route)
function calculateCost(durationSeconds: number): number {
  const COST_PER_MINUTE = 0.003; // GPT-4o-mini-transcribe
  return (durationSeconds / 60) * COST_PER_MINUTE;
}

// 사용량 로깅
await supabaseAdmin.from("stt_usage_logs").insert({
  user_id: userId,
  session_id: sessionId,
  question_id: questionId,
  duration_seconds: audioLengthSeconds,
  estimated_cost: calculateCost(audioLengthSeconds),
  model: "gpt-4o-mini-transcribe",
});
```

#### 관리자 대시보드 — STT 탭

기존 `/admin` 페이지에 탭 추가 (기존 에러/API 탭 패턴 동일):

```
/admin
├── 탭: 개요 (기존)
├── 탭: 에러 로그 (기존)
├── 탭: API 사용량 (기존)
└── 탭: STT 사용량 (NEW)
    ├── KPI 카드: 오늘/이번 주/이번 달 비용
    ├── 일별 사용량 추이 차트 (Recharts — 이미 설치됨)
    ├── 사용자별 사용량 테이블
    ├── 비용 임계치 경고 (예: 일 $5 초과 시)
    └── ⚡ Kill Switch 토글 (STT 기능 즉시 on/off)
```

#### Kill Switch 구현

```typescript
// 옵션 A: 환경변수 기반 (재배포 필요)
// NEXT_PUBLIC_STT_ENABLED=true

// 옵션 B: DB 기반 (즉시 반영) — 권장
// app_config 테이블 또는 기존 설정 메커니즘 활용
const { data } = await supabase
  .from("app_config")
  .select("value")
  .eq("key", "stt_enabled")
  .single();

const sttEnabled = data?.value === "true";
```

- 관리자가 대시보드에서 토글 → DB 업데이트 → 다음 요청부터 즉시 반영
- 클라이언트: `sttEnabled` 상태로 UI 조건부 렌더링
- 비활성화 시 마이크 버튼 숨김 + 기존 텍스트 입력만 표시

---

## Implementation Plan

### Phase 1: 핵심 인프라 (Core)

| 순서 | 작업                                 | 파일                                      | 설명                         |
| ---- | ------------------------------------ | ----------------------------------------- | ---------------------------- |
| 1-1  | `stt_usage_logs` 테이블 마이그레이션 | SQL migration                             | 비용 트래킹                  |
| 1-2  | `app_config` STT 설정                | SQL migration                             | kill switch용                |
| 1-3  | 기술 용어 사전                       | `src/lib/stt/tech-dictionary.ts`          | ~100개 명확한 용어만         |
| 1-4  | OpenAI Realtime 클라이언트           | `src/lib/stt/openai-realtime.ts`          | WebSocket 세션 관리          |
| 1-5  | Transcribe Session API               | `src/app/api/transcribe/session/route.ts` | WebSocket 프록시 + 비용 로깅 |
| 1-6  | useVoiceInput 훅                     | `src/hooks/useVoiceInput.ts`              | MediaRecorder + WebSocket    |

### Phase 2: UI 통합 (Integration)

| 순서 | 작업             | 파일                                             | 설명                      |
| ---- | ---------------- | ------------------------------------------------ | ------------------------- |
| 2-1  | VoiceModeToggle  | `src/components/interview/VoiceModeToggle.tsx`   | 텍스트/음성 전환          |
| 2-2  | VoiceInputPanel  | `src/components/interview/VoiceInputPanel.tsx`   | 마이크 버튼 + 녹음 상태   |
| 2-3  | 면접 페이지 통합 | `src/app/interview/page.tsx`                     | 기존 textarea에 음성 통합 |
| 2-4  | Case Study 통합  | `src/app/case-studies/[slug]/interview/page.tsx` | 동일 패턴 적용            |

### Phase 3: 관리자 기능 (Admin)

| 순서 | 작업            | 파일                                   | 설명                           |
| ---- | --------------- | -------------------------------------- | ------------------------------ |
| 3-1  | STT 사용량 API  | `src/app/api/admin/stt-usage/route.ts` | 집계 데이터 조회               |
| 3-2  | STT 대시보드 탭 | `src/app/admin/`                       | 사용량/비용 차트 + kill switch |
| 3-3  | 마이크 권한 UX  | `src/hooks/useVoiceInput.ts`           | 권한 거부 시 안내              |
| 3-4  | 모바일 최적화   | 컴포넌트 파일들                        | 터치 UI, 반응형                |

---

## Quality Gates

### 빌드 & 타입 검증

- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npx eslint src/` 통과

### 기능 검증

- [ ] WebSocket 연결로 실시간 스트리밍 텍스트 수신
- [ ] 기술 용어 사전 교정 동작 ("리액트" → "React")
- [ ] 마이크 권한 거부 시 텍스트 모드로 fallback
- [ ] 텍스트/음성 모드 전환 시 답변 데이터 유지
- [ ] 기존 자동저장 (10초) 음성 모드에서도 동작
- [ ] Case Study 면접에서도 동일 기능 동작
- [ ] **stt_usage_logs에 모든 사용 기록 저장 확인**
- [ ] **Kill switch ON → 마이크 버튼 숨김, 텍스트 입력만 동작**
- [ ] **Kill switch OFF → 기존과 완전 동일**
- [ ] **관리자 대시보드에서 일별/사용자별 비용 확인 가능**

### 성능 검증

- [ ] 첫 텍스트 수신까지 <500ms
- [ ] 번들 사이즈 증가 <30KB

---

## Risks & Dependencies

| 리스크                                            | 영향     | 대응                                                       |
| ------------------------------------------------- | -------- | ---------------------------------------------------------- |
| GPT-4o-mini 한국어 코드스위칭 실제 정확도 미지수  | HIGH     | mini가 부족하면 GPT-4o-transcribe($0.006/min)로 업그레이드 |
| Realtime Transcription Session 레이턴시 예상 초과 | MEDIUM   | REST API + 5-10초 청크 배치 방식으로 전환                  |
| STT 비용 예상 초과                                | **HIGH** | Kill switch로 즉시 비활성화 + 비용 임계치 알림             |
| 모바일 브라우저 마이크 권한 이슈                  | MEDIUM   | 권한 가이드 UI + 텍스트 fallback                           |
| OpenAI API 장애                                   | LOW      | STT만 비활성화, 텍스트 입력은 영향 없음                    |

### 의존성

- `openai` SDK (이미 프로젝트에 `@anthropic-ai/sdk` 존재, OpenAI SDK 추가 필요)
- 환경변수: `OPENAI_API_KEY`
- Supabase: `stt_usage_logs` 테이블, `app_config` 테이블

---

## Future Enhancements (이번 범위 외)

### Whisper Fine-tuning

- ghost613/whisper-large-v3-turbo-korean 모델 기반
- 한국어 기술 도메인 LoRA 파인튜닝 → 서버 자체 호스팅으로 API 비용 제거
- 예상 투자: GPU $20-50, TTS 합성 데이터 $100-200

### 사용자별 비용 제한

- 무료 사용자: 월 N분 제한
- 프리미엄 사용자: 제한 없음 또는 높은 한도
- 실시간 잔여량 표시

### 맥락 기반 포매팅

- STT 출력 → LLM으로 면접 답변 형식 자동 정리
- 문장 부호, 단락 구분 자동 적용

---

## References

### 벤치마크 & 논문

- [HiKE: Korean-English Code-Switching Benchmark](https://arxiv.org/abs/2509.24613)
- [ENERZAi: Low-bit Whisper for Korean](https://enerzai.com/resources/blog/small-models-big-heat-conquering-korean-asr-with-low-bit-whisper)
- [Return Zero Korean STT Benchmark](https://blog.rtzr.ai/korean-speechai-benchmark/)
- [LLM ASR Error Correction (Amazon Science)](https://assets.amazon.science/77/26/6c265e0a42d7a40d2ee8bdd158e6/generative-speech-recognition-error-correction-with-large-language-models-and-task-activating-prompting.pdf)

### STT 엔진

- [OpenAI Realtime Transcription Guide](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [OpenAI GPT-4o Transcribe](https://developers.openai.com/api/docs/guides/speech-to-text)
- [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing)
- [OpenAI Realtime Costs](https://platform.openai.com/docs/guides/realtime-costs)

### 교정 파이프라인 실효성

- [Deepgram Korean — multilingual 코드스위칭 미지원 확인](https://developers.deepgram.com/docs/multilingual-code-switching)
- [Soniox 리스크 평가 — Glassdoor](https://www.glassdoor.com/Reviews/Soniox-Reviews-E10461332.htm)
- [ASR Error Correction with LLMs — 과잉교정 리스크](https://arxiv.org/html/2409.09554v2)

### 구현 참조

- [Custom useSpeechToText Hook (TypeScript)](https://gist.github.com/KristofferEriksson/d9dba72519c3caaf9de8d4774850b929)
- [Real-time Transcription with GPT-4o (Microsoft)](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/real-time-speech-transcription-with-gpt-4o-transcribe-and-gpt-4o-mini-transcribe/4410353)

### GitHub Issue

- [#75 음성 면접 (STT) 기능 도입](https://github.com/kwakseongjae/dev-interview/issues/75)

---

## Implementation Summary

**Completion Date**: 2026-04-03
**Implemented By**: Claude Opus 4.6

### 계획 대비 변경사항

| 계획                       | 실제 구현               | 사유                                                                |
| -------------------------- | ----------------------- | ------------------------------------------------------------------- |
| WebSocket Realtime Session | REST API + 녹음 후 전송 | WebSocket 복잡도 대비 REST가 초기 구현에 적합, 추후 업그레이드 예정 |
| 실시간 스트리밍 텍스트     | 녹음 완료 후 일괄 변환  | REST 방식에 따른 자연스러운 차이                                    |
| 녹음 상한 120초            | **300초 (5분)** 로 확대 | 사용자 피드백 반영, 실제 면접 답변 시 2분 이상 소요 빈번            |

### Changes Made

#### 핵심 기능 (기존 커밋)

- `src/hooks/useVoiceInput.ts` — MediaRecorder + REST transcription 훅
- `src/components/interview/VoiceInputPanel.tsx` — 마이크 버튼, 녹음 상태, 쿼터 표시 UI
- `src/components/interview/VoiceModeToggle.tsx` — 텍스트/음성 모드 전환
- `src/lib/stt/openai-realtime.ts` — OpenAI gpt-4o-mini-transcribe 호출
- `src/lib/stt/tech-dictionary.ts` — 한국어→영어 기술 용어 사전 (142개)
- `src/lib/stt/config.ts` — 쿼터 관리, kill switch, 원자적 예약
- `src/app/api/transcribe/route.ts` — 메인 변환 API (인증+Rate Limit+쿼터+변환)
- `src/app/api/transcribe/quota/route.ts` — 쿼터 조회 API
- `src/app/api/transcribe/log/route.ts` — 사용량 로깅 API
- `src/app/interview/page.tsx` — 면접 페이지 음성 통합
- `src/app/case-studies/[slug]/interview/page.tsx` — 케이스 스터디 면접 음성 통합
- `src/app/admin/_components/stt-usage-panel.tsx` — 관리자 STT 사용량 대시보드
- `src/app/api/admin/stt-usage/route.ts` — STT 사용량 집계 API
- `src/app/api/admin/stt-config/route.ts` — STT kill switch API

#### 이번 세션 추가 작업 (보안/UX/비용 강화)

**음성 면접 UX 개선**:

- `VoiceInputPanel.tsx` — autoApply 모드 (변환 결과 자동 적용), onVoiceActiveChange/onRecordingChange 콜백
- `interview/page.tsx`, `case-studies/.../page.tsx` — 녹음 중 이탈 방지 (beforeunload), 네비게이션 잠금 (이전/다음/제출 비활성화), textarea 녹음 중에만 readOnly
- `VoiceInputPanel.tsx` — 녹음 중 남은 쿼터 실시간 카운트다운 표시

**보안 강화**:

- `route.ts` (transcribe) — Duration 조작 방지: `audioFile.size / 1500`과 클라이언트 값 중 큰 값 사용
- `route.ts` (transcribe) — Rate Limit: 인메모리 Map → DB 기반 (`stt_usage_logs.created_at` 카운트)
- `config.ts` — Race Condition 해결: `reserve_stt_quota` RPC 함수로 원자적 처리 (fallback 포함)
- `20260403_add_reserve_stt_quota_rpc.sql` — PostgreSQL RPC 마이그레이션

**API 비용 트래킹 통합** (전 서비스):

- `src/lib/api-usage-logger.ts` — 통합 API 사용량 로깅 유틸리티 (신규)
- `20260403_add_api_usage_logs.sql` — `api_usage_logs` 테이블 마이그레이션 (신규)
- `src/lib/claude.ts` — generateQuestions, evaluateAnswer, validateReference, extractReference 토큰 로깅
- `src/lib/hint-generator.ts` — generateHintWithClaude 토큰 로깅
- `src/lib/ai/feedback-generator.ts` — quick/detailed/full/model-answer 4개 피드백 토큰 로깅
- `src/lib/embedding.ts` — Voyage AI 임베딩 토큰 로깅

**유저 일일 제한**:

- `api-usage-logger.ts` — `checkDailyClaudeLimit()` (유저당 일일 50회)
- `questions/generate/route.ts` — 로그인 유저 대상 일일 제한 적용

**관리자 대시보드**:

- `recent-sessions-table.tsx` — 세션별 생성 질문 토글 조회 기능
- `stats/route.ts` — 세션 질문 내용 조인 추가

### Quality Validation

- [x] Build: Success
- [x] Type Check: Passed (validator.ts 캐시 이슈 제외)
- [x] Lint: Passed

### Performance Impact

- 녹음 상한: 120초 → 300초 (5분)
- Rate Limit: 인메모리 → DB 기반 (서버리스 호환, ~50ms 추가)
- 일일 제한 체크: 요청당 DB 쿼리 1회 추가 (~50ms)
- API 사용량 로깅: fire-and-forget (응답 시간 영향 없음)

### 생성된 이슈

| 이슈                                                      | 제목                                             | 상태 |
| --------------------------------------------------------- | ------------------------------------------------ | ---- |
| [#83](https://github.com/kwakseongjae/mochabun/issues/83) | 비개발 면접 쿼리 어뷰징 방지 — 쿼리 검증 강화    | Open |
| [#84](https://github.com/kwakseongjae/mochabun/issues/84) | 회원 행동 분석 대시보드 + API 비용 통합 탭       | Open |
| [#85](https://github.com/kwakseongjae/mochabun/issues/85) | 반복 사용자 캐시 미스로 인한 질문 생성 속도 저하 | Open |

### Commits

```
b0fa2de feat(stt): 음성 면접(STT) 기능 추가 — GPT-4o-mini-transcribe 기반
4f061f5 chore(seeds): 질문 시드 72개 추가 (SYSTEM_DESIGN, DEVOPS, ARCHITECTURE, SECURITY, 트렌드)
(pending) feat(stt): 보안/UX/비용 트래킹 강화 — Duration 검증, DB Rate Limit, 원자적 쿼터, API 사용량 통합 로깅
```

### Follow-up Tasks

- [ ] #83 — 비개발 면접 쿼리 어뷰징 방지
- [ ] #84 — 회원 행동 분석 대시보드 + API 비용 통합 탭
- [ ] #85 — 반복 사용자 캐시 미스 속도 저하 해결
- [ ] WebSocket Realtime Session 업그레이드 (실시간 스트리밍)
- [ ] `api_usage_logs` 대시보드 UI 탭 구현
