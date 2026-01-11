import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/references/upload - 레퍼런스 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const auth = requireAuth(authHeader);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
    }

    // 파일 크기 확인 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    // 파일 타입 확인 (PDF 또는 이미지)
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "PDF 또는 이미지 파일만 업로드 가능합니다" },
        { status: 400 }
      );
    }

    // 파일명 생성 및 검증
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const fileName = `${auth.sub}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;
    const filePath = `references/${fileName}`;

    // Supabase Storage에 업로드
    const fileBuffer = await file.arrayBuffer();

    // 버킷 존재 확인 및 생성 시도
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage
      .from("references")
      .list("", { limit: 1 });

    // 버킷이 없으면 생성 시도 (관리자 권한 필요)
    if (bucketError && bucketError.message?.includes("Bucket not found")) {
      console.error(
        "references 버킷이 없습니다. Supabase 대시보드에서 버킷을 생성해주세요."
      );
      return NextResponse.json(
        {
          error:
            "레퍼런스 저장소가 설정되지 않았습니다. Supabase 대시보드에서 'references' 버킷을 생성해주세요.",
        },
        { status: 500 }
      );
    }

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from("references")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !data) {
      console.error("파일 업로드 실패:", uploadError);
      // 더 상세한 에러 메시지 반환
      if (uploadError?.message?.includes("Bucket not found")) {
        return NextResponse.json(
          {
            error:
              "레퍼런스 저장소가 설정되지 않았습니다. Supabase 대시보드에서 'references' 버킷을 생성해주세요.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: uploadError?.message || "파일 업로드에 실패했습니다",
          details: uploadError,
        },
        { status: 500 }
      );
    }

    // 공개 URL 생성
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("references").getPublicUrl(filePath);

    return NextResponse.json({
      url: publicUrl,
      path: filePath,
      type: file.type,
      name: file.name,
    });
  } catch (error) {
    console.error("파일 업로드 실패:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("인증이 필요")) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 에러 상세 정보 반환 (디버깅용)
    return NextResponse.json(
      {
        error: errorMessage || "파일 업로드에 실패했습니다",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

