import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const value = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    const parts = [
      value.message,
      value.details ? `Chi tiết: ${value.details}` : "",
      value.hint ? `Gợi ý: ${value.hint}` : "",
      value.code ? `Mã lỗi: ${value.code}` : "",
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return "Không thể reset dữ liệu demo.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const confirmation = String(body?.confirmation ?? "").trim();

    if (confirmation !== "RESET") {
      return NextResponse.json(
        {
          success: false,
          message: 'Vui lòng nhập chính xác "RESET" để xác nhận.',
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "reset_demo_keep_200_orders"
    );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: getErrorMessage(error),
          supabaseError: {
            code: error.code ?? "",
            details: error.details ?? "",
            hint: error.hint ?? "",
          },
        },
        { status: 500 }
      );
    }

    const result =
      data && typeof data === "object"
        ? data
        : {};

    if (
      typeof result === "object" &&
      result !== null &&
      "success" in result &&
      result.success !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "RPC Reset trả về trạng thái không thành công.",
          result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Đã reset dữ liệu demo và giữ lại 200 đơn hàng.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
