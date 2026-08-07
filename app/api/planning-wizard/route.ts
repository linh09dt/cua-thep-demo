import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      ordersResult,
      rootsResult,
      lotsResult,
      dispatchResult,
      reportsResult,
    ] = await Promise.all([
      supabaseAdmin.from("steel_door_orders").select("id, so_luong"),
      supabaseAdmin
        .from("production_orders")
        .select("id, order_id, status")
        .eq("level_no", 1)
        .neq("status", "CANCELLED"),
      supabaseAdmin.from("production_lots").select("id, status"),
      supabaseAdmin
        .from("production_dispatch_headers")
        .select("id, status, dispatch_date")
        .eq("dispatch_date", today),
      supabaseAdmin
        .from("production_reports")
        .select("id, report_date")
        .eq("report_date", today),
    ]);

    for (const result of [
      ordersResult,
      rootsResult,
      lotsResult,
      dispatchResult,
      reportsResult,
    ]) {
      if (result.error) throw result.error;
    }

    const rootOrderIds = new Set(
      (rootsResult.data ?? []).map((x: any) => x.order_id)
    );

    return NextResponse.json({
      success: true,
      date: today,
      steps: {
        orders: {
          total: (ordersResult.data ?? []).length,
          pending: (ordersResult.data ?? []).filter(
            (x: any) => !rootOrderIds.has(x.id)
          ).length,
        },
        productionOrders: {
          total: (rootsResult.data ?? []).length,
          running: (rootsResult.data ?? []).filter(
            (x: any) => x.status === "RUNNING"
          ).length,
        },
        lots: {
          total: (lotsResult.data ?? []).length,
          draft: (lotsResult.data ?? []).filter(
            (x: any) => x.status === "DRAFT"
          ).length,
          released: (lotsResult.data ?? []).filter(
            (x: any) => ["RELEASED", "RUNNING"].includes(x.status)
          ).length,
        },
        dispatch: {
          totalToday: (dispatchResult.data ?? []).length,
          releasedToday: (dispatchResult.data ?? []).filter(
            (x: any) => x.status === "RELEASED"
          ).length,
        },
        reports: {
          today: (reportsResult.data ?? []).length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể tải Wizard.",
      },
      { status: 500 }
    );
  }
}
