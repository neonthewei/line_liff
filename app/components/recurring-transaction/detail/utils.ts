import { ToastType } from "./types";
import { isTemporaryTransaction } from "../list/utils";

// Format date for display in the editor
export const formatDateForDisplay = (dateString: string) => {
  try {
    const date = new Date(dateString);
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

// 顯示 Toast 通知的輔助函數
export const showToastNotification = (
  message: string,
  type: ToastType,
  duration = 3000,
  callback?: () => void
) => {
  const toastDiv = document.createElement("div");
  toastDiv.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 animate-fadeInDown ${
    type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
  }`;
  toastDiv.style.animation =
    "fadeInDown 0.3s ease-out, fadeOutUp 0.3s ease-in forwards 2.5s";

  const content = document.createElement("div");
  content.className = "flex items-center";
  content.innerHTML = `
    ${
      type === "success"
        ? '<svg class="mr-2 animate-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg class="mr-2 animate-pulse" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
    }
    <span class="animate-fadeIn">${message}</span>
  `;

  toastDiv.appendChild(content);
  document.body.appendChild(toastDiv);

  setTimeout(() => {
    toastDiv.style.animation = "fadeOutUp 0.3s ease-in forwards";
    setTimeout(() => {
      document.body.removeChild(toastDiv);
    }, 300);
  }, duration);
};
