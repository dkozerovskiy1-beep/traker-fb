import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: "800px", margin: "60px auto", padding: "0 20px", fontFamily: "Inter, system-ui, sans-serif", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "40px" }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ 
            width: "32px", 
            height: "32px", 
            objectFit: "contain",
            borderRadius: "8px"
          }} 
        />
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <span style={{ fontSize: "19px", fontWeight: "800", color: "white", letterSpacing: "-0.6px" }}>Varta</span>
          <img 
            src="/flow.png" 
            alt="Flow" 
            style={{ 
              height: "16px", 
              width: "auto", 
              objectFit: "contain",
              marginTop: "2px"
            }} 
          />
        </div>
      </div>

      <h1 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "16px", color: "#ffffff" }}>Політика конфіденційності</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "30px" }}>Останнє оновлення: 7 липня 2026 р.</p>

      <section style={{ display: "flex", flexDirection: "column", gap: "24px", fontSize: "15px", lineHeight: "1.6" }}>
        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>1. Загальні положення</h2>
          <p>Ця Політика конфіденційності описує, як сервіс VartaFlow збирає, використовує та захищає вашу інформацію під час використання нашого програмного забезпечення та підключення рекламних акаунтів Facebook.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>2. Збір та використання даних</h2>
          <p>VartaFlow є інструментом аналітики. Ми збираємо та відображаємо дані ваших рекламних кабінетів Facebook виключно з вашого дозволу через офіційний інтерфейс авторизації Facebook OAuth.</p>
          <p style={{ marginTop: "10px" }}>Ми збираємо наступні дані:</p>
          <ul style={{ marginLeft: "20px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Дані профілю Facebook (ім'я, ID користувача, аватар);</li>
            <li>Дані рекламних кабінетів (назва кабінету, статус, витрати, валюта, часовий пояс);</li>
            <li>Статистика рекламних кампаній (покази, кліки, витрати, конверсії);</li>
            <li>Список підключених сторінок Facebook (для модерації коментарів).</li>
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>3. Зберігання та безпека даних</h2>
          <p>Усі зібрані дані зберігаються у захищеній базі даних. Ми використовуємо сучасні методи шифрування для захисту ваших токенів доступу та персональної інформації. Ми не передаємо вашу інформацію третім особам.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>4. Видалення даних користувачів (Data Deletion)</h2>
          <p>Ви можете повністю видалити всі свої дані з нашого сервісу в будь-який момент. Для цього перейдіть у розділ «FB Акаунти» у вашому кабінеті VartaFlow та натисніть кнопку «Видалити» навпроти вашого профілю. Це негайно та безповоротно видалить ваш профіль, усі підключені кабінети, сторінки та збережену статистику з нашої бази даних.</p>
        </div>

        <div>
          <h2 style={{ fontSize: "18px", color: "#ffffff", marginBottom: "8px" }}>5. Контакти</h2>
          <p>Якщо у вас виникли запитання щодо цієї Політики конфіденційності, будь ласка, зв'яжіться з нами за електронною адресою власника сервісу.</p>
        </div>
      </section>

      <div style={{ marginTop: "50px", paddingTop: "20px", borderTop: "1px solid var(--border-color)", fontSize: "13px", color: "var(--text-muted)" }}>
        <Link href="/" style={{ color: "var(--color-accent)", textDecoration: "none", marginRight: "20px" }}>На головну</Link>
        <Link href="/terms" style={{ color: "var(--color-accent)", textDecoration: "none" }}>Умови використання</Link>
      </div>
    </div>
  );
}
