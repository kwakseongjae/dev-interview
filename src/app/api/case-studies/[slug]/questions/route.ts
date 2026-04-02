import { NextRequest, NextResponse } from "next/server";
import {
  getCaseStudyBySlug,
  incrementInterviewCount,
} from "@/lib/case-studies";
import { generateQuestions } from "@/lib/claude";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { checkRateLimit } from "@/lib/ratelimit";
import type { InterviewTypeCode } from "@/types/interview";

// POST /api/case-studies/[slug]/questions - 케이스 스터디 기반 면접 질문 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    let auth;
    try {
      auth = await requireUser();
    } catch {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    const blocked = await checkRateLimit(auth.sub, "ai-auth");
    if (blocked) return blocked;

    const { slug } = await params;
    const body = await request.json();
    const { count = 5, use_seed_questions = false } = body;

    const caseStudy = await getCaseStudyBySlug(slug);

    if (!caseStudy) {
      return NextResponse.json(
        { error: "케이스 스터디를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    // 시드 질문을 바로 반환하는 옵션
    if (use_seed_questions && caseStudy.seedQuestions.length > 0) {
      // 면접 횟수 증가
      incrementInterviewCount(caseStudy.id).catch(() => {});

      return NextResponse.json({
        questions: caseStudy.seedQuestions.map((q) => ({
          content: q.content,
          hint: q.hint,
          category: q.category,
          isReferenceBased: true,
        })),
        caseStudyId: caseStudy.id,
        caseStudyTitle: caseStudy.title,
        source: "seed",
      });
    }

    // 케이스 스터디 컨텍스트 구성
    const caseContext = buildCaseStudyContext(caseStudy);

    // AI 질문 생성 (CASE_STUDY 타입 + 사례 컨텍스트)
    const prompt = `다음 실제 기업 사례를 기반으로 고난도 기술면접 질문을 생성해주세요.

${caseContext}

이 사례의 핵심 기술적 도전과 해결 과정을 깊이 파고드는 질문을 만들어주세요.
면접자가 해당 기술과 아키텍처에 대한 깊은 이해를 보여줘야 하는 수준의 질문이어야 합니다.`;

    const result = await generateQuestions(
      prompt,
      [], // excludeQuestions
      count,
      undefined, // referenceUrls
      "CASE_STUDY" as InterviewTypeCode,
    );

    // 면접 횟수 증가
    incrementInterviewCount(caseStudy.id).catch(() => {});

    return NextResponse.json({
      questions: result.questions,
      caseStudyId: caseStudy.id,
      caseStudyTitle: caseStudy.title,
      source: "ai",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "질문 생성에 실패했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 케이스 스터디 정보를 AI 프롬프트용 텍스트로 변환
 */
function buildCaseStudyContext(caseStudy: {
  title: string;
  companyName: string;
  sourceType: string;
  summary: {
    background: string;
    challenge: string;
    solution: string;
    results: string;
    keyTakeaways: string[];
  };
  domains: string[];
  technologies: string[];
  difficulty: string;
}): string {
  const { summary } = caseStudy;

  return `📋 케이스 스터디: ${caseStudy.title}
🏢 기업: ${caseStudy.companyName}
📂 도메인: ${caseStudy.domains.join(", ")}
🛠️ 기술 스택: ${caseStudy.technologies.join(", ")}
📊 난이도: ${caseStudy.difficulty}레벨

## 배경
${summary.background}

## 도전 과제
${summary.challenge}

## 해결 방안
${summary.solution}

## 결과
${summary.results}

## 핵심 인사이트
${summary.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
}
