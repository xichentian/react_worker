import React, { useState } from 'react';
import { postMessage } from '../hooks/useApi';

interface MessageFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

const MessageForm: React.FC<MessageFormProps> = ({ onSuccess, onError }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      onError('内容不能为空');
      return;
    }
    
    if (content.length > 500) {
      onError('内容超过500字符限制');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await postMessage(content);
      setContent('');
      onSuccess();
    } catch (error: any) {
      onError(error.message || '发布失败');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="input-area">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在这里写下你的心事... (最多500字)"
          disabled={isSubmitting}
        />
        <div className="counter">{content.length}/500</div>
        <button 
          type="submit" 
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? '发布中...' : '匿名发布'}
        </button>
      </form>
    </div>
  );
};

export default MessageForm;