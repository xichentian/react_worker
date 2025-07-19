const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

export const formatTime = (isoString: string) => formatter.format(new Date(isoString));

// 计算剩余分钟数（更精确的基础函数）
export const calculateRemainingMinutes = (isoString: string, now: number = Date.now()) => {
  const createdTime = new Date(isoString).getTime();
  const expirationTime = createdTime + 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((expirationTime - now) / 60000));
};

  // 计算剩余时间（分钟）
export const calculateRemainingTime = (createdAt: string, now:number) => {
  const createdTime = new Date(createdAt).getTime();
  const expirationTime = createdTime + 24 * 60 * 60 * 1000;
  
  const remainingMs = Math.max(0, expirationTime - now);
  const remainingMinutes = Math.floor(remainingMs / 60000);
  
  if (remainingMinutes >= 60) {
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}小时${minutes}分钟`;
  }
  return `${remainingMinutes}分钟`;
};

export const padZero = (num: number) => {
  return num.toString().padStart(2, '0');
};