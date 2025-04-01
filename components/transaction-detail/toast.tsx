import { Check, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose?: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 animate-fadeInDown ${
        type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
      style={{
        animation:
          "fadeInDown 0.3s ease-out, fadeOutUp 0.3s ease-in forwards 2.5s",
      }}
    >
      <div className="flex items-center">
        {type === "success" ? (
          <Check className="mr-2 animate-pulse" size={18} />
        ) : (
          <X className="mr-2 animate-pulse" size={18} />
        )}
        <span className="animate-fadeIn">{message}</span>
      </div>
    </div>
  );
}
