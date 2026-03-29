import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ConversionData {
  claimed_sessions: number;
  total_guest_sessions: number;
  rate: number;
}

interface CompletionData {
  guest_total: number;
  guest_completed: number;
  guest_rate: number;
  member_total: number;
  member_completed: number;
  member_rate: number;
}

interface ConversionStatsProps {
  conversion: ConversionData;
  completion: CompletionData;
}

export function ConversionStats({
  conversion,
  completion,
}: ConversionStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비회원 → 회원 전환율</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-3xl font-bold">
            {(conversion.rate * 100).toFixed(1)}%
          </div>
          <Progress value={conversion.rate * 100} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {conversion.claimed_sessions.toLocaleString()}건 전환 /{" "}
            {conversion.total_guest_sessions.toLocaleString()}건 비회원 세션
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">세션 완료율 비교</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>비회원</span>
              <span className="font-medium">
                {(completion.guest_rate * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={completion.guest_rate * 100} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {completion.guest_completed}/{completion.guest_total}건
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>회원</span>
              <span className="font-medium">
                {(completion.member_rate * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={completion.member_rate * 100} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {completion.member_completed}/{completion.member_total}건
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
