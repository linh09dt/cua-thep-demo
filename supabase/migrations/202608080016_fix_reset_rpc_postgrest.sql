-- ============================================================
-- FIX RESET RPC FOR WEB / POSTGREST
--
-- Hàm reset_demo_keep_200_orders() đã chạy được trong SQL Editor.
-- Migration này chỉ:
-- 1. cấp lại quyền service_role;
-- 2. đảm bảo function ở schema public;
-- 3. yêu cầu PostgREST reload schema cache.
-- Không thay đổi logic reset.
-- ============================================================

do $$
begin
  if to_regprocedure('public.reset_demo_keep_200_orders()') is null then
    raise exception
      'Function public.reset_demo_keep_200_orders() chưa tồn tại. Hãy chạy migration 202608080014 trước.';
  end if;
end;
$$;

revoke all
on function public.reset_demo_keep_200_orders()
from public, anon, authenticated;

grant execute
on function public.reset_demo_keep_200_orders()
to service_role;

-- Supabase/PostgREST cần reload schema cache để RPC mới/đã thay đổi
-- được nhìn thấy ngay qua /rest/v1/rpc/...
notify pgrst, 'reload schema';

select
  p.proname as function_name,
  n.nspname as schema_name,
  has_function_privilege(
    'service_role',
    p.oid,
    'EXECUTE'
  ) as service_role_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'reset_demo_keep_200_orders';
