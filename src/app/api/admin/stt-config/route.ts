import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: dbUser } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!dbUser?.is_admin) {
    return { error: "Forbidden", status: 403 } as const;
  }

  return { user } as const;
}

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: config } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "stt_enabled")
      .single();

    return NextResponse.json({
      enabled: config?.value !== "false",
    });
  } catch (error) {
    console.error("STT 설정 조회 실패:", error);
    return NextResponse.json(
      { error: "STT 설정을 불러올 수 없습니다" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const enabled = Boolean(body.enabled);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { error } = await admin.from("app_config").upsert(
      {
        key: "stt_enabled",
        value: String(enabled),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      console.error("STT 설정 업데이트 실패:", error);
      return NextResponse.json(
        { error: "설정 업데이트에 실패했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error("STT 설정 업데이트 실패:", error);
    return NextResponse.json(
      { error: "STT 설정을 업데이트할 수 없습니다" },
      { status: 500 },
    );
  }
}
