import "./style.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="container">
    <div class="brand">BBI</div>
    <section class="hero">
      <span class="eyebrow">BBI WEB APP</span>
      <h1>Selamat datang di BBI</h1>
      <p>Fondasi aplikasi web Anda sudah siap. Berikutnya, tentukan fitur yang ingin dibangun bersama Codex.</p>
      <a class="button" href="https://chatgpt.com/codex" target="_blank" rel="noopener noreferrer">Mulai dengan Codex</a>
    </section>
    <footer>BBI · Web Application Starter</footer>
  </main>
`;
