"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  isEmpty?: boolean
  emptyMessage?: string
  "aria-label"?: string
}

/**
 * ChartCard component - reusable wrapper for recharts visualizations
 *
 * Combines shadcn's Card components with standardized chart layout.
 * Supports empty state messaging for charts without data.
 */
export function ChartCard({
  title,
  description,
  children,
  className,
  isEmpty = false,
  emptyMessage = "No data available",
  "aria-label": ariaLabel,
}: ChartCardProps) {
  return (
    <Card className={className} role="figure" aria-label={ariaLabel ?? title}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex items-center justify-center min-h-[300px]" role="status">
            <p className="text-muted-foreground text-center">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
