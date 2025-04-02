/**
 * 日期时间工具函数
 */

/**
 * 获取台北时间（UTC+8）的Date对象
 * @returns 台北时区的当前Date对象
 */
export function getTaipeiDate(): Date {
  // 获取当前UTC时间
  const now = new Date();

  // 计算台北时区的偏移量（UTC+8，单位毫秒）
  const taipeiOffsetHours = 8;
  const taipeiOffsetMs = taipeiOffsetHours * 60 * 60 * 1000;

  // 获取本地时区与UTC的时差（单位分钟）
  const localOffsetMinutes = now.getTimezoneOffset();
  const localOffsetMs = localOffsetMinutes * 60 * 1000;

  // 计算总的偏移量（从本地时区到台北时区）
  const totalOffsetMs = taipeiOffsetMs + localOffsetMs;

  // 创建台北时间
  const taipeiTime = new Date(now.getTime() + totalOffsetMs);

  return taipeiTime;
}

/**
 * 获取台北时区的日期字符串（YYYY-MM-DD格式）
 * @returns 日期字符串，格式为YYYY-MM-DD
 */
export function getTaipeiDateString(): string {
  const taipeiDate = getTaipeiDate();
  const year = taipeiDate.getFullYear();
  const month = (taipeiDate.getMonth() + 1).toString().padStart(2, "0");
  const day = taipeiDate.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * 获取台北时区的ISO格式时间字符串
 * @returns ISO格式的时间字符串
 */
export function getTaipeiISOString(): string {
  return getTaipeiDate().toISOString();
}
