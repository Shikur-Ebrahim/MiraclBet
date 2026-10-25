with open(r'C:\Users\hp\Desktop\miraclbet\apps\api\internal\handlers\users_admin.go', 'r', encoding='utf-8') as f:
    content = f.read()

target1 = '''func (h *UsersAdminHandler) List(w http.ResponseWriter, r *http.Request) {
\tisSuper := IsSuperAdminRequest(r, h.db)
\tpromoFilter := "none"
\tif isSuper {
\t\tpromoFilter = "only"
\t}

\tquery := `
\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
\t\tFROM users
\t`
\tif promoFilter == "none" {
\t\tquery += " WHERE COALESCE(promo_code, '') = '' "
\t} else if promoFilter == "only" {
\t\tquery += " WHERE COALESCE(promo_code, '') != '' "
\t}
\tquery += " ORDER BY created_at DESC"

\trows, err := h.db.Pool.Query(r.Context(), query)'''

rep1 = '''func (h *UsersAdminHandler) List(w http.ResponseWriter, r *http.Request) {
\tisSuper := IsSuperAdminRequest(r, h.db)

\tvar query string
\tvar args []interface{}

\tif isSuper {
\t\tsuperPromo := GetSuperAdminPromoCode(r, h.db)
\t\tif superPromo != "" {
\t\t\tquery = `
\t\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
\t\t\t\tFROM users
\t\t\t\tWHERE promo_code = $1
\t\t\t\tORDER BY created_at DESC
\t\t\t`
\t\t\targs = append(args, superPromo)
\t\t} else {
\t\t\tquery = `
\t\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
\t\t\t\tFROM users
\t\t\t\tWHERE COALESCE(promo_code, '') != ''
\t\t\t\tORDER BY created_at DESC
\t\t\t`
\t\t}
\t} else {
\t\tquery = `
\t\t\tSELECT id, phone, role, COALESCE(balance, 0), COALESCE(is_active, true), created_at, COALESCE(privileges, '[]'::jsonb), COALESCE(promo_code, '')
\t\t\tFROM users
\t\t\tWHERE COALESCE(promo_code, '') = ''
\t\t\tORDER BY created_at DESC
\t\t`
\t}

\trows, err := h.db.Pool.Query(r.Context(), query, args...)'''

target2 = '''\tif isSuper {
\t\th.db.Pool.QueryRow(ctx, `
\t\t\tSELECT COUNT(*) 
\t\t\tFROM deposits d 
\t\t\tJOIN users u ON d.user_id = u.id 
\t\t\tWHERE d.status = 'pending' AND COALESCE(u.promo_code, '') != ''
\t\t`).Scan(&deposits)
\t\th.db.Pool.QueryRow(ctx, `
\t\t\tSELECT COUNT(*) 
\t\t\tFROM withdrawals w 
\t\t\tJOIN users u ON w.user_id = u.id 
\t\t\tWHERE w.status = 'pending' AND COALESCE(u.promo_code, '') != ''
\t\t`).Scan(&withdrawals)
\t}'''

rep2 = '''\tif isSuper {
\t\tsuperPromo := GetSuperAdminPromoCode(r, h.db)
\t\tif superPromo != "" {
\t\t\th.db.Pool.QueryRow(ctx, `
\t\t\t\tSELECT COUNT(*) 
\t\t\t\tFROM deposits d 
\t\t\t\tJOIN users u ON d.user_id = u.id 
\t\t\t\tWHERE d.status = 'pending' AND u.promo_code = $1
\t\t\t`, superPromo).Scan(&deposits)
\t\t\th.db.Pool.QueryRow(ctx, `
\t\t\t\tSELECT COUNT(*) 
\t\t\t\tFROM withdrawals w 
\t\t\t\tJOIN users u ON w.user_id = u.id 
\t\t\t\tWHERE w.status = 'pending' AND u.promo_code = $1
\t\t\t`, superPromo).Scan(&withdrawals)
\t\t} else {
\t\t\th.db.Pool.QueryRow(ctx, `
\t\t\t\tSELECT COUNT(*) 
\t\t\t\tFROM deposits d 
\t\t\t\tJOIN users u ON d.user_id = u.id 
\t\t\t\tWHERE d.status = 'pending' AND COALESCE(u.promo_code, '') != ''
\t\t\t`).Scan(&deposits)
\t\t\th.db.Pool.QueryRow(ctx, `
\t\t\t\tSELECT COUNT(*) 
\t\t\t\tFROM withdrawals w 
\t\t\t\tJOIN users u ON w.user_id = u.id 
\t\t\t\tWHERE w.status = 'pending' AND COALESCE(u.promo_code, '') != ''
\t\t\t`).Scan(&withdrawals)
\t\t}
\t}'''

# Normalize newlines
c_norm = content.replace('\r\n', '\n')
t1_norm = target1.replace('\r\n', '\n')
t2_norm = target2.replace('\r\n', '\n')

assert t1_norm in c_norm, 'target1 not found'
assert t2_norm in c_norm, 'target2 not found'

c_norm = c_norm.replace(t1_norm, rep1)
c_norm = c_norm.replace(t2_norm, rep2)

with open(r'C:\Users\hp\Desktop\miraclbet\apps\api\internal\handlers\users_admin.go', 'w', encoding='utf-8') as f:
    f.write(c_norm)

print('Successfully updated users_admin.go')
