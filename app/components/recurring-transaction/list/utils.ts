import { RecurringTransaction } from "./types";

// Helper function to standardize interval values
export const standardizeIntervalValue = (interval: string): string => {
  // Convert to lowercase for consistency
  const normalizedInterval = interval.toLowerCase();

  // Map to standardized values that match the database constraint
  if (normalizedInterval === "day") return "daily";
  if (normalizedInterval === "week") return "weekly";
  if (normalizedInterval === "month") return "monthly";
  if (normalizedInterval === "year") return "yearly";

  // If it's already in the correct format, return as is
  if (["daily", "weekly", "monthly", "yearly"].includes(normalizedInterval)) {
    return normalizedInterval;
  }

  // Default fallback
  return "monthly";
};

// Helper function to check if a transaction is temporary
export const isTemporaryTransaction = (id: string | number): boolean => {
  return typeof id === "string" && id.startsWith("temp-");
};

// Format date to display in a user-friendly way
export const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    // Format date in a more concise format: YYYY/MM/DD
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month.toString().padStart(2, "0")}/${day
      .toString()
      .padStart(2, "0")}`;
  } catch (error) {
    return dateString;
  }
};

// Format interval and frequency to display in a user-friendly way
export const formatRecurrence = (interval: string, frequency: number) => {
  const intervalMap: Record<string, string> = {
    day: "天",
    daily: "天",
    week: "週",
    weekly: "週",
    month: "月",
    monthly: "月",
    year: "年",
    yearly: "年",
  };

  // Convert interval to lowercase to handle any case variations
  const normalizedInterval = interval.toLowerCase();
  const intervalText = intervalMap[normalizedInterval] || normalizedInterval;

  return `每${frequency}${intervalText}`;
};

// Calculate monthly equivalent amount based on recurrence pattern
export const calculateMonthlyAmount = (
  transaction: RecurringTransaction
): number => {
  const { amount, interval, frequency } = transaction;
  const normalizedInterval = interval.toLowerCase();

  // Convert all intervals to monthly equivalent
  switch (normalizedInterval) {
    case "day":
    case "daily":
      return (amount * 30) / frequency; // Approximate 30 days per month
    case "week":
    case "weekly":
      return (amount * 4.33) / frequency; // Approximate 4.33 weeks per month
    case "month":
    case "monthly":
      return amount / frequency;
    case "year":
    case "yearly":
      return amount / (12 * frequency);
    default:
      return amount; // Default fallback
  }
};
