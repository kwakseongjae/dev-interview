import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/team-spaces/upload-avatar - 팀스페이스 아바타 업로드
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
    }

    // 파일 크기 확인 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 파일 타입 확인
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "이미지 파일만 업로드 가능합니다" },
        { status: 400 },
      );
    }

    // 파일명 생성 및 검증
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // 허용된 확장자만 사용
    const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!allowedExts.includes(fileExt)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다" },
        { status: 400 },
      );
    }
    const fileName = `${auth.sub}/${Date.now()}.${fileExt}`;
    const filePath = `team-spaces/${fileName}`;

    // Supabase Storage에 업로드
    const fileBuffer = await file.arrayBuffer();
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !data) {
      throw new Error("파일 업로드 실패");
    }

    // 공개 URL 생성
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("avatars").getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrl,
    });
  } catch (error) {
    // 보안: 상세한 에러 메시지 노출 방지
    console.error("파일 업로드 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다" },
      { status: 500 },
    );
  }
}
