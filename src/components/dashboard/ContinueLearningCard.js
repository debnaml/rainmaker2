'use client';

import Image from 'next/image';
import Link from 'next/link';
import ClockIcon from '~/components/icons/ClockIcon';

function computeProgress(lesson) {
  const progress = lesson?.progress;
  const rawPercent = Number(progress?.progressPercent);
  if (Number.isFinite(rawPercent)) {
    return { value: Math.max(0, Math.min(100, Math.round(rawPercent))), hasData: true };
  }
  if (progress?.status === 'completed') {
    return { value: 100, hasData: true };
  }
  if (progress) {
    return { value: 0, hasData: true };
  }
  return { value: 0, hasData: false };
}

function getLessonType(lesson) {
  const moduleType = lesson?.module?.type;
  if (typeof moduleType === 'string' && moduleType.length > 0) {
    const lower = moduleType.toLowerCase();
    if (lower === 'core') return 'Core';
    if (lower === 'bitesize') return 'Bitesize';
    return moduleType;
  }
  const format = lesson?.format;
  return typeof format === 'string' ? format : 'Lesson';
}

function getPresenters(lesson) {
  const rawValues = [
    lesson?.presenters,
    lesson?.presenter,
    lesson?.facilitators,
    lesson?.facilitator,
    lesson?.instructors,
    lesson?.instructor,
  ];

  const collected = rawValues
    .flatMap((value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return [value];
    })
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      if (typeof item.name === 'string') return item.name;
      if (typeof item.fullName === 'string') return item.fullName;
      return null;
    })
    .filter((name) => typeof name === 'string' && name.trim().length > 0)
    .map((name) => name.trim());

  const unique = [...new Set(collected)];
  return unique;
}

export default function ContinueLearningCard({ lesson, isLoading = false }) {
  if (isLoading) {
    return (
      <article className="flex flex-col gap-4 rounded-[5px] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="h-24 w-36 animate-pulse rounded-md bg-purplebg" />
          <div className="flex flex-1 flex-col gap-3">
            <div className="h-4 w-24 animate-pulse rounded-md bg-purplebg" />
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-purplebg" />
            <div className="h-2 w-full animate-pulse rounded-full bg-purplebg" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-purplebg" />
          </div>
        </div>
      </article>
    );
  }

  if (!lesson) {
    return (
      <article className="flex flex-col gap-3 rounded-[5px] bg-white p-6 shadow-sm text-sm text-textdark/70">
        <span className="text-base font-semibold text-primary">You&apos;re all caught up</span>
        <p>
          Once new lessons are available, we&apos;ll queue them here so you always know the next step in your learning path.
        </p>
      </article>
    );
  }

  const { value: progressPercent, hasData: hasProgressData } = computeProgress(lesson);
  const typeLabel = getLessonType(lesson);
  const typeBase = typeof typeLabel === 'string' && typeLabel.length > 0 ? typeLabel : 'Lesson';
  const normalizedType = typeBase.toLowerCase();
  const typeDisplay = `${typeBase}${normalizedType.includes('lesson') ? '' : ' Lesson'}`;
  const lessonTitle = lesson.title ?? 'Untitled lesson';
  const lessonHref = lesson.id ? `/lessons/${lesson.id}` : lesson.url ?? '#';
  const isExternal = Boolean(!lesson.id && lesson.url);
  const rawFormatLabel = lesson.format;
  const formatLabel = typeof rawFormatLabel === 'string' && rawFormatLabel.trim().length > 0 ? rawFormatLabel : null;
  const rawDurationLabel = lesson.duration;
  const durationLabel = typeof rawDurationLabel === 'string' && rawDurationLabel.trim().length > 0 ? rawDurationLabel : null;
  const imageUrl = lesson.image_url ?? lesson.imageUrl ?? null;
  const presenters = getPresenters(lesson);
  const rawCommentTotal =
    lesson.comment_count ?? lesson.comments_count ?? lesson.commentCount ?? lesson.comments ?? 0;
  const comments = Number.isFinite(Number(rawCommentTotal)) ? Number(rawCommentTotal) : 0;

  return (
    <article className="flex min-h-[260px] flex-col gap-6 rounded-[5px] bg-white p-6 shadow-sm md:flex-row md:items-stretch">
      <div className="relative h-40 w-full overflow-hidden rounded-md bg-purplebg/60 md:min-h-[260px] md:w-56 md:flex-shrink-0 md:self-stretch">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-primary">{typeDisplay}</span>
          <Link
            href={lessonHref}
            className="text-lg font-semibold leading-snug text-primary transition-colors hover:text-action"
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : undefined)}
          >
            {lessonTitle}
          </Link>
        </div>
        {hasProgressData || progressPercent === 0 ? (
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center justify-between text-sm text-textdark/70">
              <span>Progress</span>
              <span className="font-medium text-primary">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#D9D9D9]/60">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
        {presenters.length ? (
          <div className="text-sm text-textdark/70">
            Presented by {presenters.length > 1 ? presenters.join(', ') : presenters[0]}
          </div>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 text-sm text-textdark/70">
          {formatLabel ? <span className="font-medium text-primary/80">{formatLabel}</span> : null}
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 font-medium">
              <ClockIcon className="h-4 w-4 text-action" />
              <span>{durationLabel ?? 'View lesson'}</span>
            </span>
            <span className="flex items-center gap-2">
              <Image
                src={comments > 0 ? '/commentsicon.svg' : '/commentsicon-grey.svg'}
                alt=""
                width={16}
                height={16}
                aria-hidden="true"
              />
              <span className="text-sm text-textdark/70">{comments} {comments === 1 ? 'comment' : 'comments'}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
