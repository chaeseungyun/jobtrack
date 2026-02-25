import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PREVIEW_COLUMNS = [
  {
    title: "지원완료",
    count: 3,
    items: [
      { company: "A Corp", position: "Frontend" },
      { company: "B Studio", position: "Fullstack" },
      { company: "C Labs", position: "Backend" },
    ],
  },
  {
    title: "서류합격",
    count: 2,
    items: [
      { company: "D Tech", position: "Platform" },
      { company: "E Works", position: "Product" },
    ],
  },
  {
    title: "코딩테스트",
    count: 1,
    items: [{ company: "F Inc", position: "Software" }],
  },
  {
    title: "면접",
    count: 1,
    items: [{ company: "G Company", position: "Frontend" }],
  },
] as const;

export function LandingPreview() {
  return (
    <section className="pt-16">
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both motion-reduce:animate-none">
        <p className="text-sm font-medium text-muted-foreground">미리보기</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          파이프라인을 한눈에
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          실제 데이터 없이도 흐름을 상상할 수 있도록, 보드 UI를 간단한 모의
          카드로 보여줍니다.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PREVIEW_COLUMNS.map((column, index) => (
          <Card
            key={column.title}
            className={`animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both motion-reduce:animate-none transition-all hover:shadow-md hover:-translate-y-0.5`}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{column.title}</CardTitle>
                <Badge variant="secondary">{column.count}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {column.items.map((item) => (
                <div
                  key={`${column.title}-${item.company}-${item.position}`}
                  className="rounded-md border border-border bg-muted p-3 transition-colors duration-200 hover:bg-accent"
                >
                  <p className="text-sm font-medium text-foreground">
                    {item.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.position}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
