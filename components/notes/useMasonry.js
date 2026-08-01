'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// useLayoutEffect warns during SSR; the layout only matters in the browser.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Masonry layout for a single container of `.card-wrapper` children.
 *
 * CSS `columns` would give the same look for free, but it fills column by
 * column — note 2 lands *under* note 1 instead of beside it. This measures
 * each card and drops it into whichever column is currently shortest, walking
 * children in DOM order. The first row therefore fills left to right, and
 * afterwards cards close the vertical gaps a fixed grid leaves behind.
 *
 * Everything is positioned absolutely inside one container, so Sortable still
 * sees a single list and drag-to-reorder keeps working.
 */
export default function useMasonry(containerRef, { enabled = true, gap = 16, minColumnWidth = 260, deps = [] } = {}) {
  const frame = useRef(0);

  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.children).filter((el) => el.classList.contains('card-wrapper'));

    if (!enabled) {
      container.style.position = '';
      container.style.height = '';
      items.forEach((el) => {
        el.style.position = '';
        el.style.width = '';
        el.style.left = '';
        el.style.top = '';
      });
      return;
    }

    const width = container.clientWidth;
    if (!width || items.length === 0) {
      container.style.height = '';
      return;
    }

    const columns = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
    const columnWidth = (width - gap * (columns - 1)) / columns;

    // Write all widths first, then read heights, so the browser reflows once
    // rather than once per card.
    container.style.position = 'relative';
    items.forEach((el) => {
      el.style.position = 'absolute';
      el.style.width = `${columnWidth}px`;
    });

    const heights = new Array(columns).fill(0);
    const measured = items.map((el) => el.offsetHeight);

    items.forEach((el, i) => {
      let shortest = 0;
      for (let c = 1; c < columns; c++) if (heights[c] < heights[shortest] - 0.5) shortest = c;
      el.style.left = `${shortest * (columnWidth + gap)}px`;
      el.style.top = `${heights[shortest]}px`;
      heights[shortest] += measured[i] + gap;
    });

    container.style.height = `${Math.max(0, Math.max(...heights) - gap)}px`;
  }, [containerRef, enabled, gap, minColumnWidth]);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(layout);
  }, [layout]);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    schedule();

    // Cards change height on their own — a checklist item is ticked, a cover
    // image finally loads, the window narrows — so watch rather than assume.
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    Array.from(container.children).forEach((el) => observer.observe(el));
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, enabled, ...deps]);
}
