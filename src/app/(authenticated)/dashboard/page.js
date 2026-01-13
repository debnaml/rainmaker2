'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '/lib/authContext';
import { collectPresenterNames } from '/lib/presenters';
import EventsListCard from '~/components/dashboard/EventsListCard';
import LiveEventsCard from '~/components/dashboard/LiveEventsCard';
import NewestLessonsCard from '~/components/dashboard/NewestLessonsCard';
import OverallProgressCard from '~/components/dashboard/OverallProgressCard';
import PeerLeaderboardCard from '~/components/dashboard/PeerLeaderboardCard';
import SubNav from '~/components/SubNav';

const SUB_NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Current Progress', href: '/current-progress' },
  { label: 'Leaderboard', href: '/leaderboard' },
];

const ROLE_PARAM_FALLBACK = 'normal';
const LIVE_EVENT_KEYWORDS = ['live webinar', 'f2f', 'workshop', 'teams workshop'];
const SHOW_PROGRESS_STRIP = false;
const LAUNCH_DAY_DECK_PATH = '/launch-day-deck.pdf';
const WORKSHOP_IMAGE_FALLBACK = '/images/rm-bg.jpg';

const WORKSHOP_SPOTLIGHT = {
  eyebrow: 'Deborah Hall · Public speaking',
  title: 'Being a Trusted Adviser',
  bulletPoints: ['Be a Trusted Adviser', 'Presenting with Impact', 'Personal Style'],
  highlights: [
    { label: 'Facilitator', value: 'Deborah Hall' },
    { label: 'Duration', value: 'Half day' },
    { label: 'Format', value: 'In-person workshop' },
  ],
  sessionDates: ['23 Feb', '24 Feb', '2 Mar', '3 Mar'],
  ctaLabel: 'Book now',
  ctaHref: 'https://birketts.kallidus-suite.com/learn/#/course/bfd0c2e4-5af6-4ada-89ee-e41eec259300',
  backgroundImage: '/images/deborah-hall-workshop.jpg',
  imageSrc: '/images/deborah-hall-workshop.jpg',
  imageAlt: 'Deborah Hall leading a trusted advisor workshop',
};

function extractLessonTimestamp(lesson) {
  const rawDate = lesson?.created_at ?? lesson?.createdAt ?? lesson?.published_at ?? lesson?.publishedAt ?? null;

  if (!rawDate) return null;
  const timestamp = new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hasLessonLink(lesson) {
  if (!lesson) return false;
  if (lesson.id) return true;
  const url = typeof lesson?.url === 'string' ? lesson.url.trim() : '';
  return url.length > 0;
}

function sortByNewestLessons(lessons) {
  return [...lessons].sort((a, b) => {
    const timeA = extractLessonTimestamp(a);
    const timeB = extractLessonTimestamp(b);

    const hasTimeA = timeA !== null;
    const hasTimeB = timeB !== null;

    if (hasTimeA && hasTimeB) return timeB - timeA;
    if (hasTimeA) return -1;
    if (hasTimeB) return 1;
    return 0;
  });
}

function isLiveEventLesson(lesson) {
  if (!lesson) return false;
  const format = typeof lesson?.format === 'string' ? lesson.format.toLowerCase() : '';
  const hasLink = typeof lesson?.url === 'string' && lesson.url.trim().length > 0;
  if (!hasLink) return false;
  return LIVE_EVENT_KEYWORDS.some((keyword) => format.includes(keyword));
}

function serializeEventLesson(lesson) {
  const trimmedUrl = typeof lesson?.url === 'string' ? lesson.url.trim() : '';
  const internalHref = lesson?.id ? `/lessons/${lesson.id}` : trimmedUrl;
  const formatLabel = lesson?.format ? String(lesson.format).trim() : 'Live session';
  const durationLabel = lesson?.duration ? String(lesson.duration).trim() : null;
  const description = lesson?.description ? String(lesson.description).trim() : null;
  const presenters = collectPresenterNames(lesson);
  return {
    id: lesson?.id ?? trimmedUrl,
    title: lesson?.title ?? 'Live session',
    href: internalHref,
    isInternal: Boolean(lesson?.id),
    formatLabel,
    durationLabel,
    description,
    presenters,
  };
}


export default function DashboardPage() {
  const { user } = useAuth();
  const [overallProgress, setOverallProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [liveEventsCompleted, setLiveEventsCompleted] = useState(0);
  const [liveEventsTotal, setLiveEventsTotal] = useState(0);
  const [recentLessons, setRecentLessons] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [leaderboardPosition, setLeaderboardPosition] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadOverallProgress() {
      if (!user?.id) return;
      try {
        setProgressLoading(true);
        setEventsLoading(true);
        const params = new URLSearchParams({
          role: user.role ?? ROLE_PARAM_FALLBACK,
          progressFor: user.id,
        });
        const response = await fetch(`/api/lessons?${params.toString()}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load overall progress.');
        }

        if (!isMounted) return;

        const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];
        if (!lessons.length) {
          setOverallProgress(0);
          setLiveEventsCompleted(0);
          setLiveEventsTotal(0);
          setRecentLessons([]);
          setEvents([]);
          return;
        }

        const totalPercent = lessons.reduce((acc, lesson) => {
          const progressPercent = Number(lesson?.progress?.progressPercent);
          if (Number.isFinite(progressPercent)) {
            return acc + progressPercent;
          }
          if (lesson?.progress?.status === 'completed') {
            return acc + 100;
          }
          return acc;
        }, 0);

        const average = Math.round(totalPercent / lessons.length);
        setOverallProgress(Number.isFinite(average) ? Math.max(0, Math.min(100, average)) : 0);

        const liveLessons = lessons.filter((lesson) => {
          const format = lesson?.format ? String(lesson.format).toLowerCase() : '';
          return format.includes('live');
        });

        const liveTotal = liveLessons.length;
        const liveCompletedCount = liveLessons.filter((lesson) => {
          const status = lesson?.progress?.status;
          if (status === 'completed') return true;
          const progressPercent = Number(lesson?.progress?.progressPercent);
          return Number.isFinite(progressPercent) && progressPercent >= 100;
        }).length;

        setLiveEventsTotal(liveTotal);
        setLiveEventsCompleted(liveCompletedCount);

        const newestSource = lessons.filter(hasLessonLink);
        const newest = sortByNewestLessons(newestSource).slice(0, 4);
        setRecentLessons(newest);
        const liveEventLessons = lessons.filter(isLiveEventLesson).slice(0, 4).map(serializeEventLesson);
        setEvents(liveEventLessons);

      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load overall progress', error);
        if (isMounted) {
          setOverallProgress(0);
          setLiveEventsCompleted(0);
          setLiveEventsTotal(0);
          setRecentLessons([]);
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setProgressLoading(false);
          setEventsLoading(false);
        }
      }
    }

    loadOverallProgress();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadLeaderboardPosition() {
      if (!user?.id || !user?.peerGroupId) {
        setLeaderboardPosition(null);
        setLeaderboardLoading(false);
        return;
      }

      try {
        setLeaderboardLoading(true);
        const response = await fetch(`/api/leaderboard?userId=${encodeURIComponent(user.id)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to load leaderboard position.');
        }

        const payload = await response.json();
        if (!isMounted) return;

        const entries = Array.isArray(payload?.entries) ? payload.entries : [];
        const currentUserEntry = entries.find((entry) => entry?.id === user.id);
        setLeaderboardPosition(currentUserEntry?.rank ?? null);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load leaderboard position', error);
        if (isMounted) {
          setLeaderboardPosition(null);
        }
      } finally {
        if (isMounted) {
          setLeaderboardLoading(false);
        }
      }
    }

    loadLeaderboardPosition();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user?.id, user?.peerGroupId]);

  if (!user) return null;

  const firstName = user?.name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const inPeerGroup = Boolean(user?.peerGroupId);
  const workshopBackgroundImage = WORKSHOP_SPOTLIGHT.backgroundImage || WORKSHOP_IMAGE_FALLBACK;
  const workshopImageSrc = WORKSHOP_SPOTLIGHT.imageSrc || WORKSHOP_IMAGE_FALLBACK;
  const workshopImageAlt = WORKSHOP_SPOTLIGHT.imageAlt ?? 'Workshop illustration';

  function handleWorkshopImageError(event) {
    const fallbackAlreadyApplied = event?.currentTarget?.dataset?.fallback === 'true';
    if (fallbackAlreadyApplied) return;
    // eslint-disable-next-line no-param-reassign
    event.currentTarget.src = WORKSHOP_IMAGE_FALLBACK;
    // eslint-disable-next-line no-param-reassign
    event.currentTarget.dataset.fallback = 'true';
  }

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-0 px-6 py-[30px]">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            {`Welcome back, ${firstName}!`}
          </h1>
          <section className="w-full rounded-[5px] border border-[#E6E2F3] bg-white p-5 text-textdark shadow-[0_6px_14px_-12px_rgba(15,30,75,0.25)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-base font-medium text-primary">
                Thank you for attending the Rainmaker launch days in December – the launch day deck is available here.
              </p>
              <a
                href={LAUNCH_DAY_DECK_PATH}
                download
                className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Download deck</span>
              </a>
            </div>
          </section>
          {SHOW_PROGRESS_STRIP ? (
            <section className="grid min-h-[120px] w-full grid-cols-1 overflow-hidden rounded-[5px] bg-white md:grid-cols-3">
              <OverallProgressCard
                percent={overallProgress ?? 0}
                isLoading={progressLoading}
                linkHref="/current-progress"
              />
              <PeerLeaderboardCard
                position={leaderboardPosition}
                isLoading={leaderboardLoading}
                disabled={!inPeerGroup}
                linkHref="/leaderboard"
              />
              <LiveEventsCard
                completed={liveEventsCompleted}
                total={liveEventsTotal}
                isLoading={progressLoading}
                disabled
              />
            </section>
          ) : null}
          <section className="mt-8 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex h-full flex-col gap-4 md:col-span-2 md:h-full">
              <h2 className="text-xl font-semibold text-primary">Next Steps</h2>
              <section
                className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-white/20 bg-primary text-white shadow-sm"
                style={{
                  backgroundImage: `linear-gradient(135deg, rgba(41,16,82,0.95), rgba(120,82,186,0.85)), url(${workshopBackgroundImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="grid h-full w-full gap-6 bg-gradient-to-br from-black/40 via-transparent to-black/30 p-6 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="flex h-full flex-col gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                      {WORKSHOP_SPOTLIGHT.eyebrow}
                    </p>
                    <h3 className="text-2xl font-semibold leading-tight md:text-3xl">{WORKSHOP_SPOTLIGHT.title}</h3>
                    <div className="flex flex-col gap-2">
                      <ul className="ml-4 list-disc space-y-1 text-sm text-white/85">
                        {WORKSHOP_SPOTLIGHT.bulletPoints.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Session dates</p>
                      <p className="text-sm font-medium text-white">
                        {WORKSHOP_SPOTLIGHT.sessionDates.join(' · ')}
                      </p>
                    </div>
                    <div className="mt-auto pt-4">
                      <a
                        href={WORKSHOP_SPOTLIGHT.ctaHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-lavender"
                      >
                        {WORKSHOP_SPOTLIGHT.ctaLabel}
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5 rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <div className="relative h-44 w-full overflow-hidden rounded-xl border border-white/20">
                      <img
                        src={workshopImageSrc}
                        alt={workshopImageAlt}
                        loading="lazy"
                        onError={handleWorkshopImageError}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-black/10" aria-hidden="true" />
                    </div>
                    <dl className="grid gap-3 text-sm">
                      {WORKSHOP_SPOTLIGHT.highlights.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0"
                        >
                          <dt className="text-white/70">{item.label}</dt>
                          <dd className="font-semibold text-white">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex flex-col gap-4 md:h-full">
              <h2 className="text-xl font-semibold text-primary">Events</h2>
              {/* TODO: Replace stub props with real event data when API is connected */}
              <EventsListCard events={events} isLoading={eventsLoading} />
            </div>
          </section>
          <section className="mt-8 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-primary">Featured</h2>
            <NewestLessonsCard lessons={recentLessons} isLoading={progressLoading} />
          </section>
          
        </div>
      </main>
    </div>
  );
}
