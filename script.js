const input = document.getElementById("inputTask");
const btn = document.getElementById("addBtn");
const list = document.getElementById("list");
const searchBox = document.querySelector(".search-box");
const searchIcon = document.getElementById("searchIcon");
const search = document.getElementById("search");
const errorMsg = document.getElementById("errorMsg");
const mainTitle = document.getElementById("mainTitle");
const tabWatched = document.getElementById("tabWatched");
const tabPlan = document.getElementById("tabPlan");
const countWatched = document.getElementById("countWatched");
const countPlan = document.getElementById("countPlan");
const themeToggle = document.getElementById("themeToggle");
const typeAnime = document.querySelector('[data-type="anime"]');
const typeSeries = document.querySelector('[data-type="series"]');
const typeMovie = document.querySelector('[data-type="movie"]');
const posterModal = document.getElementById("posterModal");
const posterModalImg = document.getElementById("posterModalImg");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const selectModeBtn = document.getElementById("selectModeBtn");
const selectBar = document.getElementById("selectBar");
const selectAllBtn = document.getElementById("selectAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const selectedCount = document.getElementById("selectedCount");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

const normalize = str => str.trim().toLowerCase();

let currentType = "anime";
let currentTab = "watched";
let activeEditId = null;
let selectMode = false;  // mode pilih aktif atau tidak
let selected = new Set(); // menyimpan id item yang dipilih
let todos = JSON.parse(localStorage.getItem("todos")) || [];
// fix data lama yang tidak punya id
todos = todos.map(t => ({
  ...t,
  id: t.id || Date.now() + Math.random()
}));
localStorage.setItem("todos", JSON.stringify(todos));

let undoStack = [JSON.stringify(todos)]; // simpan state awal
let undoStackIndex = 0;                  // posisi sekarang

function openPoster(url) {
  posterModalImg.src = url;
  posterModal.classList.add("visible");
}

// klik di luar poster → tutup
posterModal.onclick = () => {
  posterModal.classList.remove("visible");
};

const TMDB_KEY = "ac8a71c047f672491033f1fdc7ab04e4"; // ⬅️ isi dengan key kamu

async function fetchPoster(title) {
  try {
    if (currentType === "anime") {
      // Kitsu untuk anime
      const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1`;
      const r = await fetch(url);
      const data = await r.json();
      if (!data.data.length) return null;
      return data.data[0].attributes.posterImage.medium;

    } else if (currentType === "series") {
      // TMDB untuk series
      const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`;
      const r = await fetch(url);
      const data = await r.json();
      if (!data.results.length) return null;
      return `https://image.tmdb.org/t/p/w300${data.results[0].poster_path}`;

    } else if (currentType === "movie") {
      // TMDB untuk movie
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`;
      const r = await fetch(url);
      const data = await r.json();
      if (!data.results.length) return null;
      return `https://image.tmdb.org/t/p/w300${data.results[0].poster_path}`;
    }

  } catch (e) {
    return null;
  }
}

// ── Theme ──
let isDark = localStorage.getItem("theme") !== "light";

function applyTheme() {
  if (isDark) {
    document.body.classList.remove("light");
    themeToggle.textContent = "🌙";
  } else {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  }
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

themeToggle.onclick = () => {
  isDark = !isDark;
  applyTheme();
};

applyTheme();

// ── Search ──
searchIcon.onclick = () => {
  searchBox.classList.toggle("active");
  search.focus();
};

search.addEventListener("blur", () => {
  if (search.value === "") searchBox.classList.remove("active");
});

function render() {
  list.innerHTML = "";

  const watchedCount = todos.filter(t =>
    (t.status || "watched") === "watched" && (t.type || "anime") === currentType
  ).length;
  const planCount = todos.filter(t =>
    (t.status || "watched") === "plan" && (t.type || "anime") === currentType
  ).length;

  countWatched.textContent = watchedCount;
  countPlan.textContent = planCount;

  const keyword = search.value.toLowerCase();

  const filtered = todos
    .filter(t => (t.status || "watched") === currentTab)
    .filter(t => (t.type || "anime") === currentType)
    .filter(t => t.title.toLowerCase().includes(keyword))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  let lastLetter = "";

  filtered.forEach((todo) => {
    const firstLetter = todo.title?.[0]?.toUpperCase() || "";
    if (!firstLetter) return;

    if (firstLetter !== lastLetter) {
      const header = document.createElement("li");
      header.textContent = firstLetter;
      header.classList.add("letter-header");
      list.appendChild(header);
      lastLetter = firstLetter;
    }

    const li = document.createElement("li");

    // select mode
if (selectMode) {
  if (selected.has(todo.id)) li.classList.add("selected");
  li.onclick = () => {
    if (selected.has(todo.id)) {
      selected.delete(todo.id);
    } else {
      selected.add(todo.id);
    }
    updateSelectedCount();
    render();
  };
}

    // klik item → buka poster kalau ada
if (todo.poster && !selectMode) {
  li.onclick = () => {
    if (activeEditId === todo.id) return; // ⬅️ jangan buka poster kalau edit form terbuka
    openPoster(todo.poster);
  };
}

    // Top row
    const top = document.createElement("div");
    top.classList.add("item-top");

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("item-title");
    titleSpan.textContent = todo.title;

    const actions = document.createElement("div");
    actions.classList.add("item-actions");

    const editBtn = document.createElement("button");
    editBtn.classList.add("btn-edit");
    editBtn.textContent = "✏️";
    editBtn.title = "Edit info";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      activeEditId = activeEditId === todo.id ? null : todo.id;
      render();
    };

    const delBtn = document.createElement("button");
    delBtn.classList.add("btn-del");
    delBtn.textContent = "✕";
    delBtn.title = "Hapus";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      const i = todos.findIndex(t => t.id === todo.id);
      todos.splice(i, 1);
      if (activeEditId === todo.id) activeEditId = null;
      save();
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    top.appendChild(titleSpan);
    top.appendChild(actions);
    li.appendChild(top);

    // Badges
    const badges = [];
    if (todo.season)  badges.push(`${todo.season} Season`);
    if (todo.movie)   badges.push(`${todo.movie} Movie`);
    if (todo.ova)     badges.push(`${todo.ova} OVA`);
    if (todo.special) badges.push(`${todo.special} Special`);

    if (badges.length > 0) {
      const badgeRow = document.createElement("div");
      badgeRow.classList.add("item-badges");
      badges.forEach(b => {
        const span = document.createElement("span");
        span.classList.add("badge");
        span.textContent = b;
        badgeRow.appendChild(span);
      });
      li.appendChild(badgeRow);
    }

    // Inline edit form
    if (activeEditId === todo.id) {
      const form = document.createElement("div");
      form.classList.add("edit-form");

      const row = document.createElement("div");
      row.classList.add("edit-form-row");

      // ── Ganti Poster ──
const posterSection = document.createElement("div");
posterSection.classList.add("poster-section");

// preview poster sekarang
if (todo.poster) {
  const currentPoster = document.createElement("img");
  currentPoster.src = todo.poster;
  currentPoster.classList.add("current-poster");
  posterSection.appendChild(currentPoster);
}

// tombol ganti poster
const changePosterBtn = document.createElement("button");
changePosterBtn.classList.add("btn-change-poster");
changePosterBtn.textContent = todo.poster ? "🔄 Ganti Poster" : "🔍 Cari Poster";

// input pencarian
const posterSearchRow = document.createElement("div");
posterSearchRow.classList.add("poster-search-row");
posterSearchRow.style.display = "none";

const posterSearchInput = document.createElement("input");
posterSearchInput.type = "text";
posterSearchInput.placeholder = "Cari judul...";
posterSearchInput.value = todo.title;

const posterSearchBtn = document.createElement("button");
posterSearchBtn.textContent = "Cari";
posterSearchBtn.classList.add("btn-poster-search");

// hasil pencarian
const posterResults = document.createElement("div");
posterResults.classList.add("poster-results");

posterSearchRow.appendChild(posterSearchInput);
posterSearchRow.appendChild(posterSearchBtn);
posterSection.appendChild(changePosterBtn);
posterSection.appendChild(posterSearchRow);
posterSection.appendChild(posterResults);
form.appendChild(posterSection);

changePosterBtn.onclick = (e) => {
  e.stopPropagation();
  posterSearchRow.style.display = posterSearchRow.style.display === "none" ? "flex" : "none";
  posterResults.innerHTML = "";
};

posterSearchBtn.onclick = async (e) => {
  e.stopPropagation();
  const query = posterSearchInput.value.trim();
  if (!query) return;

  posterResults.innerHTML = "<span style='color:var(--text-muted);font-size:12px'>Mencari...</span>";

  try {
    let results = [];

    if (currentType === "anime") {
      const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=6`;
      const r = await fetch(url);
      const data = await r.json();
      results = data.data.map(item => ({
        title: item.attributes.canonicalTitle,
        poster: item.attributes.posterImage?.medium
      })).filter(r => r.poster);

    } else if (currentType === "series") {
      const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`;
      const r = await fetch(url);
      const data = await r.json();
      results = data.results.slice(0, 6).map(item => ({
        title: item.name,
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null
      })).filter(r => r.poster);

    } else if (currentType === "movie") {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`;
      const r = await fetch(url);
      const data = await r.json();
      results = data.results.slice(0, 6).map(item => ({
        title: item.title,
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w300${item.poster_path}` : null
      })).filter(r => r.poster);
    }

    posterResults.innerHTML = "";

    if (!results.length) {
      posterResults.innerHTML = "<span style='color:var(--text-muted);font-size:12px'>Tidak ada hasil</span>";
      return;
    }

    results.forEach(result => {
      const img = document.createElement("img");
      img.src = result.poster;
      img.title = result.title;
      img.classList.add("poster-result-item");

      img.onclick = (e) => {
        e.stopPropagation();
        const idx = todos.findIndex(t => t.id === todo.id);
        todos[idx].poster = result.poster;
        activeEditId = null;
        save();
      };

      posterResults.appendChild(img);
    });

  } catch (err) {
    posterResults.innerHTML = "<span style='color:var(--danger);font-size:12px'>Gagal mencari</span>";
  }
};

posterSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") posterSearchBtn.click();
});

      const formActions = document.createElement("div");
      formActions.classList.add("edit-form-actions");

      const cancelBtn = document.createElement("button");
      cancelBtn.classList.add("btn-cancel");
      cancelBtn.textContent = "Batal";
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        activeEditId = null;
        render();
      };

      const saveBtn = document.createElement("button");
      saveBtn.classList.add("btn-save");
      saveBtn.textContent = "Simpan";
      saveBtn.onclick = (e) => {
        e.stopPropagation();
        const idx = todos.findIndex(t => t.id === todo.id);
        activeEditId = null;
        save();
      };

      // ── Sub-items ──
const subSection = document.createElement("div");
subSection.classList.add("sub-section");

// list subitem yang sudah ada
const subList = document.createElement("ul");
subList.classList.add("sub-list");

(todo.subitems || []).forEach((sub, i) => {
  const subLi = document.createElement("li");
  subLi.classList.add("sub-item");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = sub.done;
  checkbox.onchange = () => {
    const idx = todos.findIndex(t => t.id === todo.id);
    todos[idx].subitems[i].done = checkbox.checked;
    save();
  };

  const label = document.createElement("span");
  label.textContent = sub.title;
  if (sub.done) label.style.textDecoration = "line-through";

  const delSub = document.createElement("button");
  delSub.textContent = "✕";
  delSub.classList.add("btn-del-sub");
  delSub.onclick = (e) => {
    e.stopPropagation();
    const idx = todos.findIndex(t => t.id === todo.id);
    todos[idx].subitems.splice(i, 1);
    save();
  };

  subLi.appendChild(checkbox);
  subLi.appendChild(label);
  subLi.appendChild(delSub);
  subList.appendChild(subLi);
});

// input tambah subitem baru
const subInputRow = document.createElement("div");
subInputRow.classList.add("sub-input-row");

const subInput = document.createElement("input");
subInput.type = "text";
subInput.placeholder = "add sublist...";

const subAddBtn = document.createElement("button");
subAddBtn.textContent = "+";
subAddBtn.classList.add("btn-sub-add");
subAddBtn.onclick = (e) => {
  e.stopPropagation();
  const val = subInput.value.trim();
  if (!val) return;
  const idx = todos.findIndex(t => t.id === todo.id);
  if (!todos[idx].subitems) todos[idx].subitems = [];
  todos[idx].subitems.push({ title: val, done: false });
  save();
};

// bisa juga tekan Enter
subInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") subAddBtn.click();
});

subInputRow.appendChild(subInput);
subInputRow.appendChild(subAddBtn);
subSection.appendChild(subList);
subSection.appendChild(subInputRow);
form.appendChild(subSection);

      formActions.appendChild(cancelBtn);
      formActions.appendChild(saveBtn);
      form.appendChild(row);
      form.appendChild(formActions);
      li.appendChild(form);
    }

    list.appendChild(li);
  });
}

function save() {
  // hapus undoStack setelah posisi sekarang (kalau habis undo lalu edit)
  undoStack = undoStack.slice(0, undoStackIndex + 1);

  // simpan state baru
  undoStack.push(JSON.stringify(todos));
  undoStackIndex++;

  localStorage.setItem("todos", JSON.stringify(todos));
  render();
  updateUndoRedo();
}

function undo() {
  if (undoStackIndex <= 0) return; // sudah paling awal
  undoStackIndex--;
  todos = JSON.parse(undoStack[undoStackIndex]);
  localStorage.setItem("todos", JSON.stringify(todos));
  render();
  updateUndoRedo();
}

function redo() {
  if (undoStackIndex >= undoStack.length - 1) return; // sudah paling akhir
  undoStackIndex++;
  todos = JSON.parse(undoStack[undoStackIndex]);
  localStorage.setItem("todos", JSON.stringify(todos));
  render();
  updateUndoRedo();
}

function updateUndoRedo() {
  undoBtn.disabled = undoStackIndex <= 0;
  redoBtn.disabled = undoStackIndex >= undoStack.length - 1;
}

undoBtn.onclick = () => { undo(); updateUndoRedo(); };
redoBtn.onclick = () => { redo(); updateUndoRedo(); };

function toggleSelectMode() {
  selectMode = !selectMode;
  selected.clear();

  selectModeBtn.classList.toggle("active", selectMode);
  selectBar.style.display = selectMode ? "flex" : "none";
  selectedCount.textContent = "0";
  render();
}

function updateSelectedCount() {
  selectedCount.textContent = selected.size;
}

selectModeBtn.onclick = () => toggleSelectMode();

selectAllBtn.onclick = () => {
  const visible = todos
    .filter(t => (t.status || "watched") === currentTab)
    .filter(t => (t.type || "anime") === currentType);

  // kalau semua sudah dipilih → unselect semua
  if (selected.size === visible.length) {
    selected.clear();
  } else {
    visible.forEach(t => selected.add(t.id));
  }
  updateSelectedCount();
  render();
};

deleteSelectedBtn.onclick = () => {
  if (selected.size === 0) return;
  todos = todos.filter(t => !selected.has(t.id));
  selected.clear();
  toggleSelectMode();
  save();
};

// Export
exportBtn.onclick = () => {
  const data = JSON.stringify(todos, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "watchlist-backup.json";
  a.click();
  URL.revokeObjectURL(url);
};

// Import
importBtn.onclick = () => importFile.click();

importFile.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error();
      todos = data;
      save();
      alert("Data berhasil diimport!");
    } catch {
      alert("File tidak valid!");
    }
  };
  reader.readAsText(file);

  // reset input biar bisa import file yang sama lagi
  importFile.value = "";
};

document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey; // ctrl di Windows, cmd di Mac
  if (ctrl && e.key === "z") { e.preventDefault(); undo(); }
  if (ctrl && e.key === "y") { e.preventDefault(); redo(); }
});

btn.onclick = async () => {
  const value = input.value.trim();
  if (value === "") return;

  const exists = todos.some(t =>
    normalize(t.title) === normalize(value) &&
    (t.type || "anime") === currentType &&
    (t.status || "watched") === currentTab
  );

  if (exists) {
    errorMsg.textContent = `${mainTitle.textContent} sudah ada!`;
    return;
  } else {
    errorMsg.textContent = "";
  }

  const poster = await fetchPoster(value);
  console.log("poster:", poster);

  todos.push({
  id: Date.now(),
  title: value,
  status: currentTab,
  type: currentType,
  season: null, movie: null, ova: null, special: null,
  poster: poster,
  subitems: [], // ⬅️ tambah ini
});

  input.value = "";
  input.focus();
  save();
};

function setActiveType(activeBtn, type) {
  currentType = type;
  activeEditId = null;
  document.querySelectorAll(".type-tabs button")
    .forEach(b => b.classList.remove("active"));
  activeBtn.classList.add("active");
  mainTitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Watchlist`;
  render();
}

typeAnime.onclick  = () => setActiveType(typeAnime, "anime");
typeSeries.onclick = () => setActiveType(typeSeries, "series");
typeMovie.onclick  = () => setActiveType(typeMovie, "movie");

tabWatched.onclick = () => {
  currentTab = "watched";
  activeEditId = null;
  tabWatched.classList.add("active");
  tabPlan.classList.remove("active");
  render();
};

tabPlan.onclick = () => {
  currentTab = "plan";
  activeEditId = null;
  tabPlan.classList.add("active");
  tabWatched.classList.remove("active");
  render();
};

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btn.click();
});

search.addEventListener("input", render);

render();
updateUndoRedo();
