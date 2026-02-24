const TOKEN_KEY = "token";

const connectScreen = document.getElementById("connect-screen");
const saveScreen = document.getElementById("save-screen");
const tokenInput = document.getElementById("token-input");
const connectBtn = document.getElementById("connect-btn");
const getTokenLink = document.getElementById("get-token-link");
const signoutBtn = document.getElementById("signout-btn");
const pageUrlEl = document.getElementById("page-url");
const pageTitleEl = document.getElementById("page-title");
const pageFavicon = document.getElementById("page-favicon");
const titleInput = document.getElementById("title-input");
const descriptionInput = document.getElementById("description-input");
const groupTrigger = document.getElementById("group-trigger");
const groupDot = document.getElementById("group-dot");
const groupTriggerLabel = document.getElementById("group-trigger-label");
const groupList = document.getElementById("group-list");
const saveBtn = document.getElementById("save-btn");
let selectedGroupId = "";
let groupsList = [];
const saveStatus = document.getElementById("save-status");

/* ====== Helpers (SVG icons for status) ====== */

const STATUS_ICONS = {
  success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

/* ====== Screen Transitions ====== */

function showScreen(connected) {
  connectScreen.classList.toggle("hidden", connected);
  saveScreen.classList.toggle("hidden", !connected);
}

/* ====== Status Toast ====== */

function showStatus(message, isError) {
  const type = isError ? "error" : "success";
  saveStatus.innerHTML = STATUS_ICONS[type] + '<span>' + message + '</span>';
  saveStatus.classList.remove("hidden", "success", "error", "fade-out");
  saveStatus.classList.add(type);
}

function hideStatus() {
  saveStatus.classList.add("hidden");
  saveStatus.classList.remove("fade-out");
}

function fadeOutStatus() {
  saveStatus.classList.add("fade-out");
  setTimeout(hideStatus, 300);
}

/* ====== Loading spinner for buttons ====== */

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.classList.add("loading");
    btn.disabled = true;
  } else {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

/* ====== Token Storage ====== */

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_KEY], (data) => resolve(data[TOKEN_KEY] || null));
  });
}

function setToken(token) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(TOKEN_KEY, resolve);
  });
}

/* ====== API ====== */

function getBaseUrl() {
  return typeof BASE_URL !== "undefined" ? BASE_URL : "http://localhost:3000";
}

function apiFetch(path, options = {}) {
  return getToken().then((token) => {
    if (!token) throw new Error("Not connected");
    const url = getBaseUrl().replace(/\/$/, "") + path;
    const headers = {
      Authorization: "Bearer " + token,
      ...options.headers,
    };
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    return fetch(url, { ...options, headers });
  });
}

function fetchGroups() {
  return apiFetch("/api/groups").then((res) => {
    if (!res.ok) throw new Error(res.status === 401 ? "Invalid token" : "Failed to load groups");
    return res.json();
  });
}

function saveBookmark(payload) {
  return apiFetch("/api/bookmarks", { method: "POST", body: payload }).then((res) =>
    res.json().then((data) => {
      if (!res.ok) return Promise.reject(new Error(data?.error || "Failed to save"));
      return data;
    })
  );
}

/* ====== Tab Helpers ====== */

function getCurrentTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0] || null));
  });
}

function domainFromUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname || "";
  } catch {
    return "";
  }
}

function getFaviconUrl(url) {
  const hostname = domainFromUrl(url);
  if (!hostname) return null;
  return "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(hostname) + "&sz=32";
}

/* ====== Init Save Screen ====== */

function initSaveScreen(tab) {
  const url = tab?.url || "";
  const title = tab?.title || "";
  const hostname = domainFromUrl(url);
  pageUrlEl.textContent = hostname || "(no URL)";
  pageTitleEl.textContent = title || "(no title)";
  pageTitleEl.title = title;
  pageUrlEl.title = url;
  titleInput.value = title;
  descriptionInput.value = "";
  if (url.startsWith("http")) {
    const faviconUrl = "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(hostname) + "&sz=32";
    pageFavicon.style.backgroundImage = "url(" + faviconUrl + ")";
    pageFavicon.style.backgroundSize = "cover";
  } else {
    pageFavicon.style.backgroundImage = "";
  }
  selectedGroupId = "";
  updateGroupTrigger("", "No group", "#6b7280");
  groupList.innerHTML = "";
  const noGroupOpt = document.createElement("div");
  noGroupOpt.className = "group-option";
  noGroupOpt.setAttribute("role", "option");
  noGroupOpt.dataset.groupId = "";
  noGroupOpt.tabIndex = 0;
  noGroupOpt.innerHTML = '<span class="group-dot group-dot-muted"></span>No group';
  groupList.appendChild(noGroupOpt);
  fetchGroups()
    .then((groups) => {
      groupsList = groups;
      groups.forEach((g) => {
        const opt = document.createElement("div");
        opt.className = "group-option";
        opt.setAttribute("role", "option");
        opt.dataset.groupId = g.id;
        opt.tabIndex = 0;
        const dot = document.createElement("span");
        dot.className = "group-dot";
        dot.style.backgroundColor = g.color || "#6b7280";
        opt.appendChild(dot);
        opt.appendChild(document.createTextNode(g.name));
        groupList.appendChild(opt);
      });
      updateGroupTrigger("", "No group", "#6b7280");
    })
    .catch(() => {});
}

/* ====== Group Dropdown ====== */

function updateGroupTrigger(id, label, color) {
  selectedGroupId = id;
  groupTriggerLabel.textContent = label;
  groupDot.style.backgroundColor = color || "#6b7280";
  groupDot.classList.toggle("group-dot-muted", !color || color === "#6b7280");
  groupList.querySelectorAll(".group-option").forEach((el) => {
    el.setAttribute("aria-selected", el.dataset.groupId === id);
  });
}

function openGroupList() {
  groupList.classList.remove("hidden");
  groupTrigger.setAttribute("aria-expanded", "true");
}

function closeGroupList() {
  groupList.classList.add("hidden");
  groupTrigger.setAttribute("aria-expanded", "false");
}

/* ====== Event Listeners ====== */

function doConnect() {
  const token = tokenInput.value.trim();
  if (!token) return;
  setButtonLoading(connectBtn, true);
  setToken(token)
    .then(() => getToken())
    .then((t) => {
      if (t) showScreen(true);
      tokenInput.value = "";
      requestAnimationFrame(() => {
        getCurrentTab().then(initSaveScreen).catch(() => {});
        setButtonLoading(connectBtn, false);
      });
    })
    .catch(() => {
      setButtonLoading(connectBtn, false);
    });
}

connectBtn.addEventListener("click", doConnect);

tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doConnect();
});

getTokenLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: getBaseUrl() });
});

signoutBtn.addEventListener("click", () => {
  clearToken().then(() => {
    showScreen(false);
  });
});

groupTrigger.addEventListener("click", () => {
  if (groupList.classList.contains("hidden")) openGroupList();
  else closeGroupList();
});

document.addEventListener("click", (e) => {
  if (groupList.classList.contains("hidden")) return;
  if (!groupTrigger.contains(e.target) && !groupList.contains(e.target)) closeGroupList();
});

groupList.addEventListener("click", (e) => {
  const opt = e.target.closest(".group-option");
  if (!opt) return;
  const id = opt.dataset.groupId || "";
  const label = id ? (groupsList.find((g) => g.id === id)?.name ?? "No group") : "No group";
  const color = id ? (groupsList.find((g) => g.id === id)?.color || "#6b7280") : "#6b7280";
  updateGroupTrigger(id, label, color);
  closeGroupList();
});

saveBtn.addEventListener("click", () => {
  getCurrentTab().then((tab) => {
    const url = tab?.url || "";
    if (!url || !url.startsWith("http")) {
      showStatus("This page cannot be bookmarked.", true);
      return;
    }
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const groupId = selectedGroupId || null;
    const faviconUrl = getFaviconUrl(url) || undefined;
    setButtonLoading(saveBtn, true);
    hideStatus();
    saveBookmark({ url, title: title || undefined, description: description || undefined, groupId, faviconUrl })
      .then(() => {
        showStatus("Saved!");
        setTimeout(() => window.close(), 100);
      })
      .catch((err) => {
        showStatus(err.message || "Failed to save bookmark.", true);
        setButtonLoading(saveBtn, false);
      });
  });
});

/* ====== Init ====== */

getToken().then((token) => {
  if (token) {
    showScreen(true);
    getCurrentTab().then(initSaveScreen);
  } else {
    showScreen(false);
  }
});
