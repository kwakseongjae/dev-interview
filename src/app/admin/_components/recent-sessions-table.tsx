"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GuestSession {
  id: string;
  query: string;
  created_at: string;
  is_completed: boolean;
  question_count: number;
  interview_type: {
    display_name: string;
    color: string;
  } | null;
}

interface RecentSessionsTableProps {
  data: GuestSession[];
}

export function RecentSessionsTable({ data }: RecentSessionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 비회원 세션</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            데이터가 없습니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>쿼리</TableHead>
                  <TableHead className="w-[100px]">유형</TableHead>
                  <TableHead className="w-[80px] text-center">
                    질문 수
                  </TableHead>
                  <TableHead className="w-[80px] text-center">상태</TableHead>
                  <TableHead className="w-[140px]">생성일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {session.query}
                    </TableCell>
                    <TableCell>
                      {session.interview_type ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: session.interview_type.color,
                            color: session.interview_type.color,
                          }}
                        >
                          {session.interview_type.display_name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {session.question_count}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={session.is_completed ? "default" : "secondary"}
                      >
                        {session.is_completed ? "완료" : "진행중"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString(
                        "ko-KR",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
