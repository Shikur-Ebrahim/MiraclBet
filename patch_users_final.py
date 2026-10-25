import re

path = r'C:\Users\hp\Desktop\miraclbet\apps\api\internal\handlers\users_admin.go'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# ─── Replace the List function body (from comment to defer rows.Close()) ───────
old_list = r'''// List .*? all users \(filtered for regular admin, full for super admin\)\r?\nfunc \(h \*UsersAdminHandler\) List\(w http\.ResponseWriter, r \*http\.Request\) \{.*?rows, err := h\.db\.Pool\.Query\(r\.Context\(\), query\)\r?\n\tif err != nil \{\r?\n\t\thttp\.Error\(w, err\.Error\(\), http\.StatusInternalServerError\)\r?\n\t\treturn\r?\n\t\}'''

new_list = '''// List \u2014 all users (filtered for regular admin, full for super admin)\r\nfunc (h *UsersAdminHandler) List(w http.ResponseWriter, r *http.Request) {\r\n\tisSuper := IsSuperAdminRequest(r, h.db)\r\n\r\n\tvar pgRows interface{ Close(); Next() bool; Scan(dest ...any) error }\r\n\tvar err error\r\n\r\n\tif isSuper {\r\n\t\tsuperPromo := GetSuperAdminPromoCode(r, h.db)\r\n\t\tif superPromo != "" {\r\n\t\t\tpgRows, err = h.db.Pool.Query(r.Context(), `\r\n\t\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, \'[]\'::jsonb), COALESCE(promo_code, \'\')\r\n\t\t\t\tFROM users\r\n\t\t\t\tWHERE promo_code = $1\r\n\t\t\t\tORDER BY created_at DESC\r\n\t\t\t`, superPromo)\r\n\t\t} else {\r\n\t\t\tpgRows, err = h.db.Pool.Query(r.Context(), `\r\n\t\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, \'[]\'::jsonb), COALESCE(promo_code, \'\')\r\n\t\t\t\tFROM users\r\n\t\t\t\tWHERE COALESCE(promo_code, \'\') != \'\'\r\n\t\t\t\tORDER BY created_at DESC\r\n\t\t\t`)\r\n\t\t}\r\n\t} else {\r\n\t\tpgRows, err = h.db.Pool.Query(r.Context(), `\r\n\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, \'[]\'::jsonb), COALESCE(promo_code, \'\')\r\n\t\t\tFROM users\r\n\t\t\tWHERE COALESCE(promo_code, \'\') = \'\'\r\n\t\t\tORDER BY created_at DESC\r\n\t\t`)\r\n\t}\r\n\tif err != nil {\r\n\t\thttp.Error(w, err.Error(), http.StatusInternalServerError)\r\n\t\treturn\r\n\t}'''

result = re.sub(old_list, new_list, content, flags=re.DOTALL)
if result == content:
    print("ERROR: List function pattern not matched!")
else:
    print("List function replaced OK")

content = result

# ─── Fix the rows variable reference in the scan loop ───────────────────────
# Change: rows, err := ... -> need to change `rows` to `pgRows` in defer and loop
content = content.replace('\tdefer rows.Close()\r\n\r\n\tvar users []AdminUser\r\n\tfor rows.Next() {',
                           '\trows := pgRows\r\n\tdefer rows.Close()\r\n\r\n\tvar users []AdminUser\r\n\tfor rows.Next() {')

# ─── Fix GetPendingCounts for per-super-admin promo filtering ────────────────
old_pending = '''\tif isSuper {\r\n\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\tSELECT COUNT(*) \r\n\t\t\tFROM deposits d \r\n\t\t\tJOIN users u ON d.user_id = u.id \r\n\t\t\tWHERE d.status = \'pending\' AND COALESCE(u.promo_code, \'\') != \'\'\r\n\t\t`).Scan(&deposits)\r\n\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\tSELECT COUNT(*) \r\n\t\t\tFROM withdrawals w \r\n\t\t\tJOIN users u ON w.user_id = u.id \r\n\t\t\tWHERE w.status = \'pending\' AND COALESCE(u.promo_code, \'\') != \'\'\r\n\t\t`).Scan(&withdrawals)\r\n\t} else {'''

new_pending = '''\tif isSuper {\r\n\t\tsuperPromo := GetSuperAdminPromoCode(r, h.db)\r\n\t\tif superPromo != "" {\r\n\t\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\t\tSELECT COUNT(*)\r\n\t\t\t\tFROM deposits d\r\n\t\t\t\tJOIN users u ON d.user_id = u.id\r\n\t\t\t\tWHERE d.status = \'pending\' AND u.promo_code = $1\r\n\t\t\t`, superPromo).Scan(&deposits)\r\n\t\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\t\tSELECT COUNT(*)\r\n\t\t\t\tFROM withdrawals w\r\n\t\t\t\tJOIN users u ON w.user_id = u.id\r\n\t\t\t\tWHERE w.status = \'pending\' AND u.promo_code = $1\r\n\t\t\t`, superPromo).Scan(&withdrawals)\r\n\t\t} else {\r\n\t\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\t\tSELECT COUNT(*)\r\n\t\t\t\tFROM deposits d\r\n\t\t\t\tJOIN users u ON d.user_id = u.id\r\n\t\t\t\tWHERE d.status = \'pending\' AND COALESCE(u.promo_code, \'\') != \'\'\r\n\t\t\t`).Scan(&deposits)\r\n\t\t\th.db.Pool.QueryRow(ctx, `\r\n\t\t\t\tSELECT COUNT(*)\r\n\t\t\t\tFROM withdrawals w\r\n\t\t\t\tJOIN users u ON w.user_id = u.id\r\n\t\t\t\tWHERE w.status = \'pending\' AND COALESCE(u.promo_code, \'\') != \'\'\r\n\t\t\t`).Scan(&withdrawals)\r\n\t\t}\r\n\t} else {'''

if old_pending in content:
    content = content.replace(old_pending, new_pending)
    print("GetPendingCounts replaced OK")
else:
    print("ERROR: GetPendingCounts pattern not matched!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
