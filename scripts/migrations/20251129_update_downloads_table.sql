-- Update downloads table to support lesson resources metadata
ALTER TABLE public.downloads
    ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'file',
    ADD COLUMN IF NOT EXISTS mime_type text,
    ADD COLUMN IF NOT EXISTS file_size bigint,
    ADD COLUMN IF NOT EXISTS external_url text,
    ADD COLUMN IF NOT EXISTS storage_path text,
    ADD COLUMN IF NOT EXISTS sequence integer,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.downloads
    ADD CONSTRAINT downloads_resource_type_check
    CHECK (resource_type IN ('file', 'link', 'flipsnack'));

CREATE INDEX IF NOT EXISTS downloads_lesson_id_idx ON public.downloads(lesson_id);

-- Remove default so future inserts must provide explicit value.
ALTER TABLE public.downloads
    ALTER COLUMN resource_type DROP DEFAULT;

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_downloads_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS biud_downloads_updated_at ON public.downloads;
CREATE TRIGGER biud_downloads_updated_at
    BEFORE INSERT OR UPDATE ON public.downloads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_downloads_updated_at();
