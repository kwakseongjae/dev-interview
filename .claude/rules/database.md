# 데이터베이스 규칙

> Supabase 및 PostgreSQL 사용 시 따라야 할 규칙

---

## Supabase Timezone 규칙

### 핵심 원칙

이 프로젝트는 **한국 표준시(KST, Asia/Seoul)**를 표준 타임존으로 사용합니다.

**데이터베이스 타임존 설정**: `ALTER DATABASE postgres SET timezone = 'Asia/Seoul'`

- 모든 `timestamptz` 컬럼이 자동으로 KST로 입출력됩니다
- 내부 저장은 UTC, 입출력은 KST (PostgreSQL 자동 변환)
- 별도의 View나 Helper 함수 불필요

### 필수 규칙

1. **타임스탬프 타입**:
   - ✅ 항상 `timestamptz` 사용 (자동 KST 변환)
   - ❌ `timestamp` 사용 금지 (타임존 정보 없음)

2. **타임존 유틸리티**:
   - ✅ `src/lib/timezone.ts`의 함수 사용
   - ❌ 중복 `getKstDateString()` 정의 금지

3. **데이터베이스 접근**:
   - ✅ 표준 Supabase 패턴 사용: `supabase.from('table')`
   - ✅ 타임스탬프는 자동으로 KST로 반환됨
   - ❌ 별도의 timezone 변환 코드 불필요

4. **KST 날짜 컬럼** (선택적):
   - ✅ 자주 필터링하는 날짜는 generated column 사용
   - 예: `kst_day date GENERATED ALWAYS AS ((ts AT TIME ZONE 'Asia/Seoul')::date) STORED`

### 스키마 작성 템플릿

```sql
-- 기본 테이블 (타임스탬프는 자동으로 KST로 입출력됨)
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ✅ timestamptz 사용 (DB timezone이 KST이므로 자동 변환)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 날짜 필터링이 자주 필요한 경우 generated column 추가
CREATE TABLE daily_events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ts timestamptz NOT NULL DEFAULT now(),

  -- ✅ KST 날짜 컬럼 (인덱싱 및 필터링용)
  kst_day date NOT NULL GENERATED ALWAYS AS (
    (ts AT TIME ZONE 'Asia/Seoul')::date
  ) STORED
);

-- 인덱스 생성 (날짜별 조회 최적화)
CREATE INDEX idx_daily_events_kst_day ON daily_events(kst_day);
```

### 코드 예제

```typescript
import { getKstDateString } from "@/lib/timezone";

// ✅ GOOD: 표준 Supabase 패턴 (자동 KST 변환)
const { data } = await supabase
  .from("payment_history")
  .select("created_at, period_start, period_end")
  .eq("user_id", userId);
// → created_at, period_start, period_end가 모두 KST로 반환됨

// ✅ GOOD: 날짜 비교 (DB가 KST이므로 getKstDateString() 직접 사용)
const today = getKstDateString(); // '2026-01-26'
const { data } = await supabase
  .from("usage_daily")
  .select("*")
  .eq("day", today);

// ❌ BAD: 중복 유틸리티 정의
// const getKstDateString = () => ...
```

### 주의사항

1. **Supabase Dashboard**: 대시보드에서 보이는 타임스탬프도 KST로 표시됩니다
2. **Migration**: 기존 UTC 데이터는 변환 불필요 (자동으로 KST로 해석됨)
3. **API 응답**: 클라이언트에게 전달되는 타임스탬프도 KST 형식 (`YYYY-MM-DD HH:MM:SS+09`)
4. **Generated Column**: `kst_day` 같은 날짜 컬럼은 여전히 유용 (인덱싱, 빠른 날짜 필터링)

### 상세 가이드

전체 가이드는 [`docs/SUPABASE_TIMEZONE_GUIDE.md`](../../docs/SUPABASE_TIMEZONE_GUIDE.md)를 참조하세요.

---

**마지막 업데이트**: 2026-01-26
