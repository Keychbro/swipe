import './style.css';

const sections = [...document.querySelectorAll('.page-section')];
const navLinks = [...document.querySelectorAll('[data-nav]')];
const title = document.querySelector('#page-title');
const toast = document.querySelector('.toast');

function showSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  sections.forEach((section) => section.classList.toggle('active', section === target));
  navLinks.forEach((link) => link.classList.toggle('active', link.dataset.nav === id));
  title.textContent = navLinks.find((link) => link.dataset.nav === id)?.textContent.trim().replace(/^[⌘▦↗◌]/, '') || 'Обзор';
  window.history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('a[href^="#"], [data-open]').forEach((element) => {
  element.addEventListener('click', (event) => {
    const id = element.dataset.open || element.getAttribute('href').slice(1);
    if (document.getElementById(id)) {
      event.preventDefault();
      showSection(id);
    }
  });
});

document.querySelectorAll('.buy-button:not([disabled])').forEach((button) => {
  button.addEventListener('click', () => {
    toast.textContent = `Карточка «${button.dataset.product}» выбрана. Перед оформлением ознакомьтесь с условиями.`;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
  });
});

document.querySelector('#copy-referral').addEventListener('click', async () => {
  const url = document.querySelector('#referral-url').textContent;
  try {
    await navigator.clipboard.writeText(`https://${url}`);
    toast.textContent = 'Ссылка скопирована в буфер обмена.';
  } catch {
    toast.textContent = `Ваша ссылка: ${url}`;
  }
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
});

const initialSection = window.location.hash.slice(1);
if (initialSection && document.getElementById(initialSection)) showSection(initialSection);
