
export interface Env {
  DB: D1Database;
}

interface Post {
  id: number;
  content: string;
  created_at: string;
}

interface RateLimitRecord {
  last_post_time: string;
  post_count_last_hour: number;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    // 处理 API 路由
    if (url.pathname === '/api/post' && request.method === 'POST') {
      return handlePostMessage(request, env);
    } else if (url.pathname === '/api/posts' && request.method === 'GET') {
      return handleGetMessages(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },

};

// ================ 核心业务逻辑 ================ //

async function handlePostMessage(request: Request, env: Env): Promise<Response> {
  try {
    // 1. 获取客户端IP并进行哈希处理
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await hashString(ip);
    
    // 2. 频率限制检查
    const rateLimit = await checkRateLimit(env.DB, ipHash);
    if (rateLimit.count >= 5) {
      return jsonResponse(429, { 
        error: '发布太频繁，请稍后再试 (1小时内最多5条)' 
      });
    }
    
    // 3. 解析和验证内容
    const { content } = await request.json() as { content: string };
    if (!content || content.trim().length === 0) {
      return jsonResponse(400, { error: '内容不能为空' });
    }
    
    if (content.length > 500) {
      return jsonResponse(400, { error: '内容超过500字符限制' });
    }
    
    // 4. 敏感词过滤
    if (await containsProfanity(content)) {
      return jsonResponse(400, { 
        error: '内容包含不合适词汇，请修改后提交' 
      });
    }
    
    // 5. 写入数据库
    await env.DB.prepare(`
      INSERT INTO posts (content) 
      VALUES (?)
    `).bind(content).run();
    
    // 6. 更新频率限制记录
    await updateRateLimit(env.DB, ipHash);
    
    return jsonResponse(200, { success: true });
    
  } catch (err: any) {
    console.error(`Post error: ${err.message}`);
    return jsonResponse(500, { error: '服务器错误' });
  }
}

async function handleGetMessages(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    
    // 解析分页参数
    const page = parseInt(url.searchParams.get('page') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '3');
    
    // 计算偏移量
    const offset = page * limit;
    console.log(`Querying page: ${page}, offset: ${offset}`);
    // 查询未过期的消息（带分页）
    const { results } = await env.DB.prepare(`
      SELECT id, content, 
             strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at
      FROM posts 
      WHERE expire_at > datetime('now') 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all<Post>();
    
    // 检查是否还有更多数据
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total 
      FROM posts 
    `).first<{ total: number }>();
    
    const hasMore = totalResult && totalResult.total > offset + limit;
    
    return jsonResponse(200, { 
      posts: results, 
      hasMore 
    });
  } catch (err: any) {
    console.error(`Get messages error: ${err.message}`);
    return jsonResponse(500, { error: '获取消息失败' });
  }
}


// ================ 辅助函数 ================ //

async function checkRateLimit(
  db: D1Database, 
  ipHash: string
): Promise<{ count: number; lastPostTime: Date }> {
  try {
    const result = await db.prepare(`
      SELECT last_post_time, post_count_last_hour 
      FROM ip_logs 
      WHERE ip_hash = ?
    `).bind(ipHash).first<RateLimitRecord>();
    
    // 首次使用或超过1小时重置
    if (!result || Date.now() - new Date(result.last_post_time).getTime() > 3600000) {
      await db.prepare(`
        INSERT INTO ip_logs (ip_hash, last_post_time, post_count_last_hour)
        VALUES (?, ?, 0)
        ON CONFLICT(ip_hash) DO UPDATE SET
          last_post_time = excluded.last_post_time,
          post_count_last_hour = 0
      `).bind(ipHash, new Date().toISOString()).run();
      return { count: 0, lastPostTime: new Date() };
    }
    
    return {
      count: result.post_count_last_hour || 0,
      lastPostTime: new Date(result.last_post_time)
    };
  } catch (err:any) {
    console.error(`RateLimit check error: ${err.message}`);
    return { count: 0, lastPostTime: new Date() };
  }
}

async function updateRateLimit(
  db: D1Database, 
  ipHash: string
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO ip_logs (ip_hash, last_post_time, post_count_last_hour)
      VALUES (?, ?, 1)
      ON CONFLICT(ip_hash) DO UPDATE SET
        last_post_time = excluded.last_post_time,
        post_count_last_hour = ip_logs.post_count_last_hour + 1
    `).bind(ipHash, new Date().toISOString()).run();
  } catch (err:any) {
    console.error(`RateLimit update error: ${err.message}`);
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function containsProfanity(text: string): Promise<boolean> {
  // 更全面的敏感词库
  const profanities = [
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 
    'nigger', 'whore', 'bastard', 'porn', 'fag',
    'dick', 'pussy', 'cock', 'whore', 'slut'
  ];
  
  const normalizedText = text.toLowerCase();
  return profanities.some(word => normalizedText.includes(word));
}

function jsonResponse(status: number, data: any): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}