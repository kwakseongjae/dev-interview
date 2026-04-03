"use client";

import { useState } from "react";
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
import { ChevronDown, ChevronRight } from "lucide-react";

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
  questions: { id: string; content: string }[];
}

interface RecentSessionsTableProps {
  data: GuestSession[];
}

export function RecentSessionsTable({ data }: RecentSessionsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
                  <TableHead className="w-[32px]" />
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
                {data.map((session) => {
                  const isExpanded = expandedIds.has(session.id);
                  const hasQuestions = session.questions.length > 0;

                  return (
                    <>
                      <TableRow
                        key={session.id}
                        className={
                          hasQuestions ? "cursor-pointer hover:bg-muted/50" : ""
                        }
                        onClick={() => hasQuestions && toggleExpand(session.id)}
                      >
                        <TableCell className="w-[32px] px-2">
                          {hasQuestions &&
                            (isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            ))}
                        </TableCell>
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
                            variant={
                              session.is_completed ? "default" : "secondary"
                            }
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

                      {isExpanded && (
                        <TableRow key={`${session.id}-questions`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-0">
                            <div className="px-6 py-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                생성된 질문 ({session.questions.length}개)
                              </p>
                              <ol className="space-y-1.5">
                                {session.questions.map((q, i) => (
                                  <li key={q.id} className="flex gap-2 text-sm">
                                    <span className="shrink-0 text-muted-foreground">
                                      {i + 1}.
                                    </span>
                                    <span>{q.content}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
