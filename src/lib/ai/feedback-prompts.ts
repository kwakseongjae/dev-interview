/**
 * AI Feedback Prompt Templates
 * Quick feedback uses Haiku (fast, cheap), Detailed uses Sonnet (thorough)
 */

/**
 * Quick Feedback Prompt (Haiku - Pre-generated)
 * Generates: keywords, score (1-5), summary
 * Cost-optimized: ~100-200 tokens output
 */
export const QUICK_FEEDBACK_PROMPT = `당신은 기술면접 피드백 전문가입니다.
다음 기술면접 질문과 답변을 분석하여 간단한 피드백을 생성해주세요.

**질문**: {question}
**힌트**: {hint}
**답변**: {answer}

다음 JSON 형식으로만 응답해주세요:
{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "score": 3,
  "summary": "한 줄 평가 (15-30자)"
}

**규칙**:
- keywords: 답변에서 언급한 핵심 기술 키워드 3-5개 (답변이 부실하면 적게)
- score: 1-5점 (1=미흡, 2=부족, 3=보통, 4=양호, 5=우수)
- summary: 점수에 맞는 간결한 한 줄 평가

**점수 기준**:
- 5점: 정확하고 구체적이며 실무 경험 포함
- 4점: 정확하고 핵심 개념 설명됨
- 3점: 기본 개념은 맞지만 깊이 부족
- 2점: 부분적으로 맞지만 오류 있음
- 1점: 답변 없거나 완전히 틀림`;

/**
 * Detailed Feedback Prompt (Sonnet - On-demand)
 * Generates: strengths, improvements, followUpQuestions, detailedFeedback
 * Called only when user requests detailed analysis
 */
export const DETAILED_FEEDBACK_PROMPT = `당신은 시니어 기술면접관입니다.
다음 기술면접 질문과 답변을 심층 분석하여 상세 피드백을 제공해주세요.

**질문**: {question}
**힌트**: {hint}
**답변**: {answer}
**기존 키워드**: {keywords}
**기존 점수**: {score}점/5점

다음 JSON 형식으로만 응답해주세요:
{
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선점 1", "개선점 2"],
  "followUpQuestions": ["꼬리질문 1", "꼬리질문 2"],
  "detailedFeedback": "종합 피드백 (100-200자)"
}

**규칙**:
- strengths: 답변에서 잘한 부분 2-3개 (구체적으로)
- improvements: 보완이 필요한 부분 2-3개 (실행 가능한 조언)
- followUpQuestions: 이 답변 기반으로 면접관이 물어볼 수 있는 꼬리질문 2-3개
- detailedFeedback: 전체적인 종합 평가 (점수와 일관되게)

**꼬리질문 작성 가이드**:
- 답변에서 언급한 기술/개념을 더 깊이 파고드는 질문
- 실무 적용 사례를 묻는 질문
- 관련된 다른 기술과의 비교를 묻는 질문`;

/**
 * Full Feedback Prompt (Sonnet - One-click complete analysis)
 * Generates everything in one call: keyword analysis, score, summary, strengths, improvements, followUpQuestions, detailedFeedback
 * Cost: ~$0.005-0.010 per request
 */
export const FULL_FEEDBACK_PROMPT = `당신은 시니어 기술면접관입니다.
다음 기술면접 질문과 답변을 종합 분석하여 완전한 피드백을 제공해주세요.

**질문**: {question}
**힌트**: {hint}
**답변**: {answer}

다음 JSON 형식으로만 응답해주세요:
{
  "keywordAnalysis": {
    "expected": ["면접관이 기대하는 핵심 키워드 1", "키워드 2", "키워드 3"],
    "mentioned": ["답변자가 실제 언급한 키워드 1", "키워드 2"],
    "missing": ["언급하지 않은 중요 키워드 1", "키워드 2"]
  },
  "score": 3,
  "summary": "한 줄 평가 (15-30자)",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선점 1", "개선점 2"],
  "followUpQuestions": ["꼬리질문 1", "꼬리질문 2", "꼬리질문 3"],
  "detailedFeedback": "종합 피드백 (100-200자)"
}

**규칙**:

[키워드 분석]
- expected: 이 질문에 대해 면접관이 듣고 싶어하는 핵심 기술 키워드 4-6개
- mentioned: 답변자가 실제로 언급한 키워드 (expected와 겹치는 것 포함)
- missing: expected 중 답변에서 언급되지 않은 키워드

[점수 기준]
- 5점: 정확하고 구체적이며 실무 경험 포함
- 4점: 정확하고 핵심 개념 설명됨
- 3점: 기본 개념은 맞지만 깊이 부족
- 2점: 부분적으로 맞지만 오류 있음
- 1점: 답변 없거나 완전히 틀림

[피드백]
- strengths: 답변에서 잘한 부분 2-3개 (구체적으로)
- improvements: 보완이 필요한 부분 2-3개 (실행 가능한 조언)
- followUpQuestions: 이 답변 기반으로 면접관이 물어볼 수 있는 꼬리질문 2-3개
- detailedFeedback: 전체적인 종합 평가 (점수와 일관되게)

**꼬리질문 작성 가이드**:
- 답변에서 언급한 기술/개념을 더 깊이 파고드는 질문
- 실무 적용 사례를 묻는 질문
- 관련된 다른 기술과의 비교를 묻는 질문`;

/**
 * Prompt 변수 치환 헬퍼
 */
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string | number | string[]>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    const stringValue = Array.isArray(value) ? value.join(", ") : String(value);
    result = result.replaceAll(placeholder, stringValue);
  }
  return result;
}
