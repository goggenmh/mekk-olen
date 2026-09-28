-- Gjer «docs»-bøtta PRIVAT og gir berre innlogga tilgang.
-- Køyr i Supabase → SQL Editor → Run. (Kan òg setjast i Storage-UI-et.)

-- Sørg for at bøtta finst og er privat.
insert into storage.buckets (id, name, public)
values ('docs', 'docs', false)
on conflict (id) do update set public = false;

-- Berre innlogga (authenticated) kan lese, laste opp, endre og slette filer i bøtta.
-- Filene kan då ikkje hentast via ein open URL – appen lagar signerte,
-- tidsavgrensa lenker for kvar visning.
drop policy if exists "docs_read_auth" on storage.objects;
drop policy if exists "docs_write_auth" on storage.objects;
drop policy if exists "docs_update_auth" on storage.objects;
drop policy if exists "docs_delete_auth" on storage.objects;

create policy "docs_read_auth" on storage.objects
  for select to authenticated using (bucket_id = 'docs');
create policy "docs_write_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'docs');
create policy "docs_update_auth" on storage.objects
  for update to authenticated using (bucket_id = 'docs');
create policy "docs_delete_auth" on storage.objects
  for delete to authenticated using (bucket_id = 'docs');
