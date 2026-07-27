-- =========================================
-- SCHEMA: Aplikasi Pencatat Keuangan Warung
-- Jalankan di Supabase Dashboard > SQL Editor
-- =========================================

-- Tabel kategori (income/expense)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  created_at timestamptz default now()
);

-- Tabel transaksi
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  occurred_at date not null default current_date,
  created_at timestamptz default now()
);

-- Index biar query dashboard/laporan cepat
create index if not exists idx_transactions_user_date on transactions(user_id, occurred_at);

-- =========================================
-- ROW LEVEL SECURITY (RLS)
-- Supaya user cuma bisa lihat/ubah data miliknya sendiri
-- =========================================
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "Users can manage own categories"
  on categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- Kategori default otomatis saat user baru daftar
-- =========================================
create or replace function public.create_default_categories()
returns trigger as $$
begin
  insert into categories (user_id, name, type) values
    (new.id, 'Penjualan', 'income'),
    (new.id, 'Lainnya (Masuk)', 'income'),
    (new.id, 'Stok Barang', 'expense'),
    (new.id, 'Listrik & Air', 'expense'),
    (new.id, 'Sewa', 'expense'),
    (new.id, 'Lainnya (Keluar)', 'expense');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_default_categories();
