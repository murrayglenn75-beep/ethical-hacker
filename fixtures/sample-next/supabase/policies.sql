alter table public.users enable row level security;
create policy "own rows" on public.users for select using (auth.uid() = user_id);
