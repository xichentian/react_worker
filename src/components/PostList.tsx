import React, { useEffect, useRef } from 'react';
import { formatTime, calculateRemainingTime } from '../utils/helpers';

interface Post {
  id: number;
  content: string;
  created_at: string;
}

interface PostListProps {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
}

const PostList: React.FC<PostListProps> = ({ posts, hasMore, onLoadMore }) => {
  const [autoLoadCount, setAutoLoadCount] = React.useState(0);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [now, setNow] = React.useState(Date.now()); // 当前时间状态
  const sentinelRef = useRef<HTMLDivElement>(null);
  const MAX_AUTO_LOAD = 3;
  const [visiblePosts, setVisiblePosts] = React.useState<Post[]>(posts);
  const [expiringPosts, setExpiringPosts] = React.useState<number[]>([]);

  // 每分钟更新时间和检查过期
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      
      // 检查哪些帖子已经过期
      const expiredIds = visiblePosts
        .filter(post => {
          const createdTime = new Date(post.created_at).getTime();
          return (createdTime + 24 * 60 * 60 * 1000) <= currentTime;
        })
        .map(post => post.id);
      
      if (expiredIds.length > 0) {
        setExpiringPosts(expiredIds);
        // 500ms后移除（动画持续时间）
        setTimeout(() => {
          setVisiblePosts(prev => prev.filter(post => !expiredIds.includes(post.id)));
          setExpiringPosts([]);
        }, 500);
      }
    }, 60000); // 每分钟检查一次

    return () => clearInterval(timer);
  }, [visiblePosts]);
  // 当新帖子加载时更新可见帖子列表
  useEffect(() => {
    setVisiblePosts(posts);
  }, [posts]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      await onLoadMore(); // 调用父组件传递的加载函数
      setAutoLoadCount(prev => prev + 1);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 自动加载逻辑
  useEffect(() => {
    if (autoLoadCount >= MAX_AUTO_LOAD || !hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    
    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [autoLoadCount, hasMore]);


  return (
    <div className="posts-list">
      {visiblePosts.map(post => {
        const isExpiring = expiringPosts.includes(post.id);
        const remainingTime = calculateRemainingTime(post.created_at, now);
        return (
          <div key={post.id} className={`post ${isExpiring ? 'expiring' : ''}`}>
            <div className="post-content">{post.content}</div>
            <div className="post-time">
              <span className="remaining-time">{remainingTime} 后删除</span>
              <span>{formatTime(post.created_at)}</span>
            </div>
          </div>
        );
      })}

      {/* 滚动检测哨兵元素 */}
      <div ref={sentinelRef} className="h-1" />

      {/* 加载状态 */}
      {isLoadingMore && (
        <div className="loading-more">
          <div className="spinner"></div>
          <span>正在加载更多消息...</span>
        </div>
      )}

      {/* 手动加载按钮 */}
      {!isLoadingMore && hasMore && autoLoadCount >= MAX_AUTO_LOAD && (
        <div className="load-more-container">
          <button
            onClick={handleLoadMore}
            className="load-more-button"
          >
            加载更多消息
          </button>
        </div>
      )}

      {/* 没有更多数据的提示 */}
      {!hasMore && posts.length > 0 && (
        <div className="no-more-messages">
          ⏳ 已显示所有消息（24小时后将刷新）
        </div>
      )}
    </div>
  );
};

export default PostList;