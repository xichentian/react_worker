import { useState, useEffect } from 'react';
import MessageForm from './components/MessageForm';
import PostList from './components/PostList';
import Toast from './components/Toast';
import useApi from './hooks/useApi';
import './index.css';

function App() {
  const { 
    posts, 
    loading, 
    error, 
    hasMore,
    loadPosts,
    refresh
  } = useApi();
  
  const [toast, setToast] = useState<{ 
    message: string; 
    type: 'success' | 'error' 
  } | null>(null);

  useEffect(() => {
    loadPosts(0); // 初始加载第0页
  }, [loadPosts]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePostSuccess = () => {
    showToast('消息已投入树洞 🌳');
    refresh(); // 刷新消息列表
  };

  return (
    <div className="container">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <h1>🌳 24小时匿名树洞</h1>
      
      <div className="notice">
        <strong>注意：</strong>所有内容将在24小时后自动消失，发布后无法删除或修改
      </div>
      
      <MessageForm 
        onSuccess={handlePostSuccess} 
        onError={(msg) => showToast(msg, 'error')} 
      />
      
      <div className="posts-container">
        {loading && posts.length === 0 ? (
          <div className="loading">正在加载树洞消息...</div>
        ) : posts.length === 0 ? (
          <div className="empty">树洞空空如也，成为第一个分享的人吧</div>
        ) : (
          <PostList 
            posts={posts} 
            hasMore={hasMore}
            onLoadMore={() => loadPosts()} // 让组件内部处理页码
          />
        )}
      </div>
      
      <footer>
        <p>所有消息将在24小时后自动清除 · 完全匿名 · 无追踪</p>
      </footer>
    </div>
  );
}

export default App;