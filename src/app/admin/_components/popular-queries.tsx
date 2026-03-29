import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QueryData {
  query: string;
  count: number;
}

interface PopularQueriesProps {
  data: QueryData[];
}

export function PopularQueries({ data }: PopularQueriesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>인기 쿼리 Top 10 (비회원)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            데이터가 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={item.query}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm">{item.query}</span>
                </div>
                <span className="shrink-0 text-sm font-medium text-muted-foreground">
                  {item.count}회
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
