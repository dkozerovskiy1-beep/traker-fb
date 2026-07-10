import Link from "next/link";

export default function TermsOfService() {
  return (
    <div style={{ maxWidth: "800px", margin: "60px auto", padding: "0 20px", fontFamily: "Inter, system-ui, sans-serif", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
        <img 
          src="/vartaflow-gorizonr-logo.svg" 
          alt="VartaFlow" 
          style={{ 
            height: "28px", 
            width: "auto", 
            objectFit: "contain"
          }} 
        />
      </div>

      <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "16px", color: "#ffffff" }}>Умови використання</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "30px" }}>Останнє оновлення: 7 липня 2026 р.</p>

      <section style={{ display: "flex", flexDirection: "column", gap: "24px", fontSize: "15px", lineHeight: "1.6" }}>
        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>1. Згода з умовами</h2>
          <p>Використовуючи сервіс VartaFlow, ви погоджуєтеся з цими Умовами використання. Якщо ви не згодні з будь-яким пунктом, будь ласка, припиніть використання нашого сервісу.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>2. Опис послуг</h2>
          <p>VartaFlow надає аналітичну платформу для відстеження витрат, показів, кліків та лідів у рекламних кабінетах Facebook, а також інструменти для автоматизації правил та модерації коментарів на підключених сторінках.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>3. Обмеження відповідальності</h2>
          <p>Ми надаємо сервіс «як є» і не несемо відповідальності за будь-які прямі чи непрямі збитки, пов'язані з використанням або неможливістю використання нашого програмного забезпечення, включаючи будь-які блокування ваших рекламних кабінетів з боку Meta/Facebook.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>4. Зміни в умовах</h2>
          <p>Ми залишаємо за собою право змінювати ці Умови використання в будь-який час. Оновлені умови набувають чинності з моменту їх публікації на цій сторінці.</p>
        </div>
      </section>

      <div style={{ marginTop: "50px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", fontSize: "13px", color: "var(--text-muted)" }}>
        <Link href="/" style={{ color: "var(--color-accent)", textDecoration: "none", marginRight: "20px" }}>На головну</Link>
        <Link href="/privacy" style={{ color: "var(--color-accent)", textDecoration: "none" }}>Політика конфіденційності</Link>
      </div>
    </div>
  );
}
