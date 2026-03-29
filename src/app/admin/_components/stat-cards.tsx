import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CalendarDays, UserX } from "lucide-react";

interface OverviewData {
  total_sessions: number;
  today_sessions: number;
  total_users: number;
  guest_session_ratio: number;
}

interface StatCardsProps {
  data: OverviewData;
}

export function StatCards({ data }: StatCardsProps) {
  const cards = [
    {
      title: "총 세션",
      value: data.total_sessions.toLocaleString(),
      icon: FileText,
      description: "누적 면접 세션",
    },
    {
      title: "오늘 세션",
      value: data.today_sessions.toLocaleString(),
      icon: CalendarDays,
      description: "오늘 생성된 세션",
    },
    {
      title: "총 사용자",
      value: data.total_users.toLocaleString(),
      icon: Users,
      description: "가입된 회원 수",
    },
    {
      title: "비회원 세션 비율",
      value: `${(data.guest_session_ratio * 100).toFixed(1)}%`,
      icon: UserX,
      description: "전체 대비 비회원 세션",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
