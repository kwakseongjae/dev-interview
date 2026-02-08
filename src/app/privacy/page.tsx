import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 모카번",
  description: "모카번(mochabun) 개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen grain">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; 홈으로
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mt-8 mb-2">
          개인정보 처리방침
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          시행일: 2026년 2월 8일
        </p>

        <div className="space-y-10 text-sm md:text-base leading-relaxed text-foreground/85">
          <section>
            <h2 className="text-lg font-semibold mb-3">
              1. 개인정보의 수집 및 이용 목적
            </h2>
            <p className="text-muted-foreground">
              모카번(이하 &ldquo;회사&rdquo;)은 서비스 제공을 위해 필요한
              최소한의 개인정보를 다음의 목적으로 수집 및 이용합니다.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground mt-3">
              <li>회원 가입 및 로그인</li>
              <li>서비스 이용 기록 관리 (면접 기록, 답변, 피드백 등)</li>
              <li>서비스 개선 및 운영</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              2. 수집하는 개인정보 항목
            </h2>
            <p className="text-muted-foreground mb-3">
              회사는 Google 소셜 로그인을 통해 아래 항목을 수집합니다.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li>이메일 주소</li>
              <li>이름</li>
              <li>프로필 사진</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p className="text-muted-foreground">
              회원 탈퇴 시 지체 없이 파기합니다. 다만, 관련 법령에 따라 보존이
              필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              4. 개인정보의 제3자 제공
            </h2>
            <p className="text-muted-foreground">
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
              다만, 이용자가 동의한 경우 또는 법령에 의해 요구되는 경우에 한하여
              예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              5. 개인정보 처리 위탁
            </h2>
            <p className="text-muted-foreground mb-3">
              회사는 서비스 운영을 위해 아래와 같이 개인정보 처리를 위탁하고
              있습니다.
            </p>
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 font-medium">
                      수탁 업체
                    </th>
                    <th className="text-left py-2 font-medium">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2">회원 인증 및 데이터 저장</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2">서비스 호스팅</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Anthropic</td>
                    <td className="py-2">AI 질문 생성 및 피드백 제공</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              6. 이용자의 권리와 행사 방법
            </h2>
            <p className="text-muted-foreground">
              이용자는 언제든지 개인정보의 열람, 수정, 삭제를 요청할 수 있으며,
              회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다. 관련 문의는
              아래 연락처를 이용해 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. 쿠키의 사용</h2>
            <p className="text-muted-foreground">
              서비스는 로그인 세션 유지 목적으로 쿠키를 사용합니다. 브라우저
              설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수
              있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              8. 개인정보의 안전성 확보 조치
            </h2>
            <p className="text-muted-foreground">
              회사는 이용자의 개인정보를 안전하게 관리하기 위해 데이터 전송 구간
              암호화(SSL), 접근 권한 관리 등 기술적 조치를 시행하고 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              9. 개인정보 보호 책임자
            </h2>
            <div className="rounded-lg border border-border p-4 bg-muted/30 text-muted-foreground space-y-1">
              <p>이름: 곽성재</p>
              <p>
                이메일:{" "}
                <a
                  href="mailto:gkffhdnls13@gmail.com"
                  className="text-foreground underline underline-offset-4"
                >
                  gkffhdnls13@gmail.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">
              10. 개인정보 처리방침의 변경
            </h2>
            <p className="text-muted-foreground">
              본 방침은 시행일로부터 적용되며, 내용이 변경될 경우 서비스 내
              공지사항을 통해 안내합니다.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
