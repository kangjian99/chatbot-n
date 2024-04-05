const expiryHour = Number(process.env.NEXT_PUBLIC_API_EXPIRY_HOUR || 36);

interface StoredItem {
    value: any;  // 使用any来代替泛型T
    expiry: number;
  }
  
 export const saveToLocalStorage = (key: string, data: any): void => {
    const now = new Date().getTime();
    let item: StoredItem;
    if (key.startsWith('memory')) {
      item = {
        value: data,
        expiry: now + 7 * 24 * 60 * 60 * 1000, // 对于以'memory'开头的key，设置过期时间为7天
      };
    } else {
      item = {
        value: data,
        expiry: now + expiryHour * 60 * 60 * 1000, // 其他key根据expiryHour参数设置过期时间
      };
    }
    localStorage.setItem(key, JSON.stringify(item));
  };
  
export const loadFromLocalStorage = (key: string): any | null => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    const item: StoredItem = JSON.parse(itemStr);
    const now = new Date().getTime();
    if (key == 'session') {
      if (now > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
  }
    return item.value;
  };

  const removeIfExpired = (key: string): void => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return;
    }
    const item = JSON.parse(itemStr);
    const now = new Date().getTime();
    if (now > item.expiry) {
      localStorage.removeItem(key);
    }
  };

export const cleanUpExpiredLocalStorage = (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('memory')) {
        removeIfExpired(key);
      }
    });
  };