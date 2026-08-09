import { supabaseAdmin } from "@/lib/supabase-admin";

const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

export async function loadMaterialRequirements(planDate?: string) {
  const date = planDate || new Date().toISOString().slice(0, 10);
  const [rootsR, ordersR, bomR, itemsR, invR] = await Promise.all([
    supabaseAdmin.from("production_orders").select("id,order_id,production_no,quantity,status").eq("level_no",1).neq("status","CANCELLED"),
    supabaseAdmin.from("steel_door_orders").select("id,don_hang,dai_ly,ngay_giao,model,mau,huong_mo,khoa,cao,rong,so_luong,trang_thai"),
    supabaseAdmin.from("material_bom_rules").select("id,model,material_id,qty_per_set,required_for,is_active").eq("is_active",true),
    supabaseAdmin.from("material_items").select("id,material_code,material_name,category,uom,safety_stock,is_active").eq("is_active",true),
    supabaseAdmin.from("material_inventory").select("material_id,on_hand_qty,reserved_qty,updated_at"),
  ]);
  for (const r of [rootsR,ordersR,bomR,itemsR,invR]) if (r.error) throw r.error;

  const roots = rootsR.data ?? [];
  const orders = ordersR.data ?? [];
  const bom = bomR.data ?? [];
  const items = itemsR.data ?? [];
  const inv = invR.data ?? [];
  const orderMap = new Map(orders.map(x => [x.id,x]));
  const itemMap = new Map(items.map(x => [x.id,x]));
  const invMap = new Map(inv.map(x => [x.material_id,x]));

  const activeRoots = roots
    .map(root => ({root,order:orderMap.get(root.order_id)}))
    .filter(x => x.order && x.root.status !== "COMPLETED")
    .sort((a,b) => String(a.order?.ngay_giao ?? "9999").localeCompare(String(b.order?.ngay_giao ?? "9999")));

  const perOrder = activeRoots.map(({root,order}) => {
    const qty = n(root.quantity || order?.so_luong);
    const rules = bom.filter(x => x.model === order?.model);
    const requirements = rules.map(rule => {
      const item = itemMap.get(rule.material_id);
      return {
        materialId: rule.material_id,
        code: item?.material_code ?? "",
        name: item?.material_name ?? "",
        category: item?.category ?? "",
        uom: item?.uom ?? "EA",
        requiredFor: rule.required_for,
        qtyPerSet: n(rule.qty_per_set),
        requiredQty: Math.round(n(rule.qty_per_set) * qty * 100) / 100,
      };
    });
    return {
      rootId: root.id,
      productionNo: root.production_no,
      orderId: root.order_id,
      orderNo: order?.don_hang ?? "",
      dealer: order?.dai_ly ?? "",
      dueDate: String(order?.ngay_giao ?? "").slice(0,10),
      model: order?.model ?? "",
      color: order?.mau ?? "",
      quantity: qty,
      status: root.status,
      requirements,
    };
  });

  const materialRows = items.map(item => {
    const inventory = invMap.get(item.id);
    const demand = perOrder.reduce((sum,row) => sum + row.requirements.filter(r=>r.materialId===item.id).reduce((s,r)=>s+r.requiredQty,0),0);
    const onHand = n(inventory?.on_hand_qty);
    const reserved = n(inventory?.reserved_qty);
    const safety = n(item.safety_stock);
    const netAvailable = Math.max(0,onHand-reserved-safety);
    const shortage = Math.max(0,demand-netAvailable);
    const impactedOrders = perOrder.filter(row=>row.requirements.some(r=>r.materialId===item.id)).length;
    return {
      materialId:item.id,code:item.material_code,name:item.material_name,category:item.category,uom:item.uom,
      onHand,reserved,safetyStock:safety,netAvailable,demand:Math.round(demand*100)/100,
      shortage:Math.round(shortage*100)/100,coveragePercent:demand>0?Math.min(100,Math.round(netAvailable*100/demand)):100,
      impactedOrders,
      status: shortage>0 ? "SHORTAGE" : netAvailable < demand*1.15 ? "LOW" : "OK",
    };
  }).sort((a,b)=>b.shortage-a.shortage || a.coveragePercent-b.coveragePercent);

  // Allocate available stock by delivery date so the impacted-order list is deterministic.
  const allocation = new Map(materialRows.map(x => [x.materialId, x.netAvailable]));
  const orderRows = perOrder.map(row => {
    let required = 0;
    let allocated = 0;
    const shortageNotes: string[] = [];
    for (const req of row.requirements) {
      required += req.requiredQty;
      const available = Math.max(0, allocation.get(req.materialId) ?? 0);
      const issue = Math.min(available, req.requiredQty);
      allocated += issue;
      allocation.set(req.materialId, Math.max(0, available - issue));
      if (issue < req.requiredQty) shortageNotes.push(`${req.code}: thiếu ${Math.round((req.requiredQty-issue)*100)/100} ${req.uom}`);
    }
    const materialPercent = required > 0 ? Math.round(allocated * 100 / required) : 100;
    const materialStatus = materialPercent >= 100 ? "READY" : materialPercent > 0 ? "PARTIAL" : "SHORTAGE";
    return {...row, materialPercent, materialStatus, shortageNote: shortageNotes.join("; ")};
  });

  return {
    date,
    materials: materialRows,
    orders: orderRows,
    kpi: {
      materialCount: materialRows.length,
      shortageMaterials: materialRows.filter(x=>x.shortage>0).length,
      shortageQty: Math.round(materialRows.reduce((s,x)=>s+x.shortage,0)*100)/100,
      impactedOrders: orderRows.filter(row=>row.materialStatus!=="READY").length,
      totalDemand: Math.round(materialRows.reduce((s,x)=>s+x.demand,0)*100)/100,
    }
  };
}

export async function recalculateMaterialReadiness() {
  const data = await loadMaterialRequirements();
  const materials = new Map(data.materials.map(x=>[x.materialId,{...x,remaining:x.netAvailable}]));
  const updates: any[] = [];

  for (const row of data.orders) {
    let required = 0;
    let supplied = 0;
    const shortages: string[] = [];
    for (const req of row.requirements) {
      required += req.requiredQty;
      const m = materials.get(req.materialId);
      const available = Math.max(0,m?.remaining ?? 0);
      const allocated = Math.min(available,req.requiredQty);
      supplied += allocated;
      if (m) m.remaining = Math.max(0,m.remaining-allocated);
      if (allocated < req.requiredQty) shortages.push(`${req.code}: thiếu ${Math.round((req.requiredQty-allocated)*100)/100} ${req.uom}`);
    }
    const percent = required>0 ? Math.round(supplied*100/required) : 100;
    const status = percent>=100 ? "READY" : percent>0 ? "PARTIAL" : "SHORTAGE";
    updates.push({production_order_id:row.rootId,order_id:row.orderId,status,readiness_percent:percent,shortage_note:shortages.join("; ")||null,confirmed_by:"Material Requirement Engine",confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  }

  if (updates.length) {
    const { error } = await supabaseAdmin.from("production_material_readiness").upsert(updates,{onConflict:"production_order_id"});
    if (error) throw error;
  }
  return {updated:updates.length};
}
