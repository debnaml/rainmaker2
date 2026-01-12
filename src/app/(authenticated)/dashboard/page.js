'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '/lib/authContext';
import { collectPresenterNames } from '/lib/presenters';
import ContinueLearningCard from '~/components/dashboard/ContinueLearningCard';
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

function normalizeModuleType(value) {
  if (typeof value !== 'string') return null;
  return value.toLowerCase();
}

function isCoreOrBitesizeLesson(lesson) {
  const moduleType = normalizeModuleType(lesson?.module?.type);
  if (moduleType === 'core' || moduleType === 'bitesize') return true;

  if (!moduleType) {
    const format = typeof lesson?.format === 'string' ? lesson.format.toLowerCase() : '';
    if (format.includes('core') || format.includes('bite')) return true;
  }

  return false;
}

function sortLessons(lessons) {
  return [...lessons].sort((a, b) => {
    const moduleSeqA = a?.module?.sequence ?? 9999;
    const moduleSeqB = b?.module?.sequence ?? 9999;
    if (moduleSeqA !== moduleSeqB) return moduleSeqA - moduleSeqB;

    const lessonSeqA = a?.sequence ?? 9999;
    const lessonSeqB = b?.sequence ?? 9999;
    if (lessonSeqA !== lessonSeqB) return lessonSeqA - lessonSeqB;

    return (a?.title ?? '').localeCompare(b?.title ?? '');
  });
}

function isLessonCompleted(lesson) {
  const status = lesson?.progress?.status;
  if (status === 'completed') return true;
  const percent = Number(lesson?.progress?.progressPercent);
  return Number.isFinite(percent) && percent >= 100;
}

function isLessonInProgress(lesson) {
  const status = lesson?.progress?.status;
  if (status === 'in_progress') return true;
  const percent = Number(lesson?.progress?.progressPercent);
  return Number.isFinite(percent) && percent > 0 && percent < 100;
}

function selectNextLesson(allLessons, desiredType) {
  const filtered = allLessons.filter((lesson) => {
    const moduleType = normalizeModuleType(lesson?.module?.type);
    if (!desiredType) return true;
    if (moduleType) return moduleType === desiredType;
    if (desiredType === 'bitesize') {
      const format = typeof lesson?.format === 'string' ? lesson.format.toLowerCase() : '';
      return format.includes('bite');
    }
    return false;
  });

  if (!filtered.length) return null;

  const sorted = sortLessons(filtered);
  const active = sorted.find((lesson) => isLessonInProgress(lesson) && !isLessonCompleted(lesson));
  if (active) return active;

  const pending = sorted.find((lesson) => !isLessonCompleted(lesson));
  return pending ?? null;
}

function extractLessonTimestamp(lesson) {
  const rawDate =
    lesson?.created_at ??
    lesson?.createdAt ??
    lesson?.published_at ??
    lesson?.publishedAt ??
    lesson?.updated_at ??
    lesson?.updatedAt ??
    null;

  if (!rawDate) return null;
  const timestamp = new Date(rawDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
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
  const [nextLesson, setNextLesson] = useState(null);
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
          setNextLesson(null);
          setRecentLessons([]);
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

        const nextCoreLesson = selectNextLesson(lessons, 'core');
        if (nextCoreLesson) {
          setNextLesson(nextCoreLesson);
        } else {
          const nextBitesizeLesson = selectNextLesson(lessons, 'bitesize');
          setNextLesson(nextBitesizeLesson ?? null);
        }

        const newestSource = lessons.filter(isCoreOrBitesizeLesson);
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
          setNextLesson(null);
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

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-0 px-6 py-[30px]">
          <h1 className="text-3xl font-semibold text-primary pt-[45px] mb-[30px] text-left">
            {`Welcome back, ${firstName}!`}
          </h1>
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
            <div className="flex flex-col gap-4 md:col-span-2">
              <h2 className="text-xl font-semibold text-primary">Continue Learning</h2>
              <ContinueLearningCard lesson={nextLesson} isLoading={progressLoading} />
            </div>
            <div className="flex flex-col gap-4 md:h-full">
              <h2 className="text-xl font-semibold text-primary">Events</h2>
              {/* TODO: Replace stub props with real event data when API is connected */}
              <EventsListCard events={events} isLoading={eventsLoading} />
            </div>
          </section>
          <section className="mt-8 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-primary">Newest Lessons</h2>
            <NewestLessonsCard lessons={recentLessons} isLoading={progressLoading} />
          </section>
          
        </div>
      </main>
    </div>
  );
}
