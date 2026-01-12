'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '/lib/authContext';
import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'All Lessons', href: '/lessons' },
  { label: 'Core Lessons', href: '/lessons/core' },
  { label: 'Bitesize Lessons', href: '/lessons/bitesize' },
  { label: 'Stories', href: '/stories' },
  { label: 'Favourite Lessons', href: '/lessons/favourites' },
];

const ROLE_PARAM_FALLBACK = 'normal';
const DURATION_FILTERS = [
  { value: 'all', label: 'All lengths' },
  { value: 'short', label: 'Under 15 min' },
  { value: 'medium', label: '15 - 30 min' },
  { value: 'long', label: 'Over 30 min' },
];

const parseDurationMinutes = (duration) => {
  if (!duration) return null;
  const numericMatch = String(duration).match(/(\d+(?:\.\d+)?)/);
  if (!numericMatch) return null;
  const minutes = Number.parseFloat(numericMatch[1]);
  return Number.isFinite(minutes) ? minutes : null;
};

function buildLessonsQuery({ role, moduleType, favouritesFor }) {
  const params = new URLSearchParams();
  params.set('role', role ?? ROLE_PARAM_FALLBACK);
  if (moduleType) {
    params.set('moduleType', moduleType);
  }
  if (favouritesFor) {
    params.set('favouritesFor', favouritesFor);
  }
  return params.toString();
}

function resolveLessonTone(lesson) {
  const formatValueRaw = typeof lesson?.format === 'string' ? lesson.format : '';
  const formatValue = formatValueRaw.trim().toUpperCase();

  if (formatValue.includes('F2F') || formatValue === 'WORKSHOP' || formatValue.includes('LIVE WEBINAR')) {
    return 'facilitated';
  }

  if (formatValue.includes('TEAMS WORKSHOP')) {
    return 'teamsWorkshop';
  }

  if (formatValue.includes('FLIPSNACK')) {
    return 'flipsnack';
  }

  if (formatValue.includes('PODCAST') || formatValue.includes('PRE-RECORDED WEBINAR')) {
    return 'async';
  }

  return 'default';
}

const TONE_STYLES = {
  facilitated: {
    buttonStart: '#51318F',
    buttonEnd: '#6B48BF',
  },
  teamsWorkshop: {
    buttonStart: '#0097A9',
    buttonEnd: '#00B7C8',
  },
  flipsnack: {
    buttonStart: '#4A90E2',
    buttonEnd: '#7CC4FF',
  },
  async: {
    buttonStart: '#8BAF00',
    buttonEnd: '#C4D600',
  },
  default: {
    buttonStart: '#4B5563',
    buttonEnd: '#6B7280',
  },
};

function getLessonToneStyles(lesson) {
  const tone = resolveLessonTone(lesson);
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.default;
  return { tone, ...styles };
}

function resolveLessonButtonLabel(lesson) {
  const formatValueRaw = typeof lesson?.format === 'string' ? lesson.format : '';
  const formatValue = formatValueRaw.trim().toUpperCase();

  if (formatValue.includes('PODCAST')) {
    return 'Watch podcast';
  }

  if (formatValue.includes('PRE-RECORDED WEBINAR')) {
    return 'Watch webinar';
  }

  if (formatValue.includes('VIDEO')) {
    return 'Watch video';
  }

  if (formatValue.includes('LIVE WEBINAR')) {
    return 'Join webinar';
  }

  if (formatValue.includes('F2F')) {
    return 'View F2F';
  }

  if (formatValue === 'WORKSHOP' || formatValue.includes('TEAMS WORKSHOP')) {
    return 'Join workshop';
  }

  if (formatValue.includes('FLIPSNACK')) {
    return 'View Flipsnack';
  }

  return 'View lesson';
}

export default function LessonsExplorer({
  pageTitle,
  pageDescription,
  moduleType,
  showFavouritesOnly = false,
  emptyStateMessage = 'No lessons available yet.',
}) {
  const { user, loading: authLoading } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [durationFilter, setDurationFilter] = useState('all');

  const roleParam = useMemo(() => user?.role ?? ROLE_PARAM_FALLBACK, [user?.role]);
  const userId = user?.id ?? null;
  const favouritesFor = showFavouritesOnly ? userId : null;

  const availableFormats = useMemo(() => {
    const unique = new Set();
    lessons.forEach((lesson) => {
      if (lesson?.format) {
        unique.add(lesson.format);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [lessons]);

  const availableTags = useMemo(() => {
    const unique = new Set();
    lessons.forEach((lesson) => {
      if (Array.isArray(lesson?.tags)) {
        lesson.tags.forEach((tag) => {
          if (tag) unique.add(tag);
        });
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    if (!Array.isArray(lessons)) return [];

    const passesFilters = lessons.filter((lesson) => {
      const title = lesson?.title ?? '';
      const description = lesson?.description ?? '';
      const formatValue = lesson?.format ?? '';

      const matchesSearch = searchTerm
        ? `${title} ${description}`.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesFormat =
        formatFilter === 'all' || (formatValue && formatValue.toLowerCase() === formatFilter.toLowerCase());

      const lessonDuration = parseDurationMinutes(lesson?.duration);
      const matchesDuration = (() => {
        switch (durationFilter) {
          case 'short':
            return lessonDuration != null ? lessonDuration < 15 : true;
          case 'medium':
            return lessonDuration != null ? lessonDuration >= 15 && lessonDuration <= 30 : true;
          case 'long':
            return lessonDuration != null ? lessonDuration > 30 : true;
          default:
            return true;
        }
      })();

      const matchesTags = selectedTags.length === 0
        ? true
        : Array.isArray(lesson?.tags)
            ? selectedTags.every((tag) => lesson.tags?.includes(tag))
            : false;

      return matchesSearch && matchesFormat && matchesTags && matchesDuration;
    });

    return passesFilters;
  }, [lessons, searchTerm, formatFilter, selectedTags, durationFilter]);

  useEffect(() => {
    let isMounted = true;

    if (authLoading) {
      return () => {
        isMounted = false;
      };
    }

    if (showFavouritesOnly && !favouritesFor) {
      if (isMounted) {
        setLessons([]);
        setLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    async function fetchLessons() {
      try {
        setLoading(true);
        setError(null);

        const query = buildLessonsQuery({
          role: roleParam,
          moduleType,
          favouritesFor,
        });
        const response = await fetch(`/api/lessons?${query}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load lessons.');
        }

        if (!isMounted) return;

        setLessons(Array.isArray(payload.lessons) ? payload.lessons : []);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch lessons', err);
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLessons();

    return () => {
      isMounted = false;
    };
  }, [roleParam, moduleType, favouritesFor, authLoading, showFavouritesOnly]);

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="space-y-2">
            <h1 className="mb-[30px] pt-[45px] text-left text-3xl font-semibold text-primary">{pageTitle}</h1>
            {pageDescription ? (
              <p className="text-base text-textdark/80">{pageDescription}</p>
            ) : null}
          </header>

          {loading ? (
            <p className="text-sm text-textdark/70">Loading lessons…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-textdark/70">{emptyStateMessage}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              <section className="md:col-span-2">
                {filteredLessons.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-primary/40 bg-white/40 p-6 text-sm text-textdark/70">
                    No lessons match your filters yet.
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {filteredLessons.map((lesson) => {
                      const {
                        id,
                        title,
                        format,
                        duration,
                        image_url: imageUrl,
                        url,
                        is_enhanced_only: isEnhancedOnly,
                        created_at: createdAt,
                        tags,
                        sequence,
                        module: moduleInfo,
                        is_favourite: isFavourite,
                      } = lesson;

                      const displayTitle = title || 'Untitled lesson';
                      const normalizedUrl = typeof url === 'string' ? url.trim() : '';
                      const formatLabel = format ? format : null;
                      const durationLabel = duration ? duration : null;
                      let createdLabel = 'recently';

                      const lessonTags = Array.isArray(tags) ? tags.slice(0, 3) : [];

                      if (createdAt) {
                        const parsed = new Date(createdAt);
                        if (!Number.isNaN(parsed.getTime())) {
                          createdLabel = parsed.toLocaleDateString();
                        }
                      }

                      const { buttonStart, buttonEnd } = getLessonToneStyles(lesson);
                      const buttonLabel = resolveLessonButtonLabel(lesson);

                      const buttonStyle = {
                        background: `linear-gradient(135deg, ${buttonStart} 0%, ${buttonEnd} 100%)`,
                        color: '#FFFFFF',
                      };
                      const buttonClasses =
                        'inline-flex items-center self-start rounded-full px-4 py-2 text-sm font-semibold transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white';

                      const hasPrimaryLink = normalizedUrl.length > 0;
                      const viewLessonButton = (() => {
                        if (!hasPrimaryLink) {
                          return (
                            <span className="inline-flex items-center self-start rounded-full bg-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#6B7280]">
                              Coming soon
                            </span>
                          );
                        }

                        if (id) {
                          return (
                            <Link href={`/lessons/${id}`} className={buttonClasses} style={buttonStyle}>
                              {buttonLabel}
                            </Link>
                          );
                        }

                        return (
                          <a
                            href={normalizedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonClasses}
                            style={buttonStyle}
                          >
                            {buttonLabel}
                          </a>
                        );
                      })();
                      const shouldShowComingSoon = !hasPrimaryLink;

                      return (
                        <article
                          key={id ?? `${displayTitle}-${sequence ?? ''}`}
                          className="flex h-full flex-col overflow-hidden rounded-lg border border-[#E6E6E6] bg-white transition-shadow hover:shadow-md"
                        >
                          <div className="relative h-36 w-full bg-[#F5F5F5]">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="flex flex-1 flex-col gap-4 p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-2">
                                <h2 className="text-xl font-semibold text-primary">{displayTitle}</h2>
                                {shouldShowComingSoon ? (
                                  <p className="text-sm font-medium text-textdark/60">Coming soon</p>
                                ) : null}
                              </div>
                              {(isEnhancedOnly || isFavourite) ? (
                                <div className="flex flex-col items-end gap-2">
                                  {isEnhancedOnly ? (
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                      Enhanced only
                                    </span>
                                  ) : null}
                                  {isFavourite ? (
                                    <span className="rounded-full bg-[#FFE8C7] px-3 py-1 text-xs font-medium text-[#7C4A03]">
                                      Favourite
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            {lessonTags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {lessonTags.map((tag) => (
                                  <span
                                    key={`${id}-${tag}`}
                                    className="rounded-full bg-[#E8E1F2] px-3 py-1 text-xs font-medium text-[#2F2B3A]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}

                            <div className="mt-auto flex items-center justify-between gap-3 text-sm">
                              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-textdark/60">
                                {formatLabel ? <span>{formatLabel}</span> : null}
                                {durationLabel ? <span>{durationLabel}</span> : null}
                                {moduleInfo?.title ? <span>{moduleInfo.title}</span> : null}
                              </div>
                              <span className="text-xs text-textdark/50">Created {createdLabel}</span>
                            </div>

                            {viewLessonButton}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="flex flex-col gap-6 rounded-lg border border-[#D9D9D9] bg-white p-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-primary">Search & Filters</h2>
                  <p className="text-sm text-textdark/70">Refine the lesson list by keyword or format.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="lesson-search" className="text-xs font-medium uppercase tracking-wide text-textdark/60">
                    Search
                  </label>
                  <input
                    id="lesson-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search lessons"
                    className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="lesson-format" className="text-xs font-medium uppercase tracking-wide text-textdark/60">
                    Format
                  </label>
                  <select
                    id="lesson-format"
                    value={formatFilter}
                    onChange={(event) => setFormatFilter(event.target.value)}
                    className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-textdark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">All formats</option>
                    {availableFormats.map((formatOption) => (
                      <option key={formatOption} value={formatOption}>
                        {formatOption}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-textdark/60">
                    Length
                  </span>
                  <div className="grid gap-2">
                    {DURATION_FILTERS.map(({ value, label }) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-textdark/80">
                        <input
                          type="radio"
                          name="lesson-duration"
                          value={value}
                          checked={durationFilter === value}
                          onChange={(event) => setDurationFilter(event.target.value)}
                          className="h-4 w-4"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-textdark/60">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.length === 0 ? (
                      <p className="text-xs text-textdark/50">No tags available yet.</p>
                    ) : (
                      availableTags.map((tag) => {
                        const isActive = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setSelectedTags((prev) =>
                                prev.includes(tag)
                                  ? prev.filter((item) => item !== tag)
                                  : [...prev, tag]
                              )
                            }
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              isActive
                                ? 'border-primary bg-primary text-white'
                                : 'border-[#D9D9D9] bg-white text-textdark hover:border-primary/60 hover:text-primary'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFormatFilter('all');
                    setSelectedTags([]);
                    setDurationFilter('all');
                  }}
                  className="self-start rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Reset filters
                </button>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
