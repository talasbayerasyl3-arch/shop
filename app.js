import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { firebaseCollections, firebaseConfig } from "./firebase-config.js";

const LEVELS = [
  "All Levels",
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper-Intermediate"
];

const LOCAL_BOOKS_KEY = "english-books-market-books";
const LOCAL_SELLER_KEY = "english-books-market-seller";
const LOCAL_DATA_VERSION_KEY = "english-books-market-version";
const LOCAL_DATA_VERSION = "3";
const THEME_KEY = "english-books-market-theme";
const ADMIN_SESSION_KEY = "english-books-market-admin-session";
const ADMIN_ACCESS_CODE = "elmira-books-2026";

const sellerDefaults = {
  phone: "87471030889",
  whatsapp: "87471030889",
  telegram: "englishbookseller"
};

const seededBooks = [
  {
    id: "beginner-book",
    title: "Face2Face",
    shortDescription: "Учебная книга для начинающих с базовыми словами, чтением и простыми упражнениями.",
    fullDescription:
      "Книга для уровня Beginner. Подходит для первых шагов в английском: алфавит, простые слова, короткие тексты и задания для закрепления.",
    level: "Beginner",
    price: 4500,
    tags: ["Book", "Beginner", "English"],
    accent: "#2563eb",
    image: "./images/beginner-book.png"
  },
  {
    id: "elementary-book",
    title: "Elementary",
    shortDescription: "Учебная книга с базовой грамматикой, короткими текстами и практикой на каждый раздел.",
    fullDescription:
      "Книга для уровня Elementary. Внутри простая грамматика, словарь по темам, чтение и упражнения для уверенного базового уровня.",
    level: "Elementary",
    price: 4500,
    tags: ["Book", "Elementary", "Grammar"],
    accent: "#1d4ed8",
    image: "./images/elementary-book.png"
  },
  {
    id: "pre-intermediate-book",
    title: "Pre-Intermediate",
    shortDescription: "Учебная книга для перехода к более уверенной речи и пониманию текстов.",
    fullDescription:
      "Книга для уровня Pre-Intermediate. Подходит для расширения словаря, чтения, диалогов и закрепления основных конструкций.",
    level: "Pre-Intermediate",
    price: 4500,
    tags: ["Book", "Pre-Intermediate", "English"],
    accent: "#0f172a",
    image: "./images/pre-intermediate-book.png"
  },
  {
    id: "intermediate-book",
    title: "Intermediate",
    shortDescription: "Учебная книга с текстами, грамматикой и заданиями для среднего уровня.",
    fullDescription:
      "Книга для уровня Intermediate. Включает чтение, упражнения, словарь по темам и задания на закрепление грамматики.",
    level: "Intermediate",
    price: 4500,
    tags: ["Book", "Intermediate", "Reading"],
    accent: "#1e40af",
    image: "./images/intermediate-book.png"
  },
  {
    id: "upper-intermediate-book",
    title: "Upper-Intermediate",
    shortDescription: "Учебная книга для более уверенного чтения, словаря и сложных тем.",
    fullDescription:
      "Книга для уровня Upper-Intermediate. Подходит для тех, кто хочет читать сложнее, понимать больше и укреплять словарный запас.",
    level: "Upper-Intermediate",
    price: 4500,
    tags: ["Book", "Upper-Intermediate", "English"],
    accent: "#3b82f6",
    image: "./images/upper-intermediate-book.png"
  }
];

const state = {
  books: [],
  seller: { ...sellerDefaults },
  search: "",
  level: "All Levels",
  theme: getInitialTheme(),
  route: getRoute(),
  modalBookId: null,
  editingBookId: null,
  notice: "",
  dataMode: "demo",
  loading: true,
  saving: false,
  adminUnlocked: hasAdminSession()
};

let db = null;
let storage = null;

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getRoute() {
  const hash = window.location.hash || "#/";
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (!parts.length) {
    return { page: "catalog" };
  }
  if (parts[0] === "book" && parts[1]) {
    return { page: "book", bookId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "admin" || parts[0] === "manage") {
    return { page: "admin" };
  }
  return { page: "catalog" };
}

function hasAdminSession() {
  return localStorage.getItem(ADMIN_SESSION_KEY) === "unlocked";
}

function unlockAdminSession() {
  localStorage.setItem(ADMIN_SESSION_KEY, "unlocked");
  state.adminUnlocked = true;
}

function lockAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  state.adminUnlocked = false;
  state.editingBookId = null;
}

function ensureAdminAccess() {
  if (state.adminUnlocked) {
    return true;
  }

  setNotice("Доступ к управлению закрыт.");
  state.route = { page: "catalog" };
  window.location.hash = "#/";
  return false;
}

function isFirebaseReady() {
  return Object.values(firebaseConfig).every(Boolean);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeSvg(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatPrice(price) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(price) || 0)} KZT`;
}

function buildWhatsappLink(phone) {
  const clean = String(phone || "").replace(/\D/g, "");
  return clean ? `https://wa.me/${clean}` : "#";
}

function buildTelegramLink(handle) {
  const normalized = String(handle || "").trim().replace(/^@/, "");
  return normalized ? `https://t.me/${normalized}` : "";
}

function slugToId(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function createCoverDataUrl(title, level, accent = "#2563eb") {
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 880">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accent}"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="640" height="880" rx="42" fill="url(#g)"/>
      <rect x="34" y="34" width="572" height="812" rx="32" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
      <text x="76" y="140" font-family="Inter, Arial, sans-serif" font-size="30" fill="#dbeafe" font-weight="700">${escapeSvg(level)}</text>
      <text x="76" y="250" font-family="Inter, Arial, sans-serif" font-size="74" fill="white" font-weight="800">${escapeSvg(initials)}</text>
      <foreignObject x="76" y="320" width="488" height="280">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Inter,Arial,sans-serif;font-size:44px;line-height:1.18;color:white;font-weight:700;">
          ${escapeHtml(title)}
        </div>
      </foreignObject>
      <rect x="76" y="736" width="190" height="52" rx="26" fill="rgba(255,255,255,0.16)"/>
      <text x="116" y="770" font-family="Inter, Arial, sans-serif" font-size="24" fill="#eff6ff" font-weight="700">ENGLISH BOOK</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeBook(book) {
  const id = book.id || slugToId(book.title || `book-${Date.now()}`);
  const title = book.title || "English Book";
  const level = LEVELS.includes(book.level) ? book.level : "Beginner";
  const accent = book.accent || "#2563eb";

  return {
    id,
    title,
    shortDescription: book.shortDescription || "Описание не заполнено.",
    fullDescription: book.fullDescription || book.shortDescription || "Описание не заполнено.",
    level,
    price: Number(book.price) || 4500,
    tags: Array.isArray(book.tags)
      ? book.tags.filter(Boolean)
      : String(book.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    accent,
    image: book.image || createCoverDataUrl(title, level, accent)
  };
}

function seedLocalBooks() {
  const books = seededBooks.map((book) => normalizeBook(book));
  localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books));
  localStorage.setItem(LOCAL_DATA_VERSION_KEY, LOCAL_DATA_VERSION);
  return books;
}

function saveLocalBooks(books) {
  localStorage.setItem(LOCAL_BOOKS_KEY, JSON.stringify(books.map(normalizeBook)));
  localStorage.setItem(LOCAL_DATA_VERSION_KEY, LOCAL_DATA_VERSION);
}

function saveLocalSeller(seller) {
  localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify({ ...sellerDefaults, ...seller }));
  localStorage.setItem(LOCAL_DATA_VERSION_KEY, LOCAL_DATA_VERSION);
}

function getLocalBooks() {
  if (localStorage.getItem(LOCAL_DATA_VERSION_KEY) !== LOCAL_DATA_VERSION) {
    saveLocalSeller(sellerDefaults);
    return seedLocalBooks();
  }

  const raw = localStorage.getItem(LOCAL_BOOKS_KEY);
  if (!raw) {
    return seedLocalBooks();
  }

  try {
    return JSON.parse(raw).map(normalizeBook);
  } catch {
    return seedLocalBooks();
  }
}

function getLocalSeller() {
  if (localStorage.getItem(LOCAL_DATA_VERSION_KEY) !== LOCAL_DATA_VERSION) {
    localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify(sellerDefaults));
    localStorage.setItem(LOCAL_DATA_VERSION_KEY, LOCAL_DATA_VERSION);
    return { ...sellerDefaults };
  }

  const raw = localStorage.getItem(LOCAL_SELLER_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_SELLER_KEY, JSON.stringify(sellerDefaults));
    return { ...sellerDefaults };
  }

  try {
    return { ...sellerDefaults, ...JSON.parse(raw) };
  } catch {
    return { ...sellerDefaults };
  }
}

async function setupDataLayer() {
  if (!isFirebaseReady()) {
    state.dataMode = "demo";
    state.books = getLocalBooks();
    state.seller = getLocalSeller();
    state.loading = false;
    render();
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    state.dataMode = "firebase";
    await refreshRemoteData();
  } catch (error) {
    console.error(error);
    state.notice = "Firebase не инициализировался. Открыта демо-версия на localStorage.";
    state.dataMode = "demo";
    state.books = getLocalBooks();
    state.seller = getLocalSeller();
  } finally {
    state.loading = false;
    render();
  }
}

async function refreshRemoteData() {
  const sellerRef = doc(db, firebaseCollections.settings, firebaseCollections.sellerDocId);
  const sellerSnap = await getDoc(sellerRef);
  if (!sellerSnap.exists()) {
    await setDoc(sellerRef, sellerDefaults);
  }

  const booksSnap = await getDocs(collection(db, firebaseCollections.books));
  if (!booksSnap.size) {
    await Promise.all(
      seededBooks.map((book) => {
        const normalized = normalizeBook(book);
        const payload = { ...normalized };
        delete payload.id;
        return setDoc(doc(db, firebaseCollections.books, normalized.id), payload);
      })
    );
  }

  const refreshedBooksSnap = await getDocs(collection(db, firebaseCollections.books));
  const books = refreshedBooksSnap.docs.map((item) => normalizeBook({ id: item.id, ...item.data() }));
  const refreshedSellerSnap = await getDoc(sellerRef);

  state.books = books;
  state.seller = refreshedSellerSnap.exists() ? { ...sellerDefaults, ...refreshedSellerSnap.data() } : { ...sellerDefaults };
}

function getFilteredBooks() {
  return state.books.filter((book) => {
    const matchLevel = state.level === "All Levels" || book.level === state.level;
    const haystack = `${book.title} ${book.shortDescription} ${book.fullDescription} ${book.level} ${book.tags.join(" ")}`.toLowerCase();
    const matchSearch = haystack.includes(state.search.trim().toLowerCase());
    return matchLevel && matchSearch;
  });
}

function getFeaturedBook() {
  return state.books[0] || seededBooks.map(normalizeBook)[0];
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.body.dataset.theme = theme;
  render();
}

function openContact(bookId) {
  state.modalBookId = bookId;
  render();
}

function closeContact() {
  state.modalBookId = null;
  render();
}

function setNotice(message) {
  state.notice = message;
  render();
  window.clearTimeout(setNotice.timer);
  setNotice.timer = window.setTimeout(() => {
    state.notice = "";
    render();
  }, 2800);
}

function render() {
  document.body.dataset.theme = state.theme;
  const app = document.querySelector("#app");
  const route = state.route;
  const filteredBooks = getFilteredBooks();
  const featuredBook = getFeaturedBook();

  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      ${state.notice ? `<div class="notice" style="margin-bottom: 18px;"><strong>Сообщение:</strong> ${escapeHtml(state.notice)}</div>` : ""}
      ${
        state.loading
          ? renderLoading()
          : route.page === "book"
            ? renderBookPage(route.bookId)
            : route.page === "admin"
              ? renderAdminPage()
              : renderCatalogPage(filteredBooks, featuredBook)
      }
      ${renderFooter()}
    </div>
    ${state.modalBookId ? renderContactModal(state.modalBookId) : ""}
  `;

  bindUI();
}

function renderHeader() {
  return `
    <header class="site-header">
      <a class="brand" href="#/">
        <div class="brand-mark">EE</div>
        <div class="brand-copy">
          <strong>Elmira Books Shop</strong>
          <span>Книги по английскому языку</span>
        </div>
      </a>
      <nav class="header-nav" aria-label="Основная навигация">
        <a class="nav-link" href="#/">Каталог</a>
      </nav>
      <div class="header-actions">
        <button class="theme-toggle" type="button" data-action="toggle-theme">
          ${state.theme === "dark" ? "Светлая тема" : "Темная тема"}
        </button>
      </div>
    </header>
  `;
}

function renderCatalogPage(filteredBooks, featuredBook) {
  return `
    <section class="page-hero">
      <div class="hero-copy">
        <h1>Elmira Books Shop</h1>
        <p>
          Учебные книги по английскому языку по уровням от Beginner до Upper-Intermediate.
          Быстрый поиск, фильтры и связь с продавцом в один клик.
        </p>
        <div class="hero-metrics">
          <div class="metric">
            <strong>${state.books.length}</strong>
            <span>Книг в каталоге</span>
          </div>
          <div class="metric">
            <strong>${LEVELS.length - 1}</strong>
            <span>Уровней</span>
          </div>
          <div class="metric">
            <strong>${state.dataMode === "firebase" ? "Firebase" : "Demo"}</strong>
            <span>Режим данных</span>
          </div>
        </div>
      </div>
      <div class="hero-spotlight">
        <div class="hero-book">
          <img class="hero-book-cover" src="${featuredBook.image}" alt="${escapeHtml(featuredBook.title)}">
          <div class="hero-book-copy">
            <span class="level-chip active">${escapeHtml(featuredBook.level)}</span>
            <h2>${escapeHtml(featuredBook.title)}</h2>
            <p>${escapeHtml(featuredBook.shortDescription)}</p>
            <div class="hero-book-footer">
              <strong class="price">${formatPrice(featuredBook.price)}</strong>
              <a class="primary-button" href="#/book/${encodeURIComponent(featuredBook.id)}">Открыть книгу</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="controls-panel" aria-label="Поиск и фильтры">
      <div class="search-stack">
        <label class="visually-hidden" for="search">Поиск книги</label>
        <input
          id="search"
          class="search-field"
          type="search"
          placeholder="Поиск по названию или уровню"
          value="${escapeHtml(state.search)}"
          data-field="search"
        >
        <div class="inline-toolbar">
          ${LEVELS.map(
            (level) => `
              <button
                type="button"
                class="chip-button ${state.level === level ? "active" : ""}"
                data-level="${escapeHtml(level)}"
              >
                ${escapeHtml(level)}
              </button>
            `
          ).join("")}
        </div>
      </div>
      <div class="field-stack">
        <label for="level-select">Фильтр уровней</label>
        <select id="level-select" class="select-field" data-field="level">
          ${LEVELS.map(
            (level) => `
              <option value="${escapeHtml(level)}" ${state.level === level ? "selected" : ""}>
                ${escapeHtml(level)}
              </option>
            `
          ).join("")}
        </select>
      </div>
    </section>

    <section class="section-card" style="padding: 22px;">
      <div class="filter-summary">
        <div>
          <h2 class="section-title">Каталог книг</h2>
          <div class="muted">Найдено: ${filteredBooks.length}</div>
        </div>
        <button class="ghost-button" type="button" data-action="reset-filters">Сбросить фильтры</button>
      </div>
      ${
        filteredBooks.length
          ? `<div class="book-grid">${filteredBooks.map(renderBookCard).join("")}</div>`
          : `
            <div class="empty-state">
              <h3 style="margin-top: 0;">Ничего не найдено</h3>
              <p class="muted">Измените поисковый запрос или сбросьте фильтр уровня.</p>
            </div>
          `
      }
    </section>
  `;
}

function renderBookCard(book) {
  return `
    <article class="book-card">
      <a href="#/book/${encodeURIComponent(book.id)}" aria-label="Открыть ${escapeHtml(book.title)}">
        <img class="book-cover" src="${book.image}" alt="${escapeHtml(book.title)}">
      </a>
      <div class="book-card-head">
        <span class="level-chip">${escapeHtml(book.level)}</span>
        <h3><a href="#/book/${encodeURIComponent(book.id)}">${escapeHtml(book.title)}</a></h3>
        <p>${escapeHtml(book.shortDescription)}</p>
      </div>
      <div class="price-row">
        <strong class="price">${formatPrice(book.price)}</strong>
      </div>
      <div class="card-actions">
        <a class="ghost-button" href="#/book/${encodeURIComponent(book.id)}">Подробнее</a>
        <button class="primary-button" type="button" data-contact-book="${escapeHtml(book.id)}">
          Связаться с продавцом
        </button>
      </div>
    </article>
  `;
}

function renderBookPage(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) {
    return `
      <section class="empty-state">
        <h1>Книга не найдена</h1>
        <p class="muted">Проверьте ссылку или вернитесь в каталог.</p>
        <div style="margin-top: 14px;">
          <a class="primary-button" href="#/">Вернуться в каталог</a>
        </div>
      </section>
    `;
  }

  const relatedBooks = state.books.filter((item) => item.id !== book.id && item.level === book.level).slice(0, 4);

  return `
    <section class="book-detail">
      <div>
        <img class="book-detail-cover" src="${book.image}" alt="${escapeHtml(book.title)}">
      </div>
      <div class="book-detail-main">
        <div class="book-detail-copy">
          <span class="level-chip active">${escapeHtml(book.level)}</span>
          <h1>${escapeHtml(book.title)}</h1>
          <p>${escapeHtml(book.fullDescription)}</p>
        </div>
        <div class="book-tags">
          ${book.tags.map((tag) => `<span class="book-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="price-row">
          <strong class="price">${formatPrice(book.price)}</strong>
          <div class="card-actions" style="max-width: 380px;">
            <button class="primary-button" type="button" data-contact-book="${escapeHtml(book.id)}">
              Связаться с продавцом
            </button>
            <a class="ghost-button" href="#/">Назад</a>
          </div>
        </div>
        <div class="contact-strip">
          <a class="contact-link" href="tel:${escapeHtml(state.seller.phone)}">${escapeHtml(state.seller.phone)}</a>
          <a class="contact-link" href="${buildWhatsappLink(state.seller.whatsapp)}" target="_blank" rel="noreferrer">WhatsApp</a>
          ${
            buildTelegramLink(state.seller.telegram)
              ? `<a class="contact-link" href="${buildTelegramLink(state.seller.telegram)}" target="_blank" rel="noreferrer">Telegram</a>`
              : ""
          }
        </div>
      </div>
    </section>

    ${
      relatedBooks.length
        ? `
          <section class="section-card related-grid" style="padding: 22px;">
            <h2 class="section-title">Похожие книги</h2>
            <div class="book-grid">${relatedBooks.map(renderBookCard).join("")}</div>
          </section>
        `
        : ""
    }
  `;
}

function renderAdminPage() {
  if (!state.adminUnlocked) {
    return renderAdminAccessPage();
  }

  const editingBook = state.books.find((book) => book.id === state.editingBookId);
  const sellerTelegram = state.seller.telegram || "";

  return `
    <section class="admin-layout">
      <div class="panel-card">
        <div>
          <span class="status-pill ${state.dataMode === "firebase" ? "online" : ""}">
            ${state.dataMode === "firebase" ? "Подключено к Firebase" : "Демо-режим localStorage"}
          </span>
          <h1 style="margin-bottom: 8px;">Админ-панель</h1>
          <p class="panel-copy">
            Добавляйте книги, меняйте контакты продавца и загружайте обложки.
            В демо-режиме данные сохраняются локально в браузере.
          </p>
        </div>

        <div class="inline-toolbar">
          <button class="ghost-button" type="button" data-action="lock-admin">Выйти из управления</button>
        </div>

        <form id="book-form" class="form-grid">
          <input type="hidden" name="id" value="${escapeHtml(editingBook?.id || "")}">
          <div class="field-stack">
            <label for="book-title">Название</label>
            <input id="book-title" class="text-field" name="title" required value="${escapeHtml(editingBook?.title || "")}">
          </div>
          <div class="field-stack">
            <label for="book-level">Уровень</label>
            <select id="book-level" class="select-field" name="level" required>
              ${LEVELS.filter((level) => level !== "All Levels")
                .map(
                  (level) => `
                    <option value="${escapeHtml(level)}" ${editingBook?.level === level ? "selected" : ""}>
                      ${escapeHtml(level)}
                    </option>
                  `
                )
                .join("")}
            </select>
          </div>
          <div class="field-stack full-span">
            <label for="book-short-description">Короткое описание</label>
            <textarea id="book-short-description" class="textarea-field" name="shortDescription" required>${escapeHtml(editingBook?.shortDescription || "")}</textarea>
          </div>
          <div class="field-stack full-span">
            <label for="book-full-description">Полное описание</label>
            <textarea id="book-full-description" class="textarea-field" name="fullDescription" required>${escapeHtml(editingBook?.fullDescription || "")}</textarea>
          </div>
          <div class="field-stack">
            <label for="book-price">Цена, KZT</label>
            <input id="book-price" class="text-field" type="number" name="price" min="0" required value="${editingBook?.price || 4500}">
          </div>
          <div class="field-stack">
            <label for="book-tags">Теги через запятую</label>
            <input id="book-tags" class="text-field" name="tags" value="${escapeHtml((editingBook?.tags || []).join(", "))}">
          </div>
          <div class="field-stack full-span">
            <label for="book-image-url">Ссылка на изображение</label>
            <input id="book-image-url" class="text-field" name="image" value="${escapeHtml(editingBook?.image || "")}" placeholder="https://... или оставьте пустым">
          </div>
          <div class="field-stack full-span">
            <label for="book-image-file">Загрузка обложки</label>
            <input id="book-image-file" class="file-field" type="file" name="imageFile" accept="image/*">
          </div>
          <div class="field-stack">
            <label for="book-accent">Акцент обложки</label>
            <input id="book-accent" class="text-field" name="accent" value="${escapeHtml(editingBook?.accent || "#2563eb")}">
          </div>
          <div class="field-stack" style="justify-content: end;">
            <label class="visually-hidden" for="book-submit">Сохранение</label>
            <button id="book-submit" class="primary-button" type="submit">
              ${state.saving ? "Сохранение..." : editingBook ? "Обновить книгу" : "Добавить книгу"}
            </button>
          </div>
          <div class="full-span inline-toolbar">
            ${editingBook ? `<button type="button" class="ghost-button" data-action="cancel-edit">Отменить редактирование</button>` : ""}
          </div>
        </form>
      </div>

      <div class="panel-card">
        <div>
          <h2 class="section-title">Контакты продавца</h2>
          <p class="panel-copy">Эти данные используются на карточках, странице книги и в окне связи.</p>
        </div>

        <form id="seller-form" class="form-grid">
          <div class="field-stack full-span">
            <label for="seller-phone">Телефон</label>
            <input id="seller-phone" class="text-field" name="phone" required value="${escapeHtml(state.seller.phone)}">
          </div>
          <div class="field-stack full-span">
            <label for="seller-whatsapp">WhatsApp номер</label>
            <input id="seller-whatsapp" class="text-field" name="whatsapp" required value="${escapeHtml(state.seller.whatsapp)}">
          </div>
          <div class="field-stack full-span">
            <label for="seller-telegram">Telegram username</label>
            <input id="seller-telegram" class="text-field" name="telegram" value="${escapeHtml(sellerTelegram)}" placeholder="без @">
          </div>
          <div class="field-stack full-span">
            <button class="primary-button secondary" type="submit">Сохранить контакты</button>
          </div>
        </form>

        <div>
          <h2 class="section-title">Книги в каталоге</h2>
          <p class="table-note">Редактирование и удаление доступны сразу из списка.</p>
        </div>

        <div class="admin-book-list">
          ${state.books
            .map(
              (book) => `
                <article class="admin-book-item">
                  <img class="admin-book-thumb" src="${book.image}" alt="${escapeHtml(book.title)}">
                  <div class="admin-book-meta">
                    <strong>${escapeHtml(book.title)}</strong>
                    <span>${escapeHtml(book.level)} · ${formatPrice(book.price)}</span>
                  </div>
                  <div class="admin-book-actions">
                    <button class="icon-button" type="button" data-edit-book="${escapeHtml(book.id)}">Изменить</button>
                    <button class="icon-button danger" type="button" data-delete-book="${escapeHtml(book.id)}">Удалить</button>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderAdminAccessPage() {
  return `
    <section class="empty-state">
      <h1>Закрытое управление</h1>
      <p class="muted" style="max-width: 520px; margin: 0 auto 18px;">
        Публичная ссылка на админку убрана. Для входа используйте код доступа.
      </p>
      <form id="admin-access-form" class="form-grid" style="max-width: 440px; margin: 0 auto;">
        <div class="field-stack full-span">
          <label for="admin-code">Код доступа</label>
          <input
            id="admin-code"
            class="text-field"
            type="password"
            name="accessCode"
            placeholder="Введите код"
            autocomplete="off"
            required
          >
        </div>
        <div class="field-stack full-span">
          <button class="primary-button" type="submit">Открыть управление</button>
        </div>
      </form>
    </section>
  `;
}

function renderLoading() {
  return `
    <section class="empty-state">
      <h2>Загрузка каталога</h2>
      <p class="muted">Подготавливаю данные и интерфейс.</p>
    </section>
  `;
}

function renderContactModal(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) {
    return "";
  }

  const telegramLink = buildTelegramLink(state.seller.telegram);

  return `
    <div class="contact-modal" data-close-modal="true">
      <div class="contact-modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <div class="modal-header">
          <div>
            <h2 id="contact-title">Связаться с продавцом</h2>
            <p>${escapeHtml(book.title)}</p>
          </div>
          <button class="icon-button" type="button" data-action="close-modal">Закрыть</button>
        </div>
        <div class="contact-list">
          <div class="contact-row">
            <div>
              <strong>Телефон</strong>
              <span>${escapeHtml(state.seller.phone)}</span>
            </div>
            <a class="contact-link" href="tel:${escapeHtml(state.seller.phone)}">Позвонить</a>
          </div>
          <div class="contact-row">
            <div>
              <strong>WhatsApp</strong>
              <span>${escapeHtml(state.seller.whatsapp)}</span>
            </div>
            <a class="contact-link" href="${buildWhatsappLink(state.seller.whatsapp)}" target="_blank" rel="noreferrer">Открыть</a>
          </div>
          ${
            telegramLink
              ? `
                <div class="contact-row">
                  <div>
                    <strong>Telegram</strong>
                    <span>@${escapeHtml(String(state.seller.telegram).replace(/^@/, ""))}</span>
                  </div>
                  <a class="contact-link" href="${telegramLink}" target="_blank" rel="noreferrer">Открыть</a>
                </div>
              `
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="footer-bar">
      <span>Elmira Books Shop</span>
      <span>${state.dataMode === "firebase" ? "Firestore + Storage" : "HTML + CSS + JavaScript demo mode"}</span>
    </footer>
  `;
}

function bindUI() {
  document.querySelector('[data-action="toggle-theme"]')?.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  document.querySelector("#admin-access-form")?.addEventListener("submit", handleAdminAccessSubmit);
  document.querySelector('[data-action="lock-admin"]')?.addEventListener("click", () => {
    lockAdminSession();
    window.location.hash = "#/";
    render();
  });

  document.querySelector('[data-field="search"]')?.addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  document.querySelector('[data-field="level"]')?.addEventListener("change", (event) => {
    state.level = event.target.value;
    render();
  });

  document.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => {
      state.level = button.dataset.level;
      render();
    });
  });

  document.querySelector('[data-action="reset-filters"]')?.addEventListener("click", () => {
    state.search = "";
    state.level = "All Levels";
    render();
  });

  document.querySelectorAll("[data-contact-book]").forEach((button) => {
    button.addEventListener("click", () => openContact(button.dataset.contactBook));
  });

  document.querySelector('[data-action="close-modal"]')?.addEventListener("click", closeContact);
  document.querySelector('[data-close-modal="true"]')?.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-close-modal")) {
      closeContact();
    }
  });

  document.querySelector("#book-form")?.addEventListener("submit", handleBookSubmit);
  document.querySelector("#seller-form")?.addEventListener("submit", handleSellerSubmit);

  document.querySelector('[data-action="cancel-edit"]')?.addEventListener("click", () => {
    state.editingBookId = null;
    render();
  });

  document.querySelectorAll("[data-edit-book]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingBookId = button.dataset.editBook;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    });
  });

  document.querySelectorAll("[data-delete-book]").forEach((button) => {
    button.addEventListener("click", async () => {
      const book = state.books.find((item) => item.id === button.dataset.deleteBook);
      if (!book) {
        return;
      }

      const confirmed = window.confirm(`Удалить книгу "${book.title}"?`);
      if (!confirmed) {
        return;
      }

      await deleteBook(book.id);
    });
  });
}

async function handleBookSubmit(event) {
  event.preventDefault();
  if (!ensureAdminAccess()) {
    return;
  }
  const form = event.currentTarget;
  const formData = new FormData(form);
  state.saving = true;
  render();

  try {
    const uploadedImageUrl = await maybeUploadImage(formData.get("imageFile"));
    const title = String(formData.get("title") || "").trim();
    const level = String(formData.get("level") || "Beginner");
    const accent = String(formData.get("accent") || "#2563eb").trim() || "#2563eb";

    const book = normalizeBook({
      id: String(formData.get("id") || "").trim() || slugToId(title),
      title,
      level,
      shortDescription: String(formData.get("shortDescription") || "").trim(),
      fullDescription: String(formData.get("fullDescription") || "").trim(),
      price: Number(formData.get("price") || 4500),
      tags: String(formData.get("tags") || ""),
      image: uploadedImageUrl || String(formData.get("image") || "").trim(),
      accent
    });

    if (state.dataMode === "firebase") {
      const payload = { ...book };
      delete payload.id;

      if (state.editingBookId) {
        await updateDoc(doc(db, firebaseCollections.books, book.id), payload);
      } else {
        await setDoc(doc(db, firebaseCollections.books, book.id), payload);
      }
      await refreshRemoteData();
    } else {
      const books = [...state.books];
      const index = books.findIndex((item) => item.id === book.id);
      if (index >= 0) {
        books[index] = book;
      } else {
        books.unshift(book);
      }
      state.books = books;
      saveLocalBooks(books);
    }

    state.editingBookId = null;
    setNotice("Книга сохранена.");
  } catch (error) {
    console.error(error);
    setNotice("Не удалось сохранить книгу.");
  } finally {
    state.saving = false;
    render();
  }
}

async function handleSellerSubmit(event) {
  event.preventDefault();
  if (!ensureAdminAccess()) {
    return;
  }
  const formData = new FormData(event.currentTarget);
  const seller = {
    phone: String(formData.get("phone") || "").trim(),
    whatsapp: String(formData.get("whatsapp") || "").trim(),
    telegram: String(formData.get("telegram") || "").trim().replace(/^@/, "")
  };

  try {
    if (state.dataMode === "firebase") {
      await setDoc(doc(db, firebaseCollections.settings, firebaseCollections.sellerDocId), seller, { merge: true });
      await refreshRemoteData();
    } else {
      state.seller = seller;
      saveLocalSeller(seller);
    }
    setNotice("Контакты продавца обновлены.");
  } catch (error) {
    console.error(error);
    setNotice("Не удалось обновить контакты.");
  }
}

async function deleteBook(bookId) {
  if (!ensureAdminAccess()) {
    return;
  }

  try {
    if (state.dataMode === "firebase") {
      await deleteDoc(doc(db, firebaseCollections.books, bookId));
      await refreshRemoteData();
    } else {
      state.books = state.books.filter((book) => book.id !== bookId);
      saveLocalBooks(state.books);
    }

    if (state.editingBookId === bookId) {
      state.editingBookId = null;
    }

    setNotice("Книга удалена.");
  } catch (error) {
    console.error(error);
    setNotice("Не удалось удалить книгу.");
  } finally {
    render();
  }
}

async function maybeUploadImage(fileValue) {
  if (!(fileValue instanceof File) || !fileValue.size) {
    return "";
  }

  if (state.dataMode !== "firebase" || !storage) {
    return await fileToDataUrl(fileValue);
  }

  const fileRef = ref(storage, `books/${Date.now()}-${fileValue.name}`);
  const snapshot = await uploadBytes(fileRef, fileValue);
  return await getDownloadURL(snapshot.ref);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleAdminAccessSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const accessCode = String(formData.get("accessCode") || "").trim();

  if (accessCode !== ADMIN_ACCESS_CODE) {
    setNotice("Неверный код доступа.");
    return;
  }

  unlockAdminSession();
  setNotice("Управление открыто.");
  render();
}

window.addEventListener("hashchange", () => {
  state.route = getRoute();
  render();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modalBookId) {
    closeContact();
  }
});

setupDataLayer();
