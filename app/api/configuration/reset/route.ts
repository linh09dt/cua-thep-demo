import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    if (error) throw error;

    const result =
      data && typeof data === "object"
        ? data
        : {};

    return NextResponse.json({
      success: true,
      message: "Đã reset dữ liệu demo và giữ lại 200 đơn hàng.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể reset dữ liệu demo.",
      },
      { status: 500 }
    );
  }
}
