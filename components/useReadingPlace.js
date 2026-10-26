'use client';
import { useEffect, useRef } from 'react';

const SAVE_AFTER_MS = 1500;

// Carlo's place on the timeline: once the moments are on the page it scrolls
// to the one he was reading last (`resumeAt`), and as he reads it saves the
// moment nearest the top of the screen, a moment after he stops scrolling.
// `eventsKey` changes when the moments do (the timeline can arrive in two
// steps while it is being rebuilt). `active` is false for everyone else,
// who always starts at the beginning.
export default function useReadingPlace({ active, resumeAt, eventsKey }) {
  const resumed = useRef(false);
  const saved = useRef(null);

  useEffect(() => {
    if (!active || !eventsKey || resumed.current) return;
    const target = resumeAt && document.getElementById(`event-${resumeAt}`)?.closest('article');
    if (resumeAt && !target) return; // not on the page yet
    resumed.current = true;
    saved.current = resumeAt;
    target?.scrollIntoView({ block: 'start' });
  }, [active, eventsKey, resumeAt]);

  useEffect(() => {
    if (!active || !eventsKey) return;
    const visible = new Map();
    let timer;
    const save = () => {
      const [first] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
      const id = first?.[0];
      if (!id || id === saved.current) return;
      saved.current = id;
      fetch('/api/carlo/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id }),
      }).catch(() => {});
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.dataset.eventId;
        if (entry.isIntersecting) visible.set(id, entry.boundingClientRect.top);
        else visible.delete(id);
      }
      clearTimeout(timer);
      timer = setTimeout(save, SAVE_AFTER_MS);
    });
    document.querySelectorAll('[data-event-id]').forEach((el) => observer.observe(el));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [active, eventsKey]);
}
