'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SubNav from '~/components/SubNav';
import { useAuth } from '/lib/authContext';

const SUB_NAV_ITEMS = [
  { label: 'All Lessons', href: '/lessons' },
  { label: 'Core Lessons', href: '/lessons/core' },
  { label: 'Bitesize Lessons', href: '/lessons/bitesize' },
  { label: 'Favourite Lessons', href: '/lessons/favourites' },
];

const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

const DEFAULT_PROGRESS = {
  status: 'not_started',
  progressPercent: 0,
  startedAt: null,
  completedAt: null,
  updatedAt: null,
  metadata: null,
};

const MAX_COMMENT_LENGTH = 2000;

function formatCommentTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function extractAuthorName(user) {
  if (!user) return 'Anonymous';
  const candidate = user.display_name ?? user.displayName ?? user.name;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0];
  }
  return 'Anonymous';
}

function normalizeComment(record) {
  if (!record) return null;
  const author = record.author ?? record.user ?? null;
  const content = typeof record.content === 'string' ? record.content : '';
  return {
    id: record.id ?? null,
    lessonId: record.lessonId ?? record.lesson_id ?? null,
    userId: record.userId ?? record.user_id ?? author?.id ?? null,
    content,
    createdAt: record.createdAt ?? record.created_at ?? null,
    authorName: extractAuthorName(author ?? { user_id: record.user_id }),
  };
}

function sortCommentsDesc(a, b) {
  const timeAValue = new Date(a?.createdAt ?? 0).getTime();
  const timeBValue = new Date(b?.createdAt ?? 0).getTime();
  const timeA = Number.isFinite(timeAValue) ? timeAValue : 0;
  const timeB = Number.isFinite(timeBValue) ? timeBValue : 0;
  return timeB - timeA;
}

function formatModuleType(type) {
  if (!type) return 'General';
  const lower = type.toLowerCase();
  if (lower === 'bitesize') return 'Bitesize';
  if (lower === 'core') return 'Core';
  return type;
}

function formatDuration(duration) {
  if (!duration) return 'Flexible length';
  return duration;
}

function isFlipsnackType(type) {
  if (!type) return false;
  const lower = String(type).toLowerCase();
  return lower.includes('flip') || lower.includes('snack');
}

function isFaceToFaceType(type) {
  if (!type) return false;
  return String(type).toLowerCase() === 'f2f';
}

function isPodcastType(type) {
  if (!type) return false;
  return String(type).toLowerCase().includes('podcast');
}

function isPreRecordedWebinarType(type) {
  if (!type) return false;
  const normalized = String(type).toLowerCase();
  return (
    normalized.includes('pre-recorded webinar') ||
    normalized.includes('pre recorded webinar') ||
    normalized.includes('prerecorded webinar')
  );
}

function isVideoType(type) {
  if (!type) return false;
  if (isPreRecordedWebinarType(type)) return true;
  return String(type).toLowerCase().includes('video');
}

function isLiveWebinarType(type) {
  if (!type) return false;
  const normalized = String(type).toLowerCase();
  return normalized.includes('live webinar');
}

function isWorkshopType(type) {
  if (!type) return false;
  const normalized = String(type).toLowerCase();
  return normalized.includes('workshop');
}

function ProgressPill({ status }) {
  const label = STATUS_LABELS[status] ?? 'Not started';
  const color = (() => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'skipped':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  })();

  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>{label}</span>;
}

function ModuleProgressList({ lessons, currentLessonId }) {
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return (
      <div className="rounded-lg border border-[#D9D9D9] bg-white p-4 text-sm text-textdark/60">
        Additional lessons will appear here once this module is populated.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {lessons.map((lesson) => {
        const isCurrent = lesson.id === currentLessonId;
        const progressStatus = lesson.progress?.status ?? 'not_started';
        const circleClass = (() => {
          if (progressStatus === 'completed') return 'border-primary bg-primary text-white';
          if (progressStatus === 'in_progress') return 'border-primary bg-white text-primary';
          return 'border-[#D9D9D9] bg-white text-[#D9D9D9]';
        })();

        const circleInner = progressStatus === 'completed' ? '✓' : progressStatus === 'in_progress' ? '•' : '';

        const content = (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${circleClass}`}
            >
              {circleInner}
            </span>
            <span
              className={`flex-1 text-sm leading-snug ${isCurrent ? 'font-semibold text-primary' : 'text-textdark/80'} break-words`}
            >
              {lesson.title}
            </span>
          </div>
        );

        if (isCurrent) {
          return (
            <li key={lesson.id} className="opacity-100">
              {content}
            </li>
          );
        }

        return (
          <li key={lesson.id} className="opacity-80 transition hover:opacity-100">
            <Link href={`/lessons/${lesson.id}`}>{content}</Link>
          </li>
        );
      })}
    </ul>
  );
}

function ResourcesList({ resources, onOpenEmbeddedResource }) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {resources.map((resource) => {
        const key = resource.id ?? resource.url ?? resource.title;
        const isFlipsnack = isFlipsnackType(resource.type);
        const handleClick = () => {
          if (isFlipsnack && typeof onOpenEmbeddedResource === 'function') {
            onOpenEmbeddedResource(resource);
          }
        };

        if (isFlipsnack) {
          return (
            <li key={key} className="rounded-lg border border-[#D9D9D9] bg-white p-3 text-sm">
              <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-2 text-primary transition hover:text-action"
              >
                {resource.title}
                <span aria-hidden="true">▶</span>
                <span className="sr-only">Open Flipsnack viewer</span>
              </button>
            </li>
          );
        }

        return (
          <li key={key} className="rounded-lg border border-[#D9D9D9] bg-white p-3 text-sm">
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-action"
            >
              {resource.title}
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function MediaLightbox({ resource, onClose }) {
  const isOpen = Boolean(resource?.url);

  useEffect(() => {
    if (!isOpen) return undefined;

    let previousOverflow;
    if (typeof document !== 'undefined') {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflow ?? '';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    onClose?.();
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title ?? 'Embedded resource'}
      onClick={handleBackdropClick}
    >
      <div className="relative h-[80vh] w-[90vw] max-w-5xl" onClick={stopPropagation}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Close
        </button>
        <div className="h-full w-full overflow-hidden rounded-lg border border-white/20 bg-black shadow-2xl">
          <iframe
            src={resource.url}
            title={resource.title ?? 'Embedded resource'}
            className="h-full w-full"
            allow={resource.allow ?? 'autoplay; fullscreen'}
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

function LessonContent({ lesson, progress, onStartLesson, progressBusy }) {
  const hasStarted = progress?.status && progress.status !== 'not_started';
  const primaryContent = lesson?.primaryContent;
  const primaryFormat = primaryContent?.type;
  const lessonFormat = lesson?.format;
  const isPrimaryFlipsnack = isFlipsnackType(primaryFormat);
  const isFaceToFace = isFaceToFaceType(primaryFormat) || isFaceToFaceType(lessonFormat);
  const isPodcast = isPodcastType(primaryFormat) || isPodcastType(lessonFormat);
  const isVideo = isVideoType(primaryFormat) || isVideoType(lessonFormat);
  const isLiveWebinar = isLiveWebinarType(primaryFormat) || isLiveWebinarType(lessonFormat);
  const isWorkshop = isWorkshopType(primaryFormat) || isWorkshopType(lessonFormat);
  const shouldShowButton =
    !isFaceToFace && ((isPrimaryFlipsnack || isPodcast || isVideo || isLiveWebinar || isWorkshop) || (!hasStarted && !progressBusy));
  const imageUrl = lesson?.imageUrl ?? lesson?.image_url ?? null;
  const startButtonLabel = progressBusy
    ? 'Starting…'
    : isPrimaryFlipsnack
      ? 'Launch Flipsnack'
      : isPodcast
        ? 'Play podcast'
        : isVideo
          ? 'Play video'
          : isLiveWebinar || isWorkshop
            ? 'Book now'
            : 'Start lesson';

  const renderStaticCard = (fallbackMessage) => (
    <div className="relative h-64 overflow-hidden rounded-lg border border-[#D9D9D9] bg-white">
      {imageUrl ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-textdark/60">
          {fallbackMessage}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (isFaceToFace) {
      return renderStaticCard('This face-to-face lesson will be facilitated in person.');
    }

    if (!primaryContent?.url) {
      return (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-primary/30 bg-white/50">
          <p className="text-sm text-textdark/60">Content coming soon.</p>
        </div>
      );
    }

    const url = primaryContent.url;

    if (isPrimaryFlipsnack) {
      return renderStaticCard('Flipsnack resource opens in a lightbox.');
    }

    if (isPodcast && primaryContent?.url) {
      return renderStaticCard('Podcast will open in a full-screen player.');
    }

    if (isLiveWebinar || isWorkshop) {
      return (
        <div className="rounded-lg border border-[#D9D9D9] bg-white p-6 text-sm text-textdark/80">
          <p className="mb-4 font-medium text-textdark/80">Reserve your spot</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-action"
          >
            Book now
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      );
    }

    if (isVideo) {
      return renderStaticCard('Video will open in a lightbox player.');
    }

    return (
      <div className="rounded-lg border border-[#D9D9D9] bg-white p-6 text-sm text-textdark/80">
        <p className="mb-4 font-medium text-textdark/80">Primary resource</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-action"
        >
          Open resource
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  };

  return (
    <div className="relative">
      {renderContent()}
      {shouldShowButton && primaryContent?.url ? (
        <div className="absolute inset-0 overflow-hidden rounded-lg">
          {imageUrl ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ) : null}
          {imageUrl ? <span aria-hidden="true" className="absolute inset-0 z-10 bg-primary/35 backdrop-blur-[2px]" /> : null}
          {isLiveWebinar || isWorkshop ? (
            <a
              href={primaryContent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-20 flex h-full w-full items-center justify-center bg-primary/20 backdrop-blur-sm transition hover:bg-primary/30"
            >
              <span className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg">Book now</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onStartLesson}
              disabled={progressBusy}
              className="relative z-20 flex h-full w-full items-center justify-center bg-primary/20 backdrop-blur-sm transition hover:bg-primary/30 disabled:opacity-80"
            >
              <span className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white shadow-lg">{startButtonLabel}</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params?.lessonId;
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [progress, setProgress] = useState({ ...DEFAULT_PROGRESS });
  const [moduleLessons, setModuleLessons] = useState([]);
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteBusy, setFavouriteBusy] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [activeMediaResource, setActiveMediaResource] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentBeingDeleted, setCommentBeingDeleted] = useState(null);

  useEffect(() => {
    if (!lessonId) return;

    const controller = new AbortController();
    let isActive = true;

    setHasAttemptedLoad(false);

    async function loadLesson() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (user?.id) params.set('userId', user.id);
        if (user?.role) params.set('role', user.role);

        const queryString = params.toString();
        const response = await fetch(`/api/lessons/${lessonId}${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load lesson.');
        }

        if (!isActive) return;

        setLesson(payload.lesson ?? null);
        setProgress(payload.progress ?? { ...DEFAULT_PROGRESS });
        setModuleLessons(payload.moduleLessons ?? []);
        setIsFavourite(Boolean(payload.favourite));
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Failed to load lesson', err);
        if (!isActive) return;
        setError(err.message);
        setLesson(null);
      } finally {
        if (!isActive) return;
        setLoading(false);
        setHasAttemptedLoad(true);
      }
    }

    loadLesson();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [lessonId, user?.id, user?.role]);

  useEffect(() => {
    if (!lessonId) return;

    const controller = new AbortController();
    let isActive = true;

    async function loadComments() {
      try {
        setCommentsLoading(true);
        setCommentsError(null);

        const response = await fetch(`/api/lessons/${lessonId}/comments`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Unable to load comments.');
        }

        if (!isActive) return;

        const normalized = Array.isArray(payload?.comments)
          ? payload.comments.map(normalizeComment).filter(Boolean).sort(sortCommentsDesc)
          : [];
        setComments(normalized);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to load comments', error);
        if (isActive) {
          setCommentsError(error.message ?? 'Unable to load comments.');
          setComments([]);
        }
      } finally {
        if (isActive) {
          setCommentsLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [lessonId]);

  const progressPercent = useMemo(() => {
    if (progress?.status === 'completed') return 100;
    if (progress?.progressPercent != null) {
      const clamped = Math.min(100, Math.max(0, Number(progress.progressPercent)));
      return Math.round(clamped);
    }
    return 0;
  }, [progress]);

  const moduleTypeLabel = formatModuleType(lesson?.module?.type);
  const presenterNames = useMemo(() => {
    if (!Array.isArray(lesson?.presenters)) return [];
    return lesson.presenters
      .map((presenter) => {
        if (!presenter) return '';
        const value = typeof presenter === 'string' ? presenter : presenter.name;
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : '';
      })
      .filter((name) => name.length > 0);
  }, [lesson?.presenters]);
  const presenterLabel = presenterNames.length === 1 ? 'Presenter' : 'Presenters';
  const hasResources = Array.isArray(lesson?.resources) && lesson.resources.length > 0;
  const SHOW_MODULE_PROGRESS = false;

  const handleUpdateProgress = async (updates) => {
    if (progressBusy) return;
    if (!user?.id) {
      setError('You need to be signed in to update progress.');
      return;
    }

    try {
      setProgressBusy(true);
      setError(null);

      const response = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...updates }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update progress.');
      }

      setProgress(payload.progress ?? { ...DEFAULT_PROGRESS });
    } catch (err) {
      console.error('Failed to update progress', err);
      setError(err.message);
    } finally {
      setProgressBusy(false);
    }
  };

  const handleStartLesson = async () => {
    if (progressBusy) return;

    const alreadyStarted = progress?.status && progress.status !== 'not_started';
    const primaryContent = lesson?.primaryContent;
    if (isFaceToFaceType(primaryContent?.type ?? lesson?.format)) {
      return;
    }
    const hasContentUrl = Boolean(primaryContent?.url);
    const isFlipsnackResource = hasContentUrl && isFlipsnackType(primaryContent?.type);
    const isPodcastResource = hasContentUrl && (isPodcastType(primaryContent?.type) || isPodcastType(lesson?.format));
    const isVideoResource = hasContentUrl && (isVideoType(primaryContent?.type) || isVideoType(lesson?.format));

    if (!alreadyStarted) {
      await handleUpdateProgress({ status: 'in_progress', progressPercent: progress?.progressPercent ?? 0 });
    }

    if (isFlipsnackResource || isPodcastResource || isVideoResource) {
      const playerTitle =
        primaryContent?.title ??
        lesson?.title ??
        (isPodcastResource ? 'Podcast player' : isVideoResource ? 'Video player' : 'Embedded resource');
      const allowValue = (isPodcastResource || isVideoResource)
        ? 'autoplay; fullscreen; picture-in-picture'
        : 'autoplay; fullscreen';
      setActiveMediaResource({
        ...primaryContent,
        title: playerTitle,
        allow: allowValue,
      });
    }
  };

  const handleMarkComplete = () => {
    if (progressBusy) return;
    handleUpdateProgress({ status: 'completed', progressPercent: 100 });
  };

  const handleToggleFavourite = async () => {
    if (!user?.id) {
      setError('You need to be signed in to save favourites.');
      return;
    }

    try {
      setFavouriteBusy(true);
      setError(null);

      const method = isFavourite ? 'DELETE' : 'POST';
      const response = await fetch(`/api/lessons/${lessonId}/favourite`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to update favourites.');
      }

      setIsFavourite((prev) => Boolean(payload.favourite ?? !prev));
    } catch (err) {
      console.error('Failed to toggle favourite', err);
      setError(err.message);
    } finally {
      setFavouriteBusy(false);
    }
  };

  const handleOpenEmbeddedResource = (resource) => {
    if (!resource?.url) return;
    const allow = resource?.allow ?? (isFlipsnackType(resource?.type) ? 'autoplay; fullscreen' : undefined);
    setActiveMediaResource({ ...resource, allow });
  };

  const handleCloseEmbeddedResource = () => {
    setActiveMediaResource(null);
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (commentSubmitting) return;

    const trimmed = commentInput.trim();

    if (!user?.id) {
      setCommentsError('You need to be signed in to comment.');
      return;
    }

    if (!trimmed) {
      setCommentsError('Please enter a comment before posting.');
      return;
    }

    try {
      setCommentSubmitting(true);
      setCommentsError(null);

      const response = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to post comment.');
      }

      const createdComment = normalizeComment(payload?.comment);
      if (createdComment) {
        setComments((prev) => {
          const next = [createdComment, ...prev.filter((item) => item.id !== createdComment.id)];
          return next.sort(sortCommentsDesc);
        });
      }
      setCommentInput('');
    } catch (error) {
      console.error('Failed to post comment', error);
      setCommentsError(error.message ?? 'Unable to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    if (!user?.id) {
      setCommentsError('You need to be signed in to delete comments.');
      return;
    }

    if (commentBeingDeleted) return;

    const confirmed = typeof window === 'undefined' ? true : window.confirm('Delete this comment? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setCommentBeingDeleted(commentId);
      setCommentsError(null);

      const response = await fetch(`/api/lessons/${lessonId}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, userId: user.id }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to delete comment.');
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment', error);
      setCommentsError(error.message ?? 'Unable to delete comment.');
    } finally {
      setCommentBeingDeleted(null);
    }
  };

  if (!lessonId) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-red-600">Unable to load lesson: missing identifier.</p>
        </div>
      </main>
    );
  }

  if (authLoading || loading || !hasAttemptedLoad) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-textdark/70">Loading lesson…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl px-6 py-[30px]">
          <p className="text-sm text-textdark/70">Lesson not found.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col">
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="min-h-[calc(100vh-130px)] bg-purplebg text-textdark">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-[30px]">
          <header className="flex flex-col gap-4 border-b border-[#D9D9D9] pb-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-primary">{lesson.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-textdark/70">
                <ProgressPill status={progress?.status ?? 'not_started'} />
                <span>{progressPercent}% complete</span>
                {lesson.duration ? <span>• {formatDuration(lesson.duration)}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleFavourite}
              disabled={favouriteBusy}
              className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                isFavourite ? 'text-primary hover:text-action' : 'text-textdark/70 hover:text-primary'
              } ${favouriteBusy ? 'opacity-60' : ''}`}
            >
              <span aria-hidden="true">{isFavourite ? '★' : '☆'}</span>
              {isFavourite ? 'Saved to favourites' : 'Save to favourites'}
            </button>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="space-y-6">
              <LessonContent
                lesson={lesson}
                progress={progress}
                onStartLesson={handleStartLesson}
                progressBusy={progressBusy}
              />

              {lesson.description ? (
                <div className="rounded-lg border border-[#D9D9D9] bg-white p-6 text-sm text-textdark/80">
                  {lesson.description}
                </div>
              ) : null}

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Lesson progress</h2>
                  {progress?.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      disabled={progressBusy}
                      className="rounded-full border border-primary px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
                    >
                      {progressBusy ? 'Updating…' : 'Mark complete'}
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-textdark/70">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6E6E6]">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs uppercase tracking-wide text-textdark/50">
                    <span>{progressPercent}% complete</span>
                    {progress?.updatedAt ? (
                      <span>Updated {new Date(progress.updatedAt).toLocaleDateString()}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-primary">Discussion</h2>
                  <span className="text-xs uppercase tracking-wide text-textdark/50">
                    {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
                  </span>
                </div>

                {commentsError ? <p className="mt-4 text-sm text-red-600">{commentsError}</p> : null}

                {user ? (
                  <form className="mt-4 space-y-3" onSubmit={handleSubmitComment}>
                    <label htmlFor="lesson-discussion" className="sr-only">
                      Add a comment
                    </label>
                    <textarea
                      id="lesson-discussion"
                      name="lesson-discussion"
                      className="min-h-[120px] w-full rounded-lg border border-[#D9D9D9] bg-white px-4 py-3 text-sm text-textdark/80 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                      placeholder="Share your thoughts or questions about this lesson..."
                      value={commentInput}
                      maxLength={MAX_COMMENT_LENGTH}
                      onChange={(event) => {
                        if (commentsError) setCommentsError(null);
                        setCommentInput(event.target.value);
                      }}
                      disabled={commentSubmitting}
                    />
                    <div className="flex flex-col gap-3 text-xs text-textdark/60 md:flex-row md:items-center md:justify-between">
                      <span>{commentInput.length}/{MAX_COMMENT_LENGTH}</span>
                      <button
                        type="submit"
                        disabled={commentSubmitting || commentInput.trim().length === 0}
                        className="self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-action disabled:opacity-60"
                      >
                        {commentSubmitting ? 'Posting…' : 'Post comment'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-textdark/70">
                    Sign in to join the discussion.
                  </p>
                )}

                <div className="mt-6 space-y-4">
                  {commentsLoading ? (
                    <p className="text-sm text-textdark/70">Loading comments…</p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-textdark/70">No comments yet. Be the first to share your thoughts.</p>
                  ) : (
                    comments.map((comment) => (
                      <article key={comment.id ?? comment.createdAt} className="rounded-lg border border-[#E6E6E6] bg-white/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 text-xs uppercase tracking-wide text-textdark/50">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-primary">{comment.authorName}</span>
                            {comment.createdAt ? (
                              <time dateTime={comment.createdAt}>{formatCommentTimestamp(comment.createdAt)}</time>
                            ) : null}
                          </div>
                          {comment.userId && user?.id && comment.userId === user.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={commentBeingDeleted === comment.id}
                              className="rounded-full border border-red-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
                            >
                              {commentBeingDeleted === comment.id ? 'Deleting…' : 'Delete'}
                            </button>
                          ) : null}
                        </div>
                        <p className="mt-3 whitespace-pre-line text-sm text-textdark/80">{comment.content}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                <h2 className="text-lg font-semibold text-primary">Details</h2>
                <dl className="mt-4 space-y-3 text-sm text-textdark/80">
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Module</dt>
                    <dd className="font-medium text-primary">{lesson.module?.title ?? 'Independent lesson'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Format</dt>
                    <dd className="font-medium text-textdark/80">{lesson.format ?? 'General'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-textdark/60">Duration</dt>
                    <dd className="font-medium text-textdark/80">{formatDuration(lesson.duration)}</dd>
                  </div>
                  {presenterNames.length ? (
                    <div className="flex justify-between">
                      <dt className="text-textdark/60">{presenterLabel}</dt>
                      <dd className="ml-6 flex-1 text-right font-medium text-primary">{presenterNames.join(', ')}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {hasResources ? (
                <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                  <h2 className="text-lg font-semibold text-primary">Resources</h2>
                  <div className="mt-4">
                    <ResourcesList resources={lesson.resources} onOpenEmbeddedResource={handleOpenEmbeddedResource} />
                  </div>
                </div>
              ) : null}

              {SHOW_MODULE_PROGRESS ? (
                <div className="rounded-lg border border-[#D9D9D9] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-primary">Course progress</h2>
                    <span className="text-xs uppercase tracking-wide text-textdark/50">Module view</span>
                  </div>
                  <div className="mt-4">
                    <ModuleProgressList lessons={moduleLessons} currentLessonId={lesson.id} />
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </main>
      <MediaLightbox resource={activeMediaResource} onClose={handleCloseEmbeddedResource} />
    </div>
  );
}
