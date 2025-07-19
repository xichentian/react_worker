import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteScroll = (fetchData: (page: number) => Promise<boolean>) => {
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const MAX_AUTO_LOAD = 3;

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const hasNewData = await fetchData(autoLoadCount + 1);
      if (hasNewData) {
        setAutoLoadCount(prev => prev + 1);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [autoLoadCount, fetchData, isLoadingMore]);

  useEffect(() => {
    if (autoLoadCount >= MAX_AUTO_LOAD) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [autoLoadCount, loadMore]);

  return {
    sentinelRef,
    isLoadingMore,
    autoLoadCount,
    MAX_AUTO_LOAD,
    loadMore
  };
};

export default useInfiniteScroll;