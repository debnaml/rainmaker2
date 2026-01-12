import Image from 'next/image';
import Link from 'next/link';
import { collectPresenterNames } from '/lib/presenters';
import ClockIcon from '~/components/icons/ClockIcon';

function getLessonTypeLabel(lesson) {
  const moduleType = lesson?.module?.type;
  if (typeof moduleType === 'string' && moduleType.length > 0) {
    const lower = moduleType.toLowerCase();
    if (lower === 'core') return 'Core';
    if (lower === 'bitesize') return 'Bitesize';
    return moduleType;
  }
  const format = lesson?.format;
  return typeof format === 'string' && format.length > 0 ? format : 'Lesson';
}

function getLessonSummary(lesson) {
  const candidates = [
    lesson?.subtitle,
    lesson?.tagline,
    lesson?.short_description,
    lesson?.shortDescription,
    lesson?.summary,
    lesson?.description,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}


export default function NewestLessonsCard({ lessons = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex h-full flex-col overflow-hidden rounded-[5px] border border-[#E6E2F3] bg-white shadow-[0_8px_16px_-14px_rgba(15,30,75,0.25)]"
          >
            <div className="h-32 w-full animate-pulse bg-purplebg/50" />
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="h-4 w-24 animate-pulse rounded-md bg-purplebg/60" />
              <div className="h-5 w-full animate-pulse rounded-md bg-purplebg/60" />
              <div className="mt-auto h-4 w-20 animate-pulse rounded-md bg-purplebg/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!lessons.length) {
    return (
      <div className="rounded-[5px] border border-dashed border-[#C7C2DD] bg-white/40 p-6 text-center text-sm text-textdark/70">
        No lessons found yet. Check back soon for new content.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {lessons.map((lesson) => {
        const lessonHref = lesson?.id ? `/lessons/${lesson.id}` : lesson?.url ?? '#';
        const isExternal = Boolean(!lesson?.id && lesson?.url);
        const lessonTitle = lesson?.title ?? 'Untitled lesson';
        const typeLabel = getLessonTypeLabel(lesson);
        const durationLabel = lesson?.duration ?? null;
        const imageUrl = lesson?.image_url ?? lesson?.imageUrl ?? null;
        const summary = getLessonSummary(lesson);
        const typeDisplay = `${typeLabel}${typeLabel.toLowerCase().includes('lesson') ? '' : ' Lesson'}`;
        const presenters = collectPresenterNames(lesson);

        return (
          <Link
            key={lesson?.id ?? lessonTitle}
            href={lessonHref}
            className="group flex h-full flex-col overflow-hidden rounded-[5px] border border-[#E6E2F3] bg-white shadow-[0_8px_16px_-14px_rgba(15,30,75,0.25)] transition-shadow hover:shadow-[0_18px_35px_-15px_rgba(15,30,75,0.45)]"
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : undefined)}
          >
            <div className="relative aspect-[4/3] w-full bg-purplebg/30">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="text-sm font-semibold text-primary">{typeDisplay}</span>
              <span className="text-lg font-semibold leading-snug text-primary transition-colors group-hover:text-action">
                {lessonTitle}
              </span>
              {summary ? (
                <p className="line-clamp-2 text-sm leading-relaxed text-textdark/70">{summary}</p>
              ) : null}
              {presenters.length ? (
                <span className="text-sm text-textdark/70">
                  Presented by {presenters.length > 1 ? presenters.join(', ') : presenters[0]}
                </span>
              ) : null}
              <div className="mt-auto flex items-center gap-2 text-sm font-medium text-textdark/70">
                <ClockIcon className="h-4 w-4 text-action" />
                <span>{durationLabel ?? 'View lesson'}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
