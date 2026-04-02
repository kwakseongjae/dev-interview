import type { InterviewTypeCode } from "@/types/interview";

export interface StaticInterviewType {
  code: InterviewTypeCode;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export const INTERVIEW_TYPES: StaticInterviewType[] = [
  {
    code: "CS",
    displayName: "CS 기초",
    description:
      "운영체제, 네트워크, 알고리즘, 자료구조, 데이터베이스 등 컴퓨터 과학 핵심 개념을 심층적으로 다룹니다.",
    icon: "Brain",
    color: "blue",
    sortOrder: 1,
  },
  {
    code: "PROJECT",
    displayName: "프로젝트 기반",
    description:
      "실제 프로젝트 경험, 기술 선택의 이유, 트러블슈팅 경험을 중심으로 실무 역량을 평가합니다.",
    icon: "FolderKanban",
    color: "green",
    sortOrder: 2,
  },
  {
    code: "SYSTEM_DESIGN",
    displayName: "시스템 설계",
    description:
      "대용량 트래픽 처리, 분산 시스템, 데이터 모델링 등 아키텍처 설계 역량을 평가합니다.",
    icon: "Network",
    color: "purple",
    sortOrder: 3,
  },
  {
    code: "CASE_STUDY",
    displayName: "기업 사례",
    description:
      "실제 기업 사례를 분석하고 기술적 의사결정 과정과 트레이드오프를 심층 토론합니다.",
    icon: "BookOpen",
    color: "amber",
    sortOrder: 4,
  },
];

export function getInterviewTypeByCode(
  code: string,
): StaticInterviewType | undefined {
  return INTERVIEW_TYPES.find((t) => t.code === code);
}
