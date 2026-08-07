import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type OrderStatus =
  | "Mới"
  | "Đã lên kế hoạch"
  | "Đang sản xuất"
  | "Hoàn thành";

type OrderPayload = {
  id: string;
  donHang?: string;
  daiLy?: string;
  ngayDat?: string;
  ngayGiao?: string;
  model?: string;
  mau?: string;
  cao?: string;
  rong?: string;
  huongMo?: string;
  soLuong?: string;
  khoa?: string;
  ghiChu?: string;
  trangThai?: OrderStatus;
};

function toNullableText(value?: string) {
  const text = (value ?? "").trim();
  return text === "" ? null : text;
}

function toNullableNumber(value?: string) {
  if (value === undefined || value === null || value === "") return null;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toDbRow(row: OrderPayload) {
  return {
    id: row.id,
    don_hang: toNullableText(row.donHang),
    dai_ly: toNullableText(row.daiLy),
    ngay_dat: row.ngayDat || null,
    ngay_giao: row.ngayGiao || null,
    model: toNullableText(row.model),
    mau: toNullableText(row.mau),
    cao: toNullableNumber(row.cao),
    rong: toNullableNumber(row.rong),
    huong_mo: toNullableText(row.huongMo),
    so_luong: toNullableNumber(row.soLuong),
    khoa: toNullableText(row.khoa),
    ghi_chu: toNullableText(row.ghiChu),
    trang_thai: row.trangThai || "Mới",
    updated_at: new Date().toISOString(),
  };
}

function fromDbRow(row: any) {
  return {
    id: row.id,
    donHang: row.don_hang ?? "",
    daiLy: row.dai_ly ?? "",
    ngayDat: row.ngay_dat ?? "",
    ngayGiao: row.ngay_giao ?? "",
    model: row.model ?? "",
    mau: row.mau ?? "",
    cao: row.cao?.toString() ?? "",
    rong: row.rong?.toString() ?? "",
    huongMo: row.huong_mo ?? "",
    soLuong: row.so_luong?.toString() ?? "",
    khoa: row.khoa ?? "",
    ghiChu: row.ghi_chu ?? "",
    trangThai: row.trang_thai ?? "Mới",
  };
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("steel_door_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success: true,
    rows: (data ?? []).map(fromDbRow),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows: OrderPayload[] = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Không có dữ liệu để lưu.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("steel_door_orders")
      .upsert(rows.map(toDbRow), {
        onConflict: "id",
      })
      .select("*");

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      rows: (data ?? []).map(fromDbRow),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = String(body?.id ?? "");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu ID đơn hàng.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("steel_door_orders")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}
