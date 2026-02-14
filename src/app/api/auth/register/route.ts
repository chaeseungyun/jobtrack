import { NextRequest, NextResponse } from "next/server";

import { signAuthToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterRequestBody {
  email?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  let body: RegisterRequestBody;

  try {
    body = (await request.json()) as RegisterRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password || !EMAIL_REGEX.test(email) || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const { data: createdUser, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
      })
      .select("id, email")
      .single();

    if (insertError || !createdUser) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create user" },
        { status: 500 }
      );
    }

    const token = signAuthToken({
      sub: createdUser.id,
      email: createdUser.email,
    });

    return NextResponse.json(
      {
        user: {
          id: createdUser.id,
          email: createdUser.email,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
