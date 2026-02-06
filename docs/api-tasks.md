# DevInterview API Tasks

## 개요

Supabase + Vector DB + Claude API를 활용한 백엔드 API 작업 명세서

### 기술 스택

- **Database**: Supabase (PostgreSQL)
- **Vector DB**: Supabase Vector (pgvector)
- **AI**: Claude API (Anthropic)
- **Embedding**: Claude Embedding (voyage-3 또는 대안)
- **Auth**: JWT 기반 (Access Token + Refresh Token)
- **Backend**: Next.js API Routes

---

## 1. 데이터베이스 스키마

### 1.1 Users 테이블

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt 해시
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX users_email_idx ON users(email);

-- RLS 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### 1.2 Categories 테이블 (대분류)

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,        -- NETWORK, DATABASE, FRONTEND 등
  display_name TEXT NOT NULL,       -- 네트워크, 데이터베이스, 프론트엔드 등
  description TEXT,
  icon TEXT,                        -- 아이콘 이름 (선택)
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX categories_name_idx ON categories(name);
CREATE INDEX categories_sort_order_idx ON categories(sort_order);

-- RLS 정책
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);
```

### 1.3 Subcategories 테이블 (소분류)

```sql
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- WEB, REACT, NODE 등
  display_name TEXT NOT NULL,       -- 웹, 리액트, 노드 등
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)         -- 같은 대분류 내 소분류 이름 중복 방지
);

-- 인덱스
CREATE INDEX subcategories_category_id_idx ON subcategories(category_id);
CREATE INDEX subcategories_name_idx ON subcategories(name);

-- RLS 정책
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subcategories are viewable by everyone" ON subcategories
  FOR SELECT USING (true);
```

### 1.4 Refresh Tokens 테이블

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ -- 토큰 무효화 시간
);

-- 인덱스
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_token_idx ON refresh_tokens(token);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);

-- 만료된 토큰 자동 삭제 (선택사항)
-- pg_cron 또는 애플리케이션 레벨에서 처리
```

### 1.5 Questions 테이블 (Vector DB)

```sql
-- pgvector extension 활성화
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_normalized TEXT NOT NULL, -- 정규화된 질문 (검색용)
  hint TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),       -- 대분류 FK
  subcategory_id UUID REFERENCES subcategories(id),          -- 소분류 FK (선택)
  difficulty TEXT DEFAULT 'MEDIUM' CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  embedding VECTOR(1024), -- Claude embedding dimension
  favorite_count INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,  -- 검증된 질문 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Vector 인덱스 (cosine similarity)
CREATE INDEX questions_embedding_idx ON questions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 텍스트 검색 인덱스
CREATE INDEX questions_content_idx ON questions
  USING GIN (to_tsvector('korean', content));

-- 카테고리 필터링 인덱스
CREATE INDEX questions_category_id_idx ON questions(category_id);
CREATE INDEX questions_subcategory_id_idx ON questions(subcategory_id);
CREATE INDEX questions_difficulty_idx ON questions(difficulty);

-- RLS 정책
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are viewable by everyone" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert questions" ON questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 1.6 Interview Sessions 테이블

```sql
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL, -- 사용자 검색 쿼리
  total_time INT DEFAULT 0, -- 총 소요 시간 (초)
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX sessions_user_id_idx ON interview_sessions(user_id);
CREATE INDEX sessions_created_at_idx ON interview_sessions(created_at DESC);

-- RLS 정책
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON interview_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON interview_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON interview_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON interview_sessions
  FOR DELETE USING (auth.uid() = user_id);
```

### 1.7 Session Questions (중간 테이블)

```sql
CREATE TABLE session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  question_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX sq_session_id_idx ON session_questions(session_id);
CREATE UNIQUE INDEX sq_session_question_idx ON session_questions(session_id, question_id);
```

### 1.8 Answers 테이블

```sql
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  time_spent INT DEFAULT 0, -- 소요 시간 (초)
  ai_score DECIMAL(3,1), -- AI 평가 점수 (1.0 ~ 10.0)
  ai_feedback TEXT, -- AI 피드백
  is_public BOOLEAN DEFAULT FALSE, -- 공개 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX answers_session_id_idx ON answers(session_id);
CREATE INDEX answers_question_id_idx ON answers(question_id);
CREATE INDEX answers_user_id_idx ON answers(user_id);
CREATE INDEX answers_public_idx ON answers(question_id) WHERE is_public = TRUE;

-- RLS 정책
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers" ON answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public answers" ON answers
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can insert own answers" ON answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON answers
  FOR UPDATE USING (auth.uid() = user_id);
```

### 1.9 Favorites 테이블

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 인덱스
CREATE INDEX favorites_user_id_idx ON favorites(user_id);
CREATE INDEX favorites_question_id_idx ON favorites(question_id);

-- RLS 정책
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);
```

### 1.10 favorite_count 트리거

```sql
-- 찜 추가 시 카운트 증가
CREATE OR REPLACE FUNCTION increment_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE questions SET favorite_count = favorite_count + 1
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_insert
  AFTER INSERT ON favorites
  FOR EACH ROW EXECUTE FUNCTION increment_favorite_count();

-- 찜 삭제 시 카운트 감소
CREATE OR REPLACE FUNCTION decrement_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE questions SET favorite_count = favorite_count - 1
  WHERE id = OLD.question_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_favorite_delete
  AFTER DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION decrement_favorite_count();
```

### 1.11 초기 카테고리 데이터

```sql
-- 대분류 (Categories) 초기 데이터
INSERT INTO categories (name, display_name, description, sort_order) VALUES
  ('FRONTEND', '프론트엔드', '웹 프론트엔드 개발 관련 질문', 1),
  ('BACKEND', '백엔드', '서버 및 백엔드 개발 관련 질문', 2),
  ('DATABASE', '데이터베이스', 'DB 설계, 쿼리, 최적화 관련 질문', 3),
  ('NETWORK', '네트워크', '네트워크, 프로토콜, 보안 관련 질문', 4),
  ('CS', '컴퓨터 과학', '자료구조, 알고리즘, OS 관련 질문', 5),
  ('DEVOPS', '데브옵스', 'CI/CD, 클라우드, 인프라 관련 질문', 6),
  ('MOBILE', '모바일', 'iOS, Android 개발 관련 질문', 7),
  ('SECURITY', '보안', '웹 보안, 암호화 관련 질문', 8),
  ('ARCHITECTURE', '아키텍처', '시스템 설계, 디자인 패턴 관련 질문', 9),
  ('SOFT_SKILLS', '소프트 스킬', '커뮤니케이션, 협업 관련 질문', 10);

-- 소분류 (Subcategories) 초기 데이터
-- FRONTEND 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'HTML_CSS', 'HTML/CSS', 1),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'JAVASCRIPT', 'JavaScript', 2),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'TYPESCRIPT', 'TypeScript', 3),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'REACT', 'React', 4),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'VUE', 'Vue', 5),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'NEXTJS', 'Next.js', 6),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'PERFORMANCE', '웹 성능', 7),
  ((SELECT id FROM categories WHERE name = 'FRONTEND'), 'BROWSER', '브라우저', 8);

-- BACKEND 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'NODEJS', 'Node.js', 1),
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'JAVA', 'Java/Spring', 2),
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'PYTHON', 'Python', 3),
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'GO', 'Go', 4),
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'API_DESIGN', 'API 설계', 5),
  ((SELECT id FROM categories WHERE name = 'BACKEND'), 'AUTH', '인증/인가', 6);

-- DATABASE 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'DATABASE'), 'SQL', 'SQL', 1),
  ((SELECT id FROM categories WHERE name = 'DATABASE'), 'NOSQL', 'NoSQL', 2),
  ((SELECT id FROM categories WHERE name = 'DATABASE'), 'REDIS', 'Redis', 3),
  ((SELECT id FROM categories WHERE name = 'DATABASE'), 'ORM', 'ORM', 4),
  ((SELECT id FROM categories WHERE name = 'DATABASE'), 'OPTIMIZATION', '쿼리 최적화', 5);

-- NETWORK 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'NETWORK'), 'HTTP', 'HTTP/HTTPS', 1),
  ((SELECT id FROM categories WHERE name = 'NETWORK'), 'TCP_IP', 'TCP/IP', 2),
  ((SELECT id FROM categories WHERE name = 'NETWORK'), 'WEBSOCKET', 'WebSocket', 3),
  ((SELECT id FROM categories WHERE name = 'NETWORK'), 'REST', 'REST API', 4),
  ((SELECT id FROM categories WHERE name = 'NETWORK'), 'GRAPHQL', 'GraphQL', 5);

-- CS 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'CS'), 'DATA_STRUCTURE', '자료구조', 1),
  ((SELECT id FROM categories WHERE name = 'CS'), 'ALGORITHM', '알고리즘', 2),
  ((SELECT id FROM categories WHERE name = 'CS'), 'OS', '운영체제', 3),
  ((SELECT id FROM categories WHERE name = 'CS'), 'MEMORY', '메모리 관리', 4);

-- DEVOPS 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'DEVOPS'), 'DOCKER', 'Docker', 1),
  ((SELECT id FROM categories WHERE name = 'DEVOPS'), 'KUBERNETES', 'Kubernetes', 2),
  ((SELECT id FROM categories WHERE name = 'DEVOPS'), 'CI_CD', 'CI/CD', 3),
  ((SELECT id FROM categories WHERE name = 'DEVOPS'), 'AWS', 'AWS', 4),
  ((SELECT id FROM categories WHERE name = 'DEVOPS'), 'MONITORING', '모니터링', 5);

-- ARCHITECTURE 하위
INSERT INTO subcategories (category_id, name, display_name, sort_order) VALUES
  ((SELECT id FROM categories WHERE name = 'ARCHITECTURE'), 'DESIGN_PATTERN', '디자인 패턴', 1),
  ((SELECT id FROM categories WHERE name = 'ARCHITECTURE'), 'MSA', 'MSA', 2),
  ((SELECT id FROM categories WHERE name = 'ARCHITECTURE'), 'SYSTEM_DESIGN', '시스템 설계', 3),
  ((SELECT id FROM categories WHERE name = 'ARCHITECTURE'), 'CLEAN_CODE', '클린 코드', 4);
```

### 1.12 카테고리 자동 생성/매핑 함수

```sql
-- 카테고리명으로 ID 조회 또는 새로 생성하는 함수
CREATE OR REPLACE FUNCTION get_or_create_category(
  p_category_name TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
  v_display TEXT;
BEGIN
  -- 기존 카테고리 검색
  SELECT id INTO v_category_id
  FROM categories
  WHERE UPPER(name) = UPPER(p_category_name);

  -- 없으면 새로 생성
  IF v_category_id IS NULL THEN
    v_display := COALESCE(p_display_name, p_category_name);

    INSERT INTO categories (name, display_name, sort_order)
    VALUES (UPPER(p_category_name), v_display, 99)
    RETURNING id INTO v_category_id;
  END IF;

  RETURN v_category_id;
END;
$$;

-- 소분류명으로 ID 조회 또는 새로 생성하는 함수
CREATE OR REPLACE FUNCTION get_or_create_subcategory(
  p_category_id UUID,
  p_subcategory_name TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_subcategory_id UUID;
  v_display TEXT;
BEGIN
  -- 기존 소분류 검색
  SELECT id INTO v_subcategory_id
  FROM subcategories
  WHERE category_id = p_category_id
    AND UPPER(name) = UPPER(p_subcategory_name);

  -- 없으면 새로 생성
  IF v_subcategory_id IS NULL THEN
    v_display := COALESCE(p_display_name, p_subcategory_name);

    INSERT INTO subcategories (category_id, name, display_name, sort_order)
    VALUES (p_category_id, UPPER(p_subcategory_name), v_display, 99)
    RETURNING id INTO v_subcategory_id;
  END IF;

  RETURN v_subcategory_id;
END;
$$;

-- 카테고리 + 소분류를 한번에 처리하는 편의 함수
CREATE OR REPLACE FUNCTION resolve_category_ids(
  p_category_name TEXT,
  p_subcategory_name TEXT DEFAULT NULL
)
RETURNS TABLE (category_id UUID, subcategory_id UUID)
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
  v_subcategory_id UUID;
BEGIN
  -- 대분류 처리
  v_category_id := get_or_create_category(p_category_name);

  -- 소분류 처리 (있는 경우에만)
  IF p_subcategory_name IS NOT NULL AND p_subcategory_name != '' THEN
    v_subcategory_id := get_or_create_subcategory(v_category_id, p_subcategory_name);
  END IF;

  RETURN QUERY SELECT v_category_id, v_subcategory_id;
END;
$$;
```

### 1.13 초기 질문 데이터 (100개)

```sql
-- ================================================
-- FRONTEND - JavaScript (15개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'FRONTEND'),
  (SELECT id FROM subcategories WHERE name = 'JAVASCRIPT'),
  q.difficulty, TRUE
FROM (VALUES
  ('var, let, const의 차이점에 대해 설명해주세요.', '스코프, 호이스팅, 재선언/재할당 가능 여부', 'EASY'),
  ('호이스팅(Hoisting)이란 무엇인가요?', '변수/함수 선언이 스코프 최상단으로 끌어올려지는 현상', 'EASY'),
  ('클로저(Closure)란 무엇이며 어떤 상황에서 사용하나요?', '외부 함수 변수에 접근 가능한 내부 함수, 은닉화, 상태 유지', 'MEDIUM'),
  ('this 키워드의 동작 방식에 대해 설명해주세요.', '호출 방식에 따른 this 바인딩, call/apply/bind', 'MEDIUM'),
  ('프로토타입(Prototype)이란 무엇인가요?', '상속 구현, __proto__, prototype chain', 'MEDIUM'),
  ('이벤트 버블링과 캡처링의 차이점은 무엇인가요?', '이벤트 전파 방향, stopPropagation, event delegation', 'MEDIUM'),
  ('Promise와 async/await의 차이점은 무엇인가요?', '비동기 처리, 가독성, 에러 핸들링', 'MEDIUM'),
  ('이벤트 루프(Event Loop)에 대해 설명해주세요.', 'Call Stack, Task Queue, Microtask Queue', 'HARD'),
  ('JavaScript에서 메모리 관리는 어떻게 이루어지나요?', '가비지 컬렉션, Mark-and-Sweep, 메모리 누수', 'HARD'),
  ('실행 컨텍스트(Execution Context)란 무엇인가요?', 'Variable Environment, Lexical Environment, this binding', 'HARD'),
  ('debounce와 throttle의 차이점은 무엇인가요?', '함수 호출 빈도 제어, 검색창 자동완성, 스크롤 이벤트', 'MEDIUM'),
  ('JavaScript의 깊은 복사와 얕은 복사의 차이점은?', '참조 타입, spread 연산자, JSON.parse/stringify, structuredClone', 'MEDIUM'),
  ('JavaScript의 Map과 Object의 차이점은 무엇인가요?', '키 타입, 순서 보장, 성능, 메서드', 'MEDIUM'),
  ('WeakMap과 WeakSet은 무엇이며 언제 사용하나요?', '약한 참조, 가비지 컬렉션, private 데이터', 'HARD'),
  ('JavaScript 모듈 시스템(CommonJS vs ES Modules)을 비교해주세요.', 'require vs import, 동기/비동기 로딩, tree shaking', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- FRONTEND - React (15개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'FRONTEND'),
  (SELECT id FROM subcategories WHERE name = 'REACT'),
  q.difficulty, TRUE
FROM (VALUES
  ('Virtual DOM이란 무엇이며 어떻게 동작하나요?', 'Reconciliation, Diffing Algorithm, 성능 최적화', 'MEDIUM'),
  ('React의 생명주기(Lifecycle)에 대해 설명해주세요.', 'Mount, Update, Unmount, useEffect', 'MEDIUM'),
  ('useState와 useReducer의 차이점은 무엇인가요?', '상태 관리 복잡도, 액션 기반, 디버깅', 'MEDIUM'),
  ('useEffect의 의존성 배열은 어떻게 동작하나요?', '빈 배열, 특정 값, cleanup 함수', 'MEDIUM'),
  ('useMemo와 useCallback의 차이점은 무엇인가요?', '메모이제이션, 값 vs 함수, 참조 동일성', 'MEDIUM'),
  ('React에서 key prop이 중요한 이유는 무엇인가요?', '리스트 렌더링, Reconciliation, 성능 최적화', 'EASY'),
  ('Context API와 Redux의 차이점은 무엇인가요?', '전역 상태 관리, 미들웨어, DevTools, 규모', 'MEDIUM'),
  ('React에서 불변성을 유지해야 하는 이유는 무엇인가요?', '상태 변경 감지, 성능 최적화, 예측 가능성', 'MEDIUM'),
  ('Controlled Component와 Uncontrolled Component의 차이점은?', 'React에서 값 관리, ref, form 처리', 'MEDIUM'),
  ('React의 Strict Mode는 무엇을 하나요?', '잠재적 문제 감지, 두 번 렌더링, 부작용 검사', 'EASY'),
  ('React에서 에러 바운더리(Error Boundary)란 무엇인가요?', 'componentDidCatch, 에러 UI, 클래스 컴포넌트', 'MEDIUM'),
  ('Server-Side Rendering(SSR)과 Client-Side Rendering(CSR)의 차이점은?', 'SEO, 초기 로딩, hydration, Next.js', 'HARD'),
  ('React 18의 주요 변경사항에 대해 설명해주세요.', 'Concurrent Mode, Suspense, Automatic Batching, useTransition', 'HARD'),
  ('Custom Hook을 만들어 본 경험이 있나요? 어떤 상황에서 사용하나요?', '로직 재사용, 관심사 분리, 테스트 용이성', 'MEDIUM'),
  ('React에서 성능 최적화 방법들을 설명해주세요.', 'React.memo, useMemo, useCallback, 코드 스플리팅, lazy loading', 'HARD')
) AS q(content, hint, difficulty);

-- ================================================
-- FRONTEND - HTML/CSS (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'FRONTEND'),
  (SELECT id FROM subcategories WHERE name = 'HTML_CSS'),
  q.difficulty, TRUE
FROM (VALUES
  ('시맨틱 HTML이란 무엇이며 왜 중요한가요?', '접근성, SEO, 유지보수성, header/nav/main/footer', 'EASY'),
  ('CSS Box Model에 대해 설명해주세요.', 'content, padding, border, margin, box-sizing', 'EASY'),
  ('Flexbox와 Grid의 차이점은 무엇인가요?', '1차원 vs 2차원, 사용 사례, 브라우저 지원', 'MEDIUM'),
  ('CSS 선택자 우선순위(Specificity)는 어떻게 계산되나요?', 'inline, id, class, element, !important', 'MEDIUM'),
  ('반응형 웹 디자인을 구현하는 방법들을 설명해주세요.', 'media query, viewport, rem/em, mobile-first', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- FRONTEND - 브라우저/성능 (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'FRONTEND'),
  (SELECT id FROM subcategories WHERE name = 'BROWSER'),
  q.difficulty, TRUE
FROM (VALUES
  ('브라우저 렌더링 과정에 대해 설명해주세요.', 'DOM Tree, CSSOM, Render Tree, Layout, Paint, Composite', 'HARD'),
  ('Reflow와 Repaint의 차이점은 무엇인가요?', '레이아웃 변경, 스타일 변경, 성능 영향', 'MEDIUM'),
  ('Critical Rendering Path 최적화 방법을 설명해주세요.', 'CSS/JS 위치, async/defer, 리소스 최소화', 'HARD'),
  ('LocalStorage, SessionStorage, Cookie의 차이점은?', '용량, 만료, 서버 전송 여부, 사용 사례', 'EASY'),
  ('CORS란 무엇이며 어떻게 해결하나요?', 'Same-Origin Policy, preflight, Access-Control-Allow-Origin', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- BACKEND - Node.js (10개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'BACKEND'),
  (SELECT id FROM subcategories WHERE name = 'NODEJS'),
  q.difficulty, TRUE
FROM (VALUES
  ('Node.js의 이벤트 루프에 대해 설명해주세요.', 'Single Thread, Non-blocking I/O, libuv, phases', 'HARD'),
  ('Node.js에서 비동기 처리는 어떻게 이루어지나요?', 'callback, Promise, async/await, Worker Threads', 'MEDIUM'),
  ('Express.js의 미들웨어란 무엇인가요?', 'req, res, next, 체이닝, 에러 핸들링 미들웨어', 'MEDIUM'),
  ('Node.js의 스트림(Stream)이란 무엇인가요?', 'Readable, Writable, Duplex, Transform, 대용량 처리', 'HARD'),
  ('Node.js에서 클러스터링(Clustering)이란?', '멀티 프로세스, PM2, 로드 밸런싱', 'HARD'),
  ('package.json의 dependencies와 devDependencies 차이는?', '프로덕션 의존성, 개발 의존성, npm install --production', 'EASY'),
  ('Node.js의 Buffer란 무엇인가요?', '바이너리 데이터, 메모리 할당, 인코딩', 'MEDIUM'),
  ('NPM과 Yarn의 차이점은 무엇인가요?', '속도, 보안, lock file, 워크스페이스', 'EASY'),
  ('Node.js에서 환경 변수를 관리하는 방법은?', 'dotenv, process.env, 보안, 환경별 설정', 'EASY'),
  ('REST API 설계 원칙에 대해 설명해주세요.', 'Stateless, URI 설계, HTTP 메서드, 응답 코드', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- BACKEND - 인증/인가 (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'BACKEND'),
  (SELECT id FROM subcategories WHERE name = 'AUTH'),
  q.difficulty, TRUE
FROM (VALUES
  ('JWT(JSON Web Token)의 구조와 동작 방식을 설명해주세요.', 'Header, Payload, Signature, 장단점', 'MEDIUM'),
  ('세션 기반 인증과 토큰 기반 인증의 차이점은?', '서버 부하, 확장성, 보안, stateless', 'MEDIUM'),
  ('OAuth 2.0의 동작 방식에 대해 설명해주세요.', 'Authorization Code, Access Token, Refresh Token', 'HARD'),
  ('XSS와 CSRF 공격은 무엇이며 어떻게 방어하나요?', '스크립트 삽입, 토큰 검증, 쿠키 설정, sanitize', 'HARD'),
  ('비밀번호는 어떻게 안전하게 저장해야 하나요?', 'bcrypt, salt, hash, 단방향 암호화', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- DATABASE - SQL (10개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'DATABASE'),
  (SELECT id FROM subcategories WHERE name = 'SQL'),
  q.difficulty, TRUE
FROM (VALUES
  ('INNER JOIN과 OUTER JOIN의 차이점은 무엇인가요?', 'LEFT/RIGHT/FULL OUTER, 교집합 vs 합집합', 'EASY'),
  ('인덱스(Index)란 무엇이며 언제 사용해야 하나요?', 'B-Tree, 조회 성능, 쓰기 성능, 복합 인덱스', 'MEDIUM'),
  ('정규화란 무엇이며 왜 필요한가요?', '데이터 중복 제거, 1NF~3NF, 이상현상 방지', 'MEDIUM'),
  ('트랜잭션의 ACID 속성에 대해 설명해주세요.', '원자성, 일관성, 격리성, 지속성', 'MEDIUM'),
  ('데드락(Deadlock)이란 무엇이며 어떻게 해결하나요?', '상호 배제, 점유와 대기, 순환 대기, 타임아웃', 'HARD'),
  ('GROUP BY와 HAVING의 차이점은 무엇인가요?', '그룹화, 집계 함수, WHERE vs HAVING', 'EASY'),
  ('서브쿼리와 JOIN의 차이점은 무엇인가요?', '성능, 가독성, 사용 사례', 'MEDIUM'),
  ('EXPLAIN을 사용한 쿼리 실행 계획 분석 방법을 설명해주세요.', 'type, key, rows, Extra, 최적화', 'HARD'),
  ('N+1 문제란 무엇이며 어떻게 해결하나요?', 'ORM, Eager Loading, JOIN, batch query', 'MEDIUM'),
  ('파티셔닝과 샤딩의 차이점은 무엇인가요?', '수직/수평 분할, 분산 데이터베이스, 확장성', 'HARD')
) AS q(content, hint, difficulty);

-- ================================================
-- DATABASE - NoSQL (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'DATABASE'),
  (SELECT id FROM subcategories WHERE name = 'NOSQL'),
  q.difficulty, TRUE
FROM (VALUES
  ('RDBMS와 NoSQL의 차이점은 무엇인가요?', '스키마, 확장성, ACID vs BASE, 사용 사례', 'MEDIUM'),
  ('MongoDB의 특징과 사용 사례를 설명해주세요.', 'Document 기반, 스키마리스, 수평적 확장', 'MEDIUM'),
  ('Redis는 무엇이며 어떤 상황에서 사용하나요?', '인메모리, 캐싱, 세션 저장, Pub/Sub', 'MEDIUM'),
  ('CAP 정리란 무엇인가요?', 'Consistency, Availability, Partition Tolerance', 'HARD'),
  ('NoSQL 데이터 모델링 시 고려해야 할 점은?', '데이터 중복, 쿼리 패턴, 비정규화', 'HARD')
) AS q(content, hint, difficulty);

-- ================================================
-- NETWORK - HTTP (10개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'NETWORK'),
  (SELECT id FROM subcategories WHERE name = 'HTTP'),
  q.difficulty, TRUE
FROM (VALUES
  ('HTTP와 HTTPS의 차이점은 무엇인가요?', 'SSL/TLS, 암호화, 포트, 인증서', 'EASY'),
  ('HTTP 메서드(GET, POST, PUT, DELETE)의 차이점은?', 'CRUD 매핑, 멱등성, 안전성', 'EASY'),
  ('HTTP 상태 코드의 종류와 의미를 설명해주세요.', '2xx, 3xx, 4xx, 5xx, 주요 코드', 'EASY'),
  ('REST와 RESTful API의 차이점은 무엇인가요?', '아키텍처 스타일, 제약 조건, 성숙도 모델', 'MEDIUM'),
  ('HTTP/1.1과 HTTP/2의 차이점은 무엇인가요?', '멀티플렉싱, 헤더 압축, 서버 푸시, 바이너리', 'HARD'),
  ('쿠키와 세션의 차이점은 무엇인가요?', '저장 위치, 보안, 생명주기, 용도', 'EASY'),
  ('웹 브라우저에 URL을 입력하면 어떤 일이 일어나나요?', 'DNS, TCP 연결, HTTP 요청/응답, 렌더링', 'MEDIUM'),
  ('CDN이란 무엇이며 어떤 이점이 있나요?', '콘텐츠 분산, 지연 시간 감소, 가용성', 'MEDIUM'),
  ('캐시(Cache)의 종류와 Cache-Control 헤더에 대해 설명해주세요.', '브라우저/서버 캐시, max-age, no-cache, ETag', 'MEDIUM'),
  ('WebSocket이란 무엇이며 HTTP와 어떻게 다른가요?', '양방향 통신, 실시간, 핸드셰이크, 사용 사례', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- NETWORK - TCP/IP (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'NETWORK'),
  (SELECT id FROM subcategories WHERE name = 'TCP_IP'),
  q.difficulty, TRUE
FROM (VALUES
  ('TCP와 UDP의 차이점은 무엇인가요?', '연결 지향, 신뢰성, 속도, 사용 사례', 'MEDIUM'),
  ('TCP 3-way Handshake에 대해 설명해주세요.', 'SYN, SYN-ACK, ACK, 연결 설정 과정', 'MEDIUM'),
  ('OSI 7계층과 TCP/IP 4계층을 비교해주세요.', '각 계층의 역할, 프로토콜, 차이점', 'MEDIUM'),
  ('IP 주소와 MAC 주소의 차이점은 무엇인가요?', '논리적/물리적 주소, ARP, 용도', 'MEDIUM'),
  ('DNS의 동작 과정을 설명해주세요.', '재귀/반복 쿼리, 캐싱, 루트 서버', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- CS - 자료구조 (10개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'CS'),
  (SELECT id FROM subcategories WHERE name = 'DATA_STRUCTURE'),
  q.difficulty, TRUE
FROM (VALUES
  ('배열(Array)과 연결 리스트(Linked List)의 차이점은?', '메모리 구조, 삽입/삭제/조회 시간복잡도', 'EASY'),
  ('스택(Stack)과 큐(Queue)의 차이점은 무엇인가요?', 'LIFO vs FIFO, 사용 사례', 'EASY'),
  ('해시 테이블(Hash Table)의 동작 원리를 설명해주세요.', '해시 함수, 충돌 해결, 시간복잡도', 'MEDIUM'),
  ('이진 탐색 트리(BST)란 무엇인가요?', '왼쪽/오른쪽 서브트리, 탐색/삽입/삭제', 'MEDIUM'),
  ('힙(Heap) 자료구조에 대해 설명해주세요.', '최대힙/최소힙, 우선순위 큐, heapify', 'MEDIUM'),
  ('그래프의 표현 방법과 탐색 알고리즘을 설명해주세요.', '인접 행렬/리스트, BFS, DFS', 'MEDIUM'),
  ('트라이(Trie) 자료구조란 무엇인가요?', '문자열 검색, 접두사, 자동완성', 'HARD'),
  ('Red-Black 트리의 특징을 설명해주세요.', '균형 이진 탐색 트리, 회전, 색상 규칙', 'HARD'),
  ('LRU 캐시를 구현하는 방법을 설명해주세요.', 'HashMap + Doubly Linked List, O(1) 연산', 'HARD'),
  ('B-Tree와 B+Tree의 차이점은 무엇인가요?', '데이터베이스 인덱스, 리프 노드, 범위 쿼리', 'HARD')
) AS q(content, hint, difficulty);

-- ================================================
-- CS - 알고리즘 (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'CS'),
  (SELECT id FROM subcategories WHERE name = 'ALGORITHM'),
  q.difficulty, TRUE
FROM (VALUES
  ('시간 복잡도와 공간 복잡도란 무엇인가요?', 'Big O 표기법, 최선/평균/최악의 경우', 'EASY'),
  ('정렬 알고리즘들의 특징과 시간복잡도를 비교해주세요.', '버블, 선택, 삽입, 퀵, 병합, 힙 정렬', 'MEDIUM'),
  ('이진 탐색(Binary Search)의 원리와 시간복잡도는?', '정렬된 배열, O(log n), 분할 정복', 'EASY'),
  ('동적 프로그래밍(DP)이란 무엇인가요?', '메모이제이션, 타뷸레이션, 최적 부분 구조', 'HARD'),
  ('그리디 알고리즘과 동적 프로그래밍의 차이점은?', '지역 최적 vs 전역 최적, 사용 조건', 'HARD')
) AS q(content, hint, difficulty);

-- ================================================
-- DEVOPS - Docker/CI/CD (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'DEVOPS'),
  (SELECT id FROM subcategories WHERE name = 'DOCKER'),
  q.difficulty, TRUE
FROM (VALUES
  ('Docker란 무엇이며 가상머신과 어떻게 다른가요?', '컨테이너, 이미지, 레이어, 격리', 'MEDIUM'),
  ('Docker 이미지와 컨테이너의 차이점은 무엇인가요?', '불변성, 실행 인스턴스, 레이어 구조', 'EASY'),
  ('Dockerfile의 주요 명령어들을 설명해주세요.', 'FROM, RUN, COPY, CMD, ENTRYPOINT', 'MEDIUM'),
  ('CI/CD란 무엇이며 왜 필요한가요?', '지속적 통합/배포, 자동화, 품질 보장', 'MEDIUM'),
  ('Docker Compose는 무엇이며 언제 사용하나요?', '멀티 컨테이너, yaml 설정, 의존성 관리', 'MEDIUM')
) AS q(content, hint, difficulty);

-- ================================================
-- ARCHITECTURE - 시스템 설계 (5개)
-- ================================================
INSERT INTO questions (content, content_normalized, hint, category_id, subcategory_id, difficulty, is_verified)
SELECT
  q.content, LOWER(q.content), q.hint,
  (SELECT id FROM categories WHERE name = 'ARCHITECTURE'),
  (SELECT id FROM subcategories WHERE name = 'SYSTEM_DESIGN'),
  q.difficulty, TRUE
FROM (VALUES
  ('모놀리식과 마이크로서비스 아키텍처의 차이점은?', '확장성, 복잡성, 배포, 장단점', 'MEDIUM'),
  ('로드 밸런싱이란 무엇이며 어떤 알고리즘이 있나요?', 'Round Robin, Least Connections, 확장성', 'MEDIUM'),
  ('메시지 큐(Message Queue)란 무엇이며 언제 사용하나요?', '비동기 처리, 디커플링, Kafka, RabbitMQ', 'HARD'),
  ('Scale Up과 Scale Out의 차이점은 무엇인가요?', '수직/수평 확장, 비용, 한계점', 'EASY'),
  ('API Gateway의 역할과 장점을 설명해주세요.', '라우팅, 인증, 로드밸런싱, 모니터링', 'MEDIUM')
) AS q(content, hint, difficulty);
```

---

## 2. API 엔드포인트

### 2.1 인증 API

#### 토큰 설정

```typescript
// JWT 설정
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES: "15m", // Access Token: 15분
  REFRESH_TOKEN_EXPIRES: "7d", // Refresh Token: 7일
  JWT_SECRET: process.env.JWT_SECRET,
  BCRYPT_SALT_ROUNDS: 12,
};

// Access Token Payload
interface AccessTokenPayload {
  sub: string; // user_id
  email: string;
  iat: number; // issued at
  exp: number; // expiration
  type: "access";
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string; // user_id
  jti: string; // token id (DB의 refresh_tokens.id)
  iat: number;
  exp: number;
  type: "refresh";
}
```

#### `POST /api/auth/signup`

간편 회원가입 (이메일/비밀번호)

```typescript
// Request
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "nickname": "개발자"  // 선택사항
}

// Validation Rules:
// - email: 유효한 이메일 형식, 중복 불가
// - password: 최소 8자, 영문+숫자+특수문자 조합 권장
// - nickname: 최대 20자

// Process:
// 1. 이메일 중복 확인
// 2. 비밀번호 bcrypt 해시 (salt rounds: 12)
// 3. users 테이블에 저장
// 4. Access Token + Refresh Token 생성
// 5. Refresh Token DB 저장

// Response (성공: 201)
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "개발자",
    "avatar_url": null,
    "created_at": "timestamp"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900  // 15분 (초)
  }
}

// Response (실패: 400)
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "이미 가입된 이메일입니다."
}
```

#### `POST /api/auth/login`

로그인 (이메일/비밀번호)

```typescript
// Request
{
  "email": "user@example.com",
  "password": "securePassword123!"
}

// Process:
// 1. 이메일로 사용자 조회
// 2. bcrypt.compare로 비밀번호 검증
// 3. Access Token + Refresh Token 생성
// 4. Refresh Token DB 저장 (기존 토큰 유지 또는 교체)

// Response (성공: 200)
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "개발자",
    "avatar_url": null
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}

// Response (실패: 401)
{
  "error": "INVALID_CREDENTIALS",
  "message": "이메일 또는 비밀번호가 올바르지 않습니다."
}
```

#### `POST /api/auth/refresh`

토큰 갱신

```typescript
// Request
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

// Process:
// 1. Refresh Token 유효성 검증 (JWT verify)
// 2. DB에서 토큰 존재 여부 확인 (revoked_at이 null인지)
// 3. 토큰 만료 시간 확인
// 4. 새 Access Token 발급
// 5. (선택) Refresh Token Rotation: 새 Refresh Token 발급 및 기존 토큰 revoke

// Response (성공: 200)
{
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",  // Rotation 적용 시 새 토큰
    "token_type": "Bearer",
    "expires_in": 900
  }
}

// Response (실패: 401)
{
  "error": "INVALID_REFRESH_TOKEN",
  "message": "유효하지 않거나 만료된 토큰입니다."
}
```

#### `POST /api/auth/logout`

로그아웃

```typescript
// Request Header
Authorization: Bearer {access_token}

// Request Body (선택)
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."  // 해당 토큰만 무효화
  // 없으면 해당 사용자의 모든 refresh token 무효화
}

// Process:
// 1. Access Token 검증
// 2. Refresh Token revoke (revoked_at 업데이트)

// Response (성공: 200)
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

#### `POST /api/auth/logout-all`

모든 기기에서 로그아웃

```typescript
// Request Header
Authorization: Bearer {access_token}

// Process:
// 1. 해당 사용자의 모든 refresh_tokens revoke

// Response (성공: 200)
{
  "success": true,
  "message": "모든 기기에서 로그아웃 되었습니다.",
  "revoked_count": 3
}
```

#### `GET /api/auth/me`

현재 사용자 정보

```typescript
// Request Header
Authorization: Bearer {access_token}

// Response (성공: 200)
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "개발자",
  "avatar_url": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}

// Response (실패: 401)
{
  "error": "UNAUTHORIZED",
  "message": "로그인이 필요합니다."
}

// Response (실패: 401 - 토큰 만료)
{
  "error": "TOKEN_EXPIRED",
  "message": "토큰이 만료되었습니다. 토큰을 갱신해주세요."
}
```

#### `PATCH /api/auth/me`

사용자 정보 수정

```typescript
// Request Header
Authorization: Bearer {access_token}

// Request
{
  "nickname": "새로운닉네임",
  "avatar_url": "https://..."
}

// Response (성공: 200)
{
  "id": "uuid",
  "email": "user@example.com",
  "nickname": "새로운닉네임",
  "avatar_url": "https://...",
  "updated_at": "timestamp"
}
```

#### `POST /api/auth/change-password`

비밀번호 변경

```typescript
// Request Header
Authorization: Bearer {access_token}

// Request
{
  "current_password": "currentPassword123!",
  "new_password": "newSecurePassword456!"
}

// Process:
// 1. 현재 비밀번호 검증
// 2. 새 비밀번호 해시 후 저장
// 3. 모든 refresh token 무효화 (선택)

// Response (성공: 200)
{
  "success": true,
  "message": "비밀번호가 변경되었습니다."
}
```

#### 인증 미들웨어

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function authMiddleware(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as AccessTokenPayload;

    if (payload.type !== "access") {
      throw new Error("Invalid token type");
    }

    // request에 user 정보 추가
    return { userId: payload.sub, email: payload.email };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { error: "TOKEN_EXPIRED", message: "토큰이 만료되었습니다." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "INVALID_TOKEN", message: "유효하지 않은 토큰입니다." },
      { status: 401 },
    );
  }
}
```

---

### 2.2 질문 생성 API

#### `POST /api/questions/generate`

자연어로 기술면접 질문 생성

```typescript
// Request
{
  "prompt": "프론트엔드 3년차 개발자를 위한 기술면접"
}

// Process Flow:
// 1. Claude API로 질문 5개 생성
// 2. 각 질문에 대해 embedding 생성
// 3. Vector DB에서 유사 질문 검색 (cosine similarity > 0.9)
// 4. 유사 질문 있으면 기존 질문 사용, 없으면 새 질문 DB 저장
// 5. 최종 질문 리스트 반환

// Response
{
  "questions": [
    {
      "id": "uuid",
      "content": "React의 Virtual DOM에 대해 설명해주세요.",
      "hint": "Reconciliation, Diffing Algorithm 키워드 활용",
      "category": "React",
      "favorite_count": 42,
      "is_existing": true // 기존 DB 질문 여부
    },
    // ... 4개 더
  ],
  "session_id": "uuid" // 생성된 세션 ID
}
```

#### `GET /api/questions/search`

질문 검색 (Vector 유사도 검색)

```typescript
// Request Query
?query=Virtual DOM&limit=10

// Response
{
  "questions": [
    {
      "id": "uuid",
      "content": "string",
      "hint": "string",
      "category": "string",
      "favorite_count": 0,
      "similarity": 0.95
    }
  ]
}
```

#### `GET /api/questions/:id`

단일 질문 조회

```typescript
// Response
{
  "id": "uuid",
  "content": "string",
  "hint": "string",
  "category": "string",
  "favorite_count": 0,
  "is_favorited": true, // 현재 사용자가 찜했는지
  "created_at": "timestamp"
}
```

---

### 2.3 면접 세션 API

#### `POST /api/sessions`

새 면접 세션 생성

```typescript
// Request
{
  "query": "프론트엔드 3년차 개발자",
  "question_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"]
}

// Response
{
  "id": "uuid",
  "query": "string",
  "questions": [...],
  "created_at": "timestamp"
}
```

#### `GET /api/sessions`

내 면접 세션 목록

```typescript
// Request Query
?page=1&limit=10

// Response
{
  "sessions": [
    {
      "id": "uuid",
      "query": "프론트엔드 3년차 개발자",
      "total_time": 720,
      "is_completed": true,
      "question_count": 5,
      "answered_count": 5,
      "created_at": "timestamp"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### `GET /api/sessions/:id`

세션 상세 조회

```typescript
// Response
{
  "id": "uuid",
  "query": "string",
  "total_time": 720,
  "is_completed": true,
  "questions": [
    {
      "id": "uuid",
      "content": "string",
      "hint": "string",
      "category": "string",
      "answer": {
        "content": "string",
        "time_spent": 180,
        "ai_score": 8.5,
        "ai_feedback": "string"
      },
      "is_favorited": true
    }
  ],
  "created_at": "timestamp"
}
```

#### `PATCH /api/sessions/:id/complete`

세션 완료 처리

```typescript
// Request
{
  "total_time": 720
}

// Response
{
  "id": "uuid",
  "is_completed": true,
  "completed_at": "timestamp"
}
```

---

### 2.4 답변 API

#### `POST /api/answers`

답변 저장

```typescript
// Request
{
  "session_id": "uuid",
  "question_id": "uuid",
  "content": "Virtual DOM은 실제 DOM의 가상 복사본으로...",
  "time_spent": 165,
  "is_public": false
}

// Response
{
  "id": "uuid",
  "content": "string",
  "time_spent": 165,
  "is_public": false,
  "created_at": "timestamp"
}
```

#### `PATCH /api/answers/:id`

답변 수정

```typescript
// Request
{
  "content": "수정된 답변 내용",
  "is_public": true
}

// Response
{
  "id": "uuid",
  "content": "string",
  "is_public": true,
  "updated_at": "timestamp"
}
```

#### `POST /api/answers/:id/score`

AI 답변 평가 요청

```typescript
// Request
// (body 없음, 기존 답변 기반으로 평가)

// Process:
// 1. 답변 조회
// 2. Claude API로 평가 요청
// 3. 점수(1.0~10.0) + 피드백 저장

// Response
{
  "ai_score": 8.5,
  "ai_feedback": "Virtual DOM의 핵심 개념을 잘 설명했습니다. Reconciliation 과정에 대한 설명을 추가하면 더 완벽할 것입니다."
}
```

#### `GET /api/questions/:questionId/answers`

다른 사람 답변 둘러보기

```typescript
// Request Query
?page=1&limit=10&sort=score|recent

// Response
{
  "answers": [
    {
      "id": "uuid",
      "content": "string",
      "ai_score": 9.2,
      "user": {
        "id": "uuid",
        "nickname": "string",
        "avatar_url": "string"
      },
      "created_at": "timestamp"
    }
  ],
  "total": 50,
  "page": 1
}
```

---

### 2.5 찜(Favorites) API

#### `POST /api/favorites`

질문 찜하기

```typescript
// Request
{
  "question_id": "uuid"
}

// Response
{
  "id": "uuid",
  "question_id": "uuid",
  "created_at": "timestamp"
}
```

#### `DELETE /api/favorites/:questionId`

찜 취소

```typescript
// Response
{ "success": true }
```

#### `GET /api/favorites`

찜한 질문 목록

```typescript
// Request Query
?page=1&limit=20

// Response
{
  "favorites": [
    {
      "id": "uuid",
      "question": {
        "id": "uuid",
        "content": "string",
        "hint": "string",
        "category": "string",
        "favorite_count": 42
      },
      "my_answer": { // 내가 작성한 답변 (있을 경우)
        "content": "string",
        "ai_score": 8.0
      },
      "created_at": "timestamp"
    }
  ],
  "total": 15
}
```

#### `POST /api/favorites/answer`

찜한 질문에 답변 등록

```typescript
// Request
{
  "question_id": "uuid",
  "content": "새로운 답변 내용...",
  "is_public": true
}

// Response
{
  "id": "uuid",
  "question_id": "uuid",
  "content": "string",
  "is_public": true,
  "created_at": "timestamp"
}
```

---

## 3. Claude API 통합

### 3.1 질문 생성 프롬프트

```typescript
const GENERATE_QUESTIONS_PROMPT = `
당신은 개발자 기술면접 전문가입니다.
사용자의 요청에 맞는 기술면접 질문 5개를 생성해주세요.

요청: {user_prompt}

다음 JSON 형식으로 응답해주세요:
{
  "questions": [
    {
      "content": "질문 내용",
      "hint": "답변 시 참고할 키워드 가이드",
      "category": "카테고리명"
    }
  ]
}

카테고리 예시: React, JavaScript, TypeScript, CSS, 웹 성능, 네트워크, 자료구조, 알고리즘, 데이터베이스, 시스템 설계 등
`;
```

### 3.2 답변 평가 프롬프트

```typescript
const EVALUATE_ANSWER_PROMPT = `
당신은 기술면접 평가 전문가입니다.
다음 질문에 대한 답변을 평가해주세요.

질문: {question}
힌트: {hint}
답변: {answer}

평가 기준:
1. 정확성 (30%): 기술적으로 정확한 내용인가
2. 완성도 (25%): 핵심 개념을 충분히 설명했는가
3. 구조성 (20%): 논리적으로 잘 구성되었는가
4. 실무 연관성 (15%): 실제 업무와 연관지어 설명했는가
5. 커뮤니케이션 (10%): 명확하고 이해하기 쉽게 설명했는가

다음 JSON 형식으로 응답해주세요:
{
  "score": 8.5, // 1.0 ~ 10.0, 소수점 첫째자리까지
  "feedback": "상세한 피드백 내용"
}
`;
```

### 3.3 Embedding 생성

```typescript
// Claude Embedding API 또는 대안 (voyage-3)
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await voyageClient.embed({
    input: text,
    model: "voyage-3",
  });
  return response.embeddings[0];
}
```

### 3.4 힌트 자동 생성

질문에 힌트가 없는 경우(신규 생성된 질문) Claude API를 통해 키워드 기반 힌트를 자동 생성하고 DB에 저장합니다.
힌트가 이미 존재하면 DB의 힌트를 사용하여 AI 모델 호출을 최소화합니다.

#### 3.4.1 힌트 생성 프롬프트

```typescript
const GENERATE_HINT_PROMPT = `
당신은 개발자 기술면접 전문가입니다.
다음 기술면접 질문에 대해 답변할 때 포함하면 좋은 핵심 키워드들을 제시해주세요.

질문: {question}
카테고리: {category}
소분류: {subcategory}

다음 조건을 지켜주세요:
1. 4~6개의 핵심 키워드를 쉼표로 구분하여 나열
2. 키워드는 답변에 꼭 포함되어야 할 기술 용어나 개념
3. 마지막에 "를 포함해보세요"로 끝나는 문장 형태로 작성
4. 친근하고 도움이 되는 톤 유지

예시 응답:
"HTTP 메서드, 상태 코드, 리소스 네이밍, HATEOAS를 포함해보세요"
"Virtual DOM, Reconciliation, Diffing 알고리즘, 배치 업데이트를 포함해보세요"
"인덱스, 실행 계획, 정규화, 트랜잭션 격리 수준을 포함해보세요"

JSON 형식으로 응답해주세요:
{
  "hint": "키워드1, 키워드2, 키워드3, 키워드4를 포함해보세요"
}
`;
```

#### 3.4.2 힌트 조회/생성 로직

```typescript
// lib/hint-generator.ts

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Question {
  id: string;
  content: string;
  hint: string | null;
  category_id: string;
  subcategory_id: string;
}

interface CategoryInfo {
  category_name: string;
  subcategory_name: string;
}

/**
 * 질문의 힌트를 조회하거나, 없으면 생성하여 반환
 * @param questionId - 질문 ID
 * @returns 힌트 문자열
 */
async function getOrGenerateHint(questionId: string): Promise<string> {
  // 1. 질문 조회
  const { data: question, error } = await supabase
    .from("questions")
    .select(
      `
      id,
      content,
      hint,
      category_id,
      subcategory_id,
      categories!inner(name),
      subcategories!inner(name)
    `,
    )
    .eq("id", questionId)
    .single();

  if (error || !question) {
    throw new Error("질문을 찾을 수 없습니다.");
  }

  // 2. 힌트가 이미 존재하면 바로 반환 (AI 호출 최소화)
  if (question.hint && question.hint.trim() !== "") {
    return question.hint;
  }

  // 3. 힌트가 없으면 Claude API로 생성
  const categoryName = (question.categories as any)?.name || "기타";
  const subcategoryName = (question.subcategories as any)?.name || "일반";

  const hint = await generateHintWithClaude(
    question.content,
    categoryName,
    subcategoryName,
  );

  // 4. 생성된 힌트를 DB에 저장
  const { error: updateError } = await supabase
    .from("questions")
    .update({ hint })
    .eq("id", questionId);

  if (updateError) {
    console.error("힌트 저장 실패:", updateError);
    // 저장 실패해도 생성된 힌트는 반환
  }

  return hint;
}

/**
 * Claude API를 통해 힌트 생성
 */
async function generateHintWithClaude(
  questionContent: string,
  category: string,
  subcategory: string,
): Promise<string> {
  const prompt = GENERATE_HINT_PROMPT.replace("{question}", questionContent)
    .replace("{category}", category)
    .replace("{subcategory}", subcategory);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // 응답 파싱
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("예상치 못한 응답 형식");
  }

  try {
    const parsed = JSON.parse(content.text);
    return parsed.hint;
  } catch {
    // JSON 파싱 실패 시 텍스트에서 직접 추출 시도
    const match = content.text.match(/"hint":\s*"([^"]+)"/);
    if (match) {
      return match[1];
    }
    // 기본 힌트 반환
    return "핵심 개념과 실제 사용 사례를 포함해보세요";
  }
}

export { getOrGenerateHint, generateHintWithClaude };
```

#### 3.4.3 힌트 API 엔드포인트

```typescript
// app/api/questions/[id]/hint/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateHint } from "@/lib/hint-generator";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 인증 확인 (선택적 - 비회원도 힌트 조회 가능하게 할지 결정)
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      await verifyAccessToken(token);
    }

    const questionId = params.id;
    const hint = await getOrGenerateHint(questionId);

    return NextResponse.json({ hint });
  } catch (error) {
    console.error("힌트 조회/생성 실패:", error);
    return NextResponse.json(
      { error: "힌트를 가져오는데 실패했습니다." },
      { status: 500 },
    );
  }
}
```

#### 3.4.4 배치 힌트 생성 (기존 질문용)

```typescript
// scripts/generate-hints-batch.ts

import { createClient } from "@supabase/supabase-js";
import { generateHintWithClaude } from "@/lib/hint-generator";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * 힌트가 없는 모든 질문에 대해 배치로 힌트 생성
 * Rate limiting을 위해 딜레이 포함
 */
async function generateHintsForAllQuestions() {
  // 힌트가 없는 질문들 조회
  const { data: questions, error } = await supabase
    .from("questions")
    .select(
      `
      id,
      content,
      hint,
      categories!inner(name),
      subcategories!inner(name)
    `,
    )
    .or("hint.is.null,hint.eq.");

  if (error || !questions) {
    console.error("질문 조회 실패:", error);
    return;
  }

  console.log(`힌트 없는 질문 ${questions.length}개 발견`);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const categoryName = (question.categories as any)?.name || "기타";
    const subcategoryName = (question.subcategories as any)?.name || "일반";

    try {
      console.log(
        `[${i + 1}/${questions.length}] 힌트 생성 중: ${question.content.substring(0, 50)}...`,
      );

      const hint = await generateHintWithClaude(
        question.content,
        categoryName,
        subcategoryName,
      );

      // DB 업데이트
      await supabase.from("questions").update({ hint }).eq("id", question.id);

      console.log(`  ✓ 힌트 생성 완료: ${hint}`);

      // Rate limiting: 1초 대기 (Claude API 제한 고려)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ✗ 힌트 생성 실패: ${err}`);
    }
  }

  console.log("배치 힌트 생성 완료");
}

// 실행
generateHintsForAllQuestions();
```

#### 3.4.5 힌트 생성 플로우

```
┌─────────────────────────────────────────────────────────────┐
│                    힌트 조회/생성 플로우                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 클라이언트 요청                                          │
│     GET /api/questions/:id/hint                             │
│                          │                                  │
│                          ▼                                  │
│  2. DB에서 질문 조회                                         │
│     SELECT hint FROM questions WHERE id = :id               │
│                          │                                  │
│                          ▼                                  │
│  3. 힌트 존재 여부 확인                                       │
│     ┌────────────────────┴────────────────────┐            │
│     │                                         │            │
│     ▼ hint != null                   hint == null ▼        │
│  ┌──────────────┐                 ┌──────────────────┐     │
│  │ DB 힌트 반환  │                 │ Claude API 호출   │     │
│  │ (AI 호출 X)  │                 │ 힌트 생성         │     │
│  └──────────────┘                 └────────┬─────────┘     │
│         │                                  │               │
│         │                                  ▼               │
│         │                         ┌──────────────────┐     │
│         │                         │ DB에 힌트 저장    │     │
│         │                         └────────┬─────────┘     │
│         │                                  │               │
│         └──────────────┬───────────────────┘               │
│                        ▼                                   │
│  4. 힌트 반환                                               │
│     { "hint": "키워드1, 키워드2를 포함해보세요" }            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Vector DB 유사도 검색

### 4.1 유사 질문 검색 함수

```sql
-- Supabase RPC Function
CREATE OR REPLACE FUNCTION search_similar_questions(
  query_embedding VECTOR(1024),
  similarity_threshold FLOAT DEFAULT 0.9,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  hint TEXT,
  category TEXT,
  favorite_count INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.content,
    q.hint,
    q.category,
    q.favorite_count,
    1 - (q.embedding <=> query_embedding) AS similarity
  FROM questions q
  WHERE 1 - (q.embedding <=> query_embedding) > similarity_threshold
  ORDER BY q.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 5. 구현 우선순위

### Phase 1: 핵심 기능 (Week 1-2)

1. [ ] Supabase 프로젝트 설정 및 스키마 생성
2. [ ] JWT 기반 인증 구현 (회원가입, 로그인, 토큰 갱신)
3. [ ] Refresh Token 관리 (DB 저장, 무효화)
4. [ ] 질문 생성 API (Claude API 연동)
5. [ ] 답변 저장 API
6. [ ] 기본 세션 관리

### Phase 2: Vector DB (Week 3)

7. [ ] pgvector 설정
8. [ ] Embedding 생성 연동 (voyage-3)
9. [ ] 유사 질문 검색 구현
10. [ ] 질문 중복 제거 로직

### Phase 3: 부가 기능 (Week 4)

11. [ ] 찜 기능 구현 (찜 수 포함)
12. [ ] 다른 사람 답변 둘러보기
13. [ ] 찜한 질문에 답변 등록
14. [ ] AI 답변 평가 (점수 + 피드백)

### Phase 4: 최적화 (Week 5)

15. [ ] RLS 정책 최적화
16. [ ] 인덱스 튜닝
17. [ ] 캐싱 전략
18. [ ] 에러 핸들링

---

## 6. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Voyage (Embedding)
VOYAGE_API_KEY=your_voyage_api_key
```

---

## 7. 타입 정의 (TypeScript)

```typescript
// types/database.ts

export interface User {
  id: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// password_hash 제외한 공개 사용자 정보
export type PublicUser = Omit<User, "password_hash">;

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  revoked_at: string | null;
}

// JWT Payload Types
export interface AccessTokenPayload {
  sub: string; // user_id
  email: string;
  iat: number;
  exp: number;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string; // user_id
  jti: string; // token id
  iat: number;
  exp: number;
  type: "refresh";
}

// Auth Response Types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number; // seconds
}

export interface AuthResponse {
  user: PublicUser;
  tokens: AuthTokens;
}

export interface Question {
  id: string;
  content: string;
  content_normalized: string;
  hint: string | null;
  category: string;
  embedding: number[] | null;
  favorite_count: number;
  created_at: string;
  created_by: string | null;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  query: string;
  total_time: number;
  is_completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  user_id: string;
  content: string;
  time_spent: number;
  ai_score: number | null;
  ai_feedback: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}

// API Response Types
export interface QuestionWithMeta extends Question {
  is_favorited?: boolean;
  similarity?: number;
  is_existing?: boolean;
}

export interface AnswerWithUser extends Answer {
  user: Pick<User, "id" | "nickname" | "avatar_url">;
}

export interface SessionWithQuestions extends InterviewSession {
  questions: (Question & {
    answer?: Answer;
    is_favorited: boolean;
  })[];
}
```

---

## 8. Supabase MCP 활용

```typescript
// Supabase MCP를 통한 데이터 접근
// MCP 서버 설정 후 사용

// 예시: 질문 생성 및 저장
const { data, error } = await supabase
  .from("questions")
  .insert({
    content: question.content,
    content_normalized: normalizeText(question.content),
    hint: question.hint,
    category: question.category,
    embedding: embedding,
    created_by: userId,
  })
  .select()
  .single();

// 예시: Vector 유사도 검색
const { data: similarQuestions } = await supabase.rpc(
  "search_similar_questions",
  {
    query_embedding: embedding,
    similarity_threshold: 0.9,
    match_count: 1,
  },
);
```
