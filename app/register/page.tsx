"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Не вдалося зареєструватися");
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
      backgroundColor: "#04060a",
      backgroundImage: "radial-gradient(circle at 50% 50%, #0b1a30 0%, #04060a 100%)",
      fontFamily: "Inter, system-ui, sans-serif",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "420px",
        backgroundColor: "rgba(10, 10, 10, 0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(59, 130, 246, 0.2)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 50px rgba(59, 130, 246, 0.04)",
        borderRadius: "16px",
        padding: "40px 30px",
        textAlign: "center"
      }}>
        {/* Branding Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "32px" }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ 
              width: "42px", 
              height: "42px", 
              objectFit: "contain",
              borderRadius: "10px"
            }} 
          />
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.6px" }}>Varta</span>
            <img 
              src="/flow.png" 
              alt="Flow" 
              style={{ 
                height: "20px", 
                width: "auto", 
                objectFit: "contain",
                marginTop: "2px"
              }} 
            />
          </div>
        </div>

        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
          Реєстрація акаунта
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
          Створіть свій особистий кабінет трекера
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
              Ваше ім'я
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Дмитро"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div className="form-group">
            <label className="form-label" style={{ color: "var(--text-secondary)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Підтвердження пароля
            </label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              background: "var(--color-accent-gradient)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "14px",
              fontWeight: "700",
              fontSize: "15px",
              cursor: "pointer",
              marginTop: "10px",
              transition: "all 0.2s",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.2)",
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? "Реєстрація..." : "Зареєструватися"}
          </button>
        </form>

        <p style={{ marginTop: "24px", fontSize: "14px", color: "var(--text-muted)" }}>
          Вже маєте акаунт?{" "}
          <Link href="/login" style={{ color: "var(--color-accent)", textDecoration: "none", fontWeight: "600" }}>
            Увійти
          </Link>
        </p>
      </div>
    </div>
  );
}
