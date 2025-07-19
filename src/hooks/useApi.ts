import { useState, useCallback, useRef } from 'react';
const API_BASE = '/api';

export const getPosts = async (page: number = 0, limit: number = 3) => {
    console.log(`Loading page: ${page}`);
    const response = await fetch(`${API_BASE}/posts?page=${page}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error('获取消息失败');
  }
  
  const data = await response.json();
  return {
    posts: data.posts,
    hasMore: data.hasMore
  };
};

export const postMessage = async (content: string) => {
  const response = await fetch(`${API_BASE}/post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '发布失败');
  }
  
  return response.json();
};

const useApi = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  // 使用 useRef 来存储当前页码，避免闭包问题
  const currentPageRef = useRef(0);

  const loadPosts = useCallback(async (page?: number) => {
    try {
      setLoading(true);
      
      // 确定要加载的页码
      const pageToLoad = page !== undefined ? page : currentPageRef.current + 1;
      console.log(`Loading page: ${pageToLoad}, currentPageRef: ${currentPageRef.current}`);
      const { posts: newPosts, hasMore } = await getPosts(pageToLoad);
      
      setPosts(prev => 
        pageToLoad === 0 ? newPosts : [...prev, ...newPosts]
      );
      setHasMore(hasMore);
      
      // 更新 ref 中的当前页码
      currentPageRef.current = pageToLoad;
      
      setError(null);
    } catch (err: any) {
      setError('加载消息失败，请刷新重试');
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, []); // 移除 currentPage 依赖

  const refresh = useCallback(() => {
    loadPosts(0);
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadPosts,
    refresh
  };
};

export default useApi;