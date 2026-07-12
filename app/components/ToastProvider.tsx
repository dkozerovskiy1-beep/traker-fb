"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  prompt: (message: string, options?: { title?: string; confirmText?: string; cancelText?: string; defaultValue?: string }) => Promise<string | null>;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    confirmText: string;
    cancelText: string;
    resolve: (value: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    confirmText: string;
    cancelText: string;
    value: string;
    resolve: (value: string | null) => void;
  } | null>(null);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const toast = React.useMemo(
    () => ({
      success: (msg: string) => addToast(msg, "success"),
      error: (msg: string) => addToast(msg, "error"),
      info: (msg: string) => addToast(msg, "info"),
    }),
    [addToast]
  );

  const confirm = useCallback(
    (message: string, options?: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          message,
          title: options?.title || "Підтвердження",
          confirmText: options?.confirmText || "Підтвердити",
          cancelText: options?.cancelText || "Скасувати",
          resolve: (val: boolean) => {
            resolve(val);
            setConfirmState(null);
          },
        });
      });
    },
    []
  );

  const prompt = useCallback(
    (message: string, options?: { title?: string; confirmText?: string; cancelText?: string; defaultValue?: string }) => {
      return new Promise<string | null>((resolve) => {
        setPromptState({
          isOpen: true,
          message,
          title: options?.title || "Введення даних",
          confirmText: options?.confirmText || "Зберегти",
          cancelText: options?.cancelText || "Скасувати",
          value: options?.defaultValue || "",
          resolve: (val: string | null) => {
            resolve(val);
            setPromptState(null);
          },
        });
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* TOASTS CONTAINER */}
      <div
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "360px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          let icon = "ℹ️";
          let glowColor = "rgba(59, 130, 246, 0.4)";
          let bgColor = "rgba(12, 16, 27, 0.9)";
          let border = "1px solid rgba(59, 130, 246, 0.25)";

          if (t.type === "success") {
            icon = "✅";
            glowColor = "rgba(16, 185, 129, 0.4)";
            border = "1px solid rgba(16, 185, 129, 0.25)";
          } else if (t.type === "error") {
            icon = "❌";
            glowColor = "rgba(239, 68, 68, 0.4)";
            border = "1px solid rgba(239, 68, 68, 0.25)";
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                borderRadius: "12px",
                backgroundColor: bgColor,
                border: border,
                boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 10px ${glowColor}`,
                color: "#f8fafc",
                fontSize: "14px",
                fontWeight: "500",
                backdropFilter: "blur(12px)",
                animation: "toast-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1, lineHeight: "1.4" }}>{t.message}</span>
            </div>
          );
        })}
      </div>

      {/* PROMPT MODAL OVERLAY */}
      {promptState?.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 6, 10, 0.75)",
            backdropFilter: "blur(10px)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "modal-fade-in 0.2s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "#0c101b",
              border: "1px solid #182235",
              borderRadius: "18px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 15px rgba(59, 130, 246, 0.15)",
              animation: "modal-scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Header */}
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "white",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "20px" }}>📝</span>
              {promptState.title}
            </h3>

            {/* Message */}
            <p
              style={{
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: "1.6",
                marginBottom: "16px",
              }}
            >
              {promptState.message}
            </p>

            {/* Input */}
            <input
              type="text"
              defaultValue={promptState.value}
              onChange={(e) => {
                promptState.value = e.target.value;
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "#070a12",
                border: "1px solid #182235",
                borderRadius: "10px",
                color: "white",
                fontSize: "14px",
                marginBottom: "24px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              placeholder="Введіть значення..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  promptState.resolve(promptState.value);
                } else if (e.key === "Escape") {
                  promptState.resolve(null);
                }
              }}
            />

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => promptState.resolve(null)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#94a3b8",
                  backgroundColor: "rgba(24, 34, 53, 0.4)",
                  border: "1px solid #182235",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.8)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.4)";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                {promptState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => promptState.resolve(promptState.value)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                {promptState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL OVERLAY */}
      {confirmState?.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 6, 10, 0.75)",
            backdropFilter: "blur(10px)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            animation: "modal-fade-in 0.2s ease-out",
          }}
        >
          <div
            style={{
              backgroundColor: "#0c101b",
              border: "1px solid #182235",
              borderRadius: "18px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 15px rgba(59, 130, 246, 0.15)",
              animation: "modal-scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Header */}
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "white",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "20px" }}>❓</span>
              {confirmState.title}
            </h3>

            {/* Message */}
            <p
              style={{
                fontSize: "14px",
                color: "#94a3b8",
                lineHeight: "1.6",
                marginBottom: "28px",
              }}
            >
              {confirmState.message}
            </p>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => confirmState.resolve(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#94a3b8",
                  backgroundColor: "rgba(24, 34, 53, 0.4)",
                  border: "1px solid #182235",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.8)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.4)";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => confirmState.resolve(true)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                }}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATION STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes modal-fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modal-scale-up {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}} />
    </ToastContext.Provider>
  );
}
