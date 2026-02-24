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
const groupSelect = document.getElementById("group-select");
const saveBtn = document.getElementById("save-btn");
const saveStatus = document.getElementById("save-status");

function showScreen(connected) {
  connectScreen.classList.toggle("hidden", connected);
  saveScreen.classList.toggle("hidden", !connected);
}

function showStatus(message, isError) {
  saveStatus.textContent = message;
  saveStatus.classList.remove("hidden", "success", "error");
  saveStatus.classList.add(isError ? "error" : "success");
}

function hideStatus() {
  saveStatus.classList.add("hidden");
}

function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_KEY], (data) => resolve(data[TOKEN_KEY] || null));
  });
}

function setToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TOKEN_KEY]: token }, resolve);
  });
}

function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(TOKEN_KEY, resolve);
  });
}

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
  groupSelect.innerHTML = '<option value="">No group</option>';
  fetchGroups()
    .then((groups) => {
      groups.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.id;
        opt.textContent = g.name;
        groupSelect.appendChild(opt);
      });
    })
    .catch(() => {});
}

connectBtn.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  connectBtn.disabled = true;
  setToken(token).then(() => {
    showScreen(true);
    getCurrentTab().then(initSaveScreen);
    connectBtn.disabled = false;
    tokenInput.value = "";
  });
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

saveBtn.addEventListener("click", () => {
  getCurrentTab().then((tab) => {
    const url = tab?.url || "";
    if (!url || !url.startsWith("http")) {
      showStatus("This page cannot be bookmarked.", true);
      return;
    }
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const groupId = groupSelect.value || null;
    saveBtn.disabled = true;
    hideStatus();
    saveBookmark({ url, title: title || undefined, description: description || undefined, groupId })
      .then(() => {
        showStatus("Saved!");
        setTimeout(() => window.close(), 1500);
      })
      .catch((err) => {
        showStatus(err.message || "Failed to save bookmark.", true);
        saveBtn.disabled = false;
      });
  });
});

getToken().then((token) => {
  if (token) {
    showScreen(true);
    getCurrentTab().then(initSaveScreen);
  } else {
    showScreen(false);
  }
});
