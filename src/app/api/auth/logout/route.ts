import { NextRequest, NextResponse } from "next/server";

import { extractBearerToken, verifyAuthToken } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
