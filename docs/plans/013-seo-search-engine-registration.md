# [#13] Google Search Console 및 네이버 서치 어드바이저 SEO 등록 설정

## Overview

검색엔진(Google, Naver)에 사이트를 등록하여 검색 노출을 시작하기 위한 SEO 기반 설정 작업.
기존에 sitemap, robots.txt, 검증 메타태그가 모두 없는 상태에서 Next.js App Router의 MetadataRoute를 활용하여 자동 생성되도록 구성.

## Requirements

### 기능 요구사항

- FR-1: `/sitemap.xml` 경로로 동적 sitemap 자동 생성
- FR-2: `/robots.txt` 경로로 크롤러 규칙 자동 생성
- FR-3: Google/Naver 검증 메타태그를 환경변수 기반으로 주입
- FR-4: OpenGraph 메타데이터 강화 (locale, url, siteName)

### 기술 요구사항

- TR-1: Next.js App Router의 `MetadataRoute.Sitemap` / `MetadataRoute.Robots` 타입 활용
- TR-2: 환경변수 기반 verification 코드 주입 (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`)

## Implementation Plan

### Phase 1: Core SEO Files

1. `src/app/sitemap.ts` 생성 - 정적 페이지 7개 포함
2. `src/app/robots.ts` 생성 - `/api/`, `/auth/`, `/complete/` 크롤링 차단
3. `src/app/layout.tsx` 메타데이터 보강

---

## Implementation Summary

**Completion Date**: 2026-02-06
**Implemented By**: Claude Opus 4.6

### Changes Made

#### Files Created

- [src/app/sitemap.ts](src/app/sitemap.ts) - Next.js MetadataRoute.Sitemap 기반 동적 sitemap 생성 (7개 정적 페이지)
- [src/app/robots.ts](src/app/robots.ts) - MetadataRoute.Robots 기반 크롤러 규칙 설정

#### Files Modified

- [src/app/layout.tsx](src/app/layout.tsx#L20-L26) - verification 메타태그 (spread 연산자 → 직접 할당 방식으로 수정), OpenGraph 강화, canonical URL, robots 지시자 추가

#### Key Implementation Details

- `sitemap.ts`: 홈(1.0), search(0.9), interview(0.9), archive(0.8), favorites(0.6), auth(0.3), team-spaces/new(0.5) 우선순위 설정
- `robots.ts`: `userAgent: "*"`로 모든 크롤러(Googlebot, Naver Yeti 포함) 허용, `/api/`, `/auth/`, `/complete/` 차단
- `layout.tsx`: `verification` 필드에 Google/Naver 환경변수 기반 주입, OpenGraph에 `locale: "ko_KR"`, `siteName: "모카번"` 추가, `alternates.canonical` 설정

### Bug Fix (Issue #15)

**문제**: 네이버/구글 검색엔진 소유권 확인 실패

**원인 분석**:
1. `mochabun.co.kr` → 307 → `www.mochabun.co.kr` 리다이렉트로 인해 크롤러가 원본 URL에서 메타 태그를 찾지 못함
2. `verification.other`에서 spread 연산자 사용 시 빌드 최적화에서 불안정할 수 있음
3. 모든 URL이 `mochabun.com`(잘못된 도메인)으로 설정되어 있었음

**수정 사항**:
- `verification.other`: spread 연산자 패턴 → Next.js 공식 문서 방식(직접 할당 + nullish coalescing)
- `mochabun.com` → `mochabun.co.kr`로 전체 수정 (layout.tsx, sitemap.ts, robots.ts)
- Vercel 도메인 설정에서 `mochabun.co.kr`을 primary로 설정 필요 (리다이렉트 방향 변경)

### Quality Validation

- [x] Build: Success (`/sitemap.xml`, `/robots.txt` 정상 생성 확인)
- [x] Type Check: Passed
- [x] Lint: Passed (변경 파일 기준)

### Deviations from Plan

**Changed**:
- 도메인 URL: `mochabun.com` → `mochabun.co.kr` (실제 프로덕션 도메인 반영)
- `verification.other` 패턴: spread 연산자 → 직접 할당 (안정성 개선)

### Performance Impact

- 빌드 시 정적 페이지 2개 추가 (`/sitemap.xml`, `/robots.txt`)
- 런타임 영향 없음

### Follow-up Tasks

- [ ] Vercel Dashboard에서 `mochabun.co.kr`을 primary domain으로 설정 (www → non-www 리다이렉트)
- [ ] 배포 후 네이버/구글 소유권 재확인
