"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Невірний email або пароль");
      }
    } catch (err: any) {
      setError("Помилка з'єднання з сервером. Спробуйте пізніше.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#050505",
      backgroundImage: "radial-gradient(circle at 50% 50%, #0d1e16 0%, #050505 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "rgba(10, 10, 10, 0.7)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(16, 185, 129, 0.15)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 50px rgba(16, 185, 129, 0.03)",
        borderRadius: "16px",
        padding: "40px 30px",
        textAlign: "center"
      }}>
        {/* Branding Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{
            backgroundColor: "var(--color-accent)",
            color: "#050505",
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "800",
            fontSize: "20px"
          }}>
            V
          </div>
          <span style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.5px", color: "#ffffff" }}>
            Varta<span style={{ color: "var(--color-accent)" }}>Flow</span>
          </span>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
          Вхід до панелі керування
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
          Введіть ваші дані для доступу
        </p>

        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#ef4444",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "14px",
            marginBottom: "20px",
            textAlign: "left"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px", textAlign: "left" }}>
          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-secondary)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Email адреса
            </label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px",
                color: "#ffffff"
              }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-secondary)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Пароль
            </label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "12px",
                color: "#ffffff"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#050505",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontWeight: "600",
              fontSize: "15px",
              cursor: "pointer",
              marginTop: "10px",
              transition: "all 0.2s",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Вхід..." : "Увійти в кабінет"}
          </button>
        </form>
      </div>
    </div>
  );
}
