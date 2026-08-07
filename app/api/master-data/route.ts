import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CATEGORIES = [
  "MODEL",
  "COLOR",
  "LOCK",
  "OPEN_DIRECTION",
  "ORDER_STATUS",
] as const;

type Category = (typeof CATEGORIES)[number];

function validCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

async function loadData(activeOnly = false) {
  let query = supabaseAdmin
    .from("order_master_data")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;

  const grouped: Record<string, any[]> = {
    MODEL: [],
    COLOR: [],
    LOCK: [],
    OPEN_DIRECTION: [],
    ORDER_STATUS: [],
  };

  for (const row of data ?? []) {
    if (grouped[row.category]) {
      grouped[row.category].push({
        id: row.id,
        category: row.category,
        code: row.code,
        name: row.name,
        sortOrder: row.sort_order,
        isActive: row.is_active,
      });
    }
  }

  return {
    rows: data ?? [],
    grouped,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get("activeOnly") === "true";

    return NextResponse.json({
      success: true,
      ...(await loadData(activeOnly)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể tải danh mục.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = String(body?.action ?? "");

    if (action === "save") {
      const id = String(body?.id ?? "");
      const category = String(body?.category ?? "");
      const code = String(body?.code ?? "").trim().toUpperCase();
      const name = String(body?.name ?? "").trim();
      const sortOrder = Number(body?.sortOrder ?? 0);
      const isActive = body?.isActive !== false;

      if (!validCategory(category)) {
        throw new Error("Nhóm danh mục không hợp lệ.");
      }

      if (!code || !name) {
        throw new Error("Mã và tên là bắt buộc.");
      }

      const payload = {
        category,
        code,
        name,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_active: Boolean(isActive),
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabaseAdmin
          .from("order_master_data")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("order_master_data")
          .insert(payload);

        if (error) throw error;
      }
    } else if (action === "delete") {
      const id = String(body?.id ?? "");

      if (!id) throw new Error("Thiếu ID danh mục.");

      const { error } = await supabaseAdmin
        .from("order_master_data")
        .delete()
        .eq("id", id);

      if (error) throw error;
    } else {
      throw new Error("Action không hợp lệ.");
    }

    return NextResponse.json({
      success: true,
      ...(await loadData(false)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể lưu danh mục.",
      },
      { status: 500 }
    );
  }
}
