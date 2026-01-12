'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function EventsListCard({ events = [], isLoading = false }) {
  const sanitizedEvents = useMemo(() => (Array.isArray(events) ? events.slice(0, 4) : []), [events]);
  const hasEvents = sanitizedEvents.length > 0;
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartRef = useRef(null);

  useEffect(() => {
    if (!hasEvents) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((prev) => (prev >= sanitizedEvents.length ? 0 : prev));
  }, [hasEvents, sanitizedEvents.length]);

  const handlePrev = () => {
    if (!hasEvents) return;
    setActiveIndex((prev) => (prev - 1 + sanitizedEvents.length) % sanitizedEvents.length);
  };

  const handleNext = () => {
    if (!hasEvents) return;
    setActiveIndex((prev) => (prev + 1) % sanitizedEvents.length);
  };

  const handleTouchStart = (event) => {
    if (!hasEvents) return;
    touchStartRef.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (!hasEvents || touchStartRef.current == null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    const swipeThreshold = 40;
    if (deltaX > swipeThreshold) {
      handlePrev();
    } else if (deltaX < -swipeThreshold) {
      handleNext();
    }
  };

  return (
    <aside className="flex h-full min-h-[260px] flex-col gap-4 rounded-[5px] bg-white p-6 shadow-sm">
      {isLoading ? (
        <div className="flex flex-1 flex-col gap-3 text-sm text-textdark/60">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-md bg-purplebg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-purplebg animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-purplebg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasEvents ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 text-sm text-textdark/70">
          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold text-primary">No events booked</span>
            <p>Once live sessions are scheduled, they will appear here so you can plan ahead.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-textdark/60">
              <span>
                Event {String(activeIndex + 1).padStart(2, '0')}/{String(sanitizedEvents.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={sanitizedEvents.length <= 1}
                  aria-label="Previous event"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-lg text-primary transition disabled:opacity-30"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={sanitizedEvents.length <= 1}
                  aria-label="Next event"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-lg text-primary transition disabled:opacity-30"
                >
                  ›
                </button>
              </div>
          </div>
          <div
            className="relative flex-1 overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex h-full w-full transition-transform duration-300"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {sanitizedEvents.map((event) => {
                const key = event.id ?? event.href ?? event.title;
                const buttonClasses =
                  'inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-action focus:outline-none focus:ring-2 focus:ring-primary/40';
                const presenters = Array.isArray(event.presenters) ? event.presenters.filter(Boolean) : [];
                const presenterSummary = presenters.length > 1 ? presenters.join(', ') : presenters[0];

                const CardContent = (
                  <article className="flex h-full w-full flex-col justify-between rounded border border-[#E6E6E6] bg-white px-4 py-3">
                    <div className="space-y-3">
                      <p className="text-lg font-semibold leading-snug text-primary">{event.title ?? 'Live session'}</p>
                      <div className="text-sm font-semibold text-textdark/70">
                        <span>{event.formatLabel ?? 'Live event'}</span>
                        {event.durationLabel ? <span className="mx-1">•</span> : null}
                        {event.durationLabel ? <span>{event.durationLabel}</span> : null}
                      </div>
                      {event.description ? (
                        <p className="text-sm leading-relaxed text-textdark/70 line-clamp-3">{event.description}</p>
                      ) : null}
                      {presenters.length ? (
                        <p className="text-sm text-textdark/70">
                          Presented by {presenterSummary}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-4">
                      {event.isInternal ? (
                        <Link href={event.href ?? '#'} className={buttonClasses} prefetch={false}>
                          Book now
                        </Link>
                      ) : (
                        <a href={event.href ?? '#'} target="_blank" rel="noopener noreferrer" className={buttonClasses}>
                          Book now
                        </a>
                      )}
                    </div>
                  </article>
                );

                return (
                  <div key={key} className="w-full flex-shrink-0">
                    {CardContent}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
