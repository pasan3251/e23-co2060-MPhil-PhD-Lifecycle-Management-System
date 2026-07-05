"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardNotification = {
  id: string;
  event: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
};

type NotificationsResponse = {
  notifications?: DashboardNotification[];
  unreadCount?: number;
  error?: string;
};

function formatNotificationDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getEventLabel(event: string) {
  return event.replaceAll("_", " ").toLowerCase();
}

export function DashboardNotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const visibleUnreadCount = useMemo(
    () => unreadCount || notifications.filter((notification) => !notification.isRead).length,
    [notifications, unreadCount],
  );

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications?limit=8", {
        credentials: "include",
      });
      const payload = (await response.json()) as NotificationsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load notifications.");
      }

      const nextNotifications = payload.notifications ?? [];

      setNotifications(nextNotifications);
      setUnreadCount(
        payload.unreadCount ??
          nextNotifications.filter((notification) => !notification.isRead).length,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load notifications.");
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function markAllRead() {
    setIsMarkingRead(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to mark notifications as read.");
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );
      setUnreadCount(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update notifications.");
    } finally {
      setIsMarkingRead(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-5 py-4 text-left text-base font-bold text-black shadow-[8px_8px_16px_#bebebe] transition-all hover:bg-black hover:text-white"
      >
        <span>Notifications</span>
        {visibleUnreadCount > 0 ? (
          <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
            {visibleUnreadCount}
          </span>
        ) : (
          <span className="rounded-full border border-gray-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            Clear
          </span>
        )}
      </button>

      {isOpen ? (
        <section className="mt-4 rounded-[24px] border border-gray-300 bg-white p-4 shadow-[8px_8px_16px_#bebebe]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                Inbox
              </p>
              <h2 className="text-lg font-black tracking-tight text-black">
                Recent alerts
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={visibleUnreadCount === 0 || isMarkingRead}
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMarkingRead ? "Saving..." : "Mark read"}
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border-2 border-black bg-white px-4 py-3 text-sm font-bold text-black">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center">
              <p className="text-sm font-black text-black">No notifications yet</p>
              <p className="mt-1 text-xs font-medium text-black/60">
                Workflow alerts will appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.isRead ? "bg-gray-300" : "bg-black"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight text-black">
                        {notification.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-black/70">
                        {notification.message}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
                        <span>{getEventLabel(notification.event)}</span>
                        <span>{formatNotificationDate(notification.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
