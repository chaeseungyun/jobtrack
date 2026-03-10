/**
 * Chart color palette mapping to CSS variables
 * CSS variables are defined in globals.css with light/dark mode support
 */
export const CHART_COLORS = {
  chart1: "var(--chart-1)",
  chart2: "var(--chart-2)",
  chart3: "var(--chart-3)",
  chart4: "var(--chart-4)",
  chart5: "var(--chart-5)",
} as const;

export type ChartColor = typeof CHART_COLORS[keyof typeof CHART_COLORS];
