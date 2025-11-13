'use client';

import Image from 'next/image';

function formatEventDate(value) {
  if (!value) return 'Date TBC';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    return 'Date TBC';
  }
}

export default function EventsListCard({
  events = [],
  isLoading = false,
  onBookSession = null,
  bookSessionHref = '',
}) {
  const showPlaceholder = !isLoading && (!Array.isArray(events) || events.length === 0);
  const canHandleBooking = typeof onBookSession === 'function';
  const hasBookingHref = typeof bookSessionHref === 'string' && bookSessionHref.trim().length > 0;

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
      ) : showPlaceholder ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-4 text-sm text-textdark/70">
          <div className="flex flex-col gap-2">
            <span className="text-base font-semibold text-primary">No events booked</span>
            <p>Once live sessions are scheduled, they will appear here so you can plan ahead.</p>
          </div>
          {canHandleBooking ? (
            <button
              type="button"
              onClick={onBookSession}
              className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-action/50"
            >
              Book a session
            </button>
          ) : hasBookingHref ? (
            <a
              href={bookSessionHref}
              className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-action/50"
            >
              Book a session
            </a>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-4">
          {events.map((event) => (
            <li key={event.id ?? event.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Image src="/commentsicon-grey.svg" alt="" width={18} height={18} aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1 text-sm text-textdark/80">
                <span className="font-semibold text-primary">{event.title ?? 'Live session'}</span>
                <span className="text-xs uppercase tracking-wide text-textdark/50">
                  {formatEventDate(event.startAt ?? event.start_at ?? event.start_time)}
                </span>
                {event.facilitator ? (
                  <span className="text-xs text-textdark/60">With {event.facilitator}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
