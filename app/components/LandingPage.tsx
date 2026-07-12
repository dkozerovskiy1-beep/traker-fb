"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#04060a",
      backgroundImage: "radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(6, 180, 212, 0.04) 0%, transparent 45%)",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      color: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflowX: "hidden"
    }}>
      {/* Header / Nav */}
      <header style={{
        width: "100%",
        maxWidth: "1200px",
        padding: "24px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <img 
            src="/vartaflow-gorizonr-logo.svg" 
            alt="VartaFlow" 
            style={{ height: "36px", width: "auto", objectFit: "contain" }} 
          />
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/login" style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#94a3b8",
            transition: "color 0.2s",
            padding: "8px 16px"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "white"}
          onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
          >
            Увійти
          </Link>
          <Link href="/register" style={{
            padding: "10px 20px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "600",
            color: "white",
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            transition: "all 0.2s"
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
            Почати роботу
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        width: "100%",
        maxWidth: "1000px",
        padding: "80px 20px 60px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        zIndex: 5
      }}>
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          padding: "6px 16px",
          borderRadius: "100px",
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--color-accent)",
          textTransform: "uppercase",
          letterSpacing: "1px",
          display: "inline-block"
        }}>
          🚀 Платформа автоматизації реклами Meta
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: "800",
          lineHeight: "1.15",
          letterSpacing: "-1px",
          color: "white",
          maxWidth: "800px"
        }}>
          Аналітика та авто-модерація реклами{" "}
          <span style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Facebook
          </span>{" "}
          нового покоління
        </h1>
        <p style={{
          fontSize: "clamp(16px, 2.5vw, 18px)",
          color: "#94a3b8",
          maxWidth: "640px",
          lineHeight: "1.6"
        }}>
          VartaFlow консолідує витрати кабінетів у реальному часі, автоматично фільтрує спам у коментарях за стоп-словами та миттєво сповіщає про бани у Telegram.
        </p>

        <div style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          <Link href="/register" style={{
            padding: "14px 28px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            color: "white",
            background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
            boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(59, 130, 246, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(59, 130, 246, 0.4)";
          }}
          >
            Створити безкоштовний акаунт
          </Link>
          <Link href="/login" style={{
            padding: "14px 28px",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            color: "#94a3b8",
            backgroundColor: "rgba(24, 34, 53, 0.3)",
            border: "1px solid #182235",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.6)";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(24, 34, 53, 0.3)";
            e.currentTarget.style.color = "#94a3b8";
          }}
          >
            Увійти в кабінет
          </Link>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section style={{
        width: "100%",
        maxWidth: "1200px",
        padding: "60px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        zIndex: 5
      }}>
        {/* Analytics Card */}
        <div style={{
          backgroundColor: "#0c101b",
          border: "1px solid #182235",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.3s, border-color 0.3s",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "var(--color-accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "#182235";
        }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            📊
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>
            Консолідована аналітика
          </h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6" }}>
            Усі підключені профілі та рекламні кабінети в одному дашборді. Сортуйте кампанії, групи оголошень та креативи за кліками, витратами, CTR, CPM чи CPL для детального аналізу реклами.
          </p>
        </div>

        {/* Comment Moderation Card */}
        <div style={{
          backgroundColor: "#0c101b",
          border: "1px solid #182235",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.3s, border-color 0.3s",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "var(--color-success)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "#182235";
        }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            💬
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>
            Розумна модерація коментарів
          </h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6" }}>
            Автоматизуйте захист рекламних постів від хейту та спаму. Налаштовуйте автоматичні правила за допомогою стоп-слів для миттєвого приховування чи видалення небажаних коментарів.
          </p>
        </div>

        {/* Telegram Alerts Card */}
        <div style={{
          backgroundColor: "#0c101b",
          border: "1px solid #182235",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
          transition: "transform 0.3s, border-color 0.3s",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "var(--color-warning)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "#182235";
        }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px"
          }}>
            🔔
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>
            Миттєві Telegram сповіщення
          </h3>
          <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6" }}>
            Отримуйте оперативні сповіщення про блокування рекламних кабінетів, відхилення креативів через правила Meta, списання бюджету або появу коментарів, які потребують модерації.
          </p>
        </div>
      </section>

      {/* Footer Section */}
      <footer style={{
        width: "100%",
        maxWidth: "1200px",
        padding: "60px 20px 40px 20px",
        marginTop: "auto",
        borderTop: "1px solid #182235",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        zIndex: 5
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div>
            <img 
              src="/vartaflow-gorizonr-logo.svg" 
              alt="VartaFlow" 
              style={{ height: "26px", width: "auto", objectFit: "contain" }} 
            />
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              © {new Date().getFullYear()} VartaFlow. Усі права захищено.
            </p>
          </div>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ fontSize: "13px", color: "#94a3b8", transition: "color 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "white"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
            >
              Політика конфіденційності
            </Link>
            <Link href="/terms" style={{ fontSize: "13px", color: "#94a3b8", transition: "color 0.2s" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "white"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
            >
              Умови використання
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
