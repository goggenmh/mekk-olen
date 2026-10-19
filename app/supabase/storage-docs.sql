-- =====================================================================
-- DOKUMENT BAK INNLOGGING  – «docs»-bøtta er privat
-- =====================================================================
-- Filene kan ikkje lenger hentast via ein open URL. Appen lagar ei signert
-- lenke (gyldig i 60 s) kvar gong nokon opnar eit vedlegg. Nye filer ligg i
-- ei mappe per butikk; eldre filer i rota er felles for innlogga.
-- Køyr ETTER at appversjonen med signerte lenker er ute.

update storage.buckets set public = false where id = 'docs';

drop policy if exists "docs_storage_all" on storage.objects;
drop policy if exists "docs_les" on storage.objects;
drop policy if exists "docs_ny" on storage.objects;
drop policy if exists "docs_endre" on storage.objects;
drop policy if exists "docs_slett" on storage.objects;

-- Lese/endre/slette: filer i eigen butikk-mappe, eller eldre filer i rota.
create policy "docs_les" on storage.objects for select to authenticated
  using (bucket_id = 'docs' and (
    array_length(storage.foldername(name), 1) is null
    or (storage.foldername(name))[1] = (select public.min_butikk())::text));
create policy "docs_endre" on storage.objects for update to authenticated
  using (bucket_id = 'docs' and (
    array_length(storage.foldername(name), 1) is null
    or (storage.foldername(name))[1] = (select public.min_butikk())::text));
create policy "docs_slett" on storage.objects for delete to authenticated
  using (bucket_id = 'docs' and (
    array_length(storage.foldername(name), 1) is null
    or (storage.foldername(name))[1] = (select public.min_butikk())::text));
-- Nye filer berre i eigen butikk-mappe.
create policy "docs_ny" on storage.objects for insert to authenticated
  with check (bucket_id = 'docs' and (storage.foldername(name))[1] = (select public.min_butikk())::text);
