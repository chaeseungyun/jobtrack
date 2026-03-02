"use client";

import type { ParseStatus } from "@/lib/parse/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface UrlParseBlockProps {
  url: string;
  onUrlChange: (url: string) => void;
  onParse: () => void;
  parseStatus: ParseStatus;
  statusMessage?: string;
  disabled?: boolean;
  parseButtonLabel?: string;
}

const STATUS_BADGE: Record<
  Exclude<ParseStatus, "idle">,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  loading: { label: "파싱 중", variant: "outline" },
  success: { label: "성공", variant: "default" },
  partial: { label: "부분 성공", variant: "secondary" },
  fail: { label: "실패", variant: "destructive" },
};

const STATUS_MESSAGE_COLOR: Record<ParseStatus, string> = {
  idle: "",
  loading: "text-muted-foreground",
  success: "text-green-600 dark:text-green-400",
  partial: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

export function UrlParseBlock({
  url,
  onUrlChange,
  onParse,
  parseStatus,
  statusMessage,
  disabled = false,
  parseButtonLabel = "URL 파싱",
}: UrlParseBlockProps) {
  const isLoading = parseStatus === "loading";
  const isParseDisabled = disabled || isLoading || !url.trim();

  return (
    <div className="space-y-2" data-parse-status={parseStatus}>
      <Label htmlFor="job_url">채용 공고 URL</Label>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="job_url"
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          disabled={disabled}
          className="min-w-0 flex-1"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isParseDisabled}
          onClick={onParse}
          data-testid="parse-submit"
        >
          {isLoading ? "파싱 중..." : parseButtonLabel}
        </Button>

        {parseStatus !== "idle" ? (
          <Badge variant={STATUS_BADGE[parseStatus].variant}>
            {STATUS_BADGE[parseStatus].label}
          </Badge>
        ) : null}
      </div>

      <div aria-live="polite">
        {statusMessage ? (
          <p className={`text-sm ${STATUS_MESSAGE_COLOR[parseStatus]}`}>
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
