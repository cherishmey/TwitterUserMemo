(function () {
  "use strict";

  const PROFILE_TARGET_MARK = "profile-target";
  const CARD_TARGET_MARK = "card-target";
  const PROFILE_MEMO_SELECTOR = ".x-memo-profile";
  const CARD_MEMO_SELECTOR = ".x-memo-card";

  let currentProfileScreenName = null;
  let profileObserver = null;
  let layersObserver = null;
  let layersWaitObserver = null;
  let themeObserver = null;
  const RESERVED_PATHS = new Set([
    "home",
    "explore",
    "notifications",
    "messages",
    "i",
    "search",
    "settings",
    "compose",
    "login",
    "signup",
    "tos",
    "privacy",
    "about"
  ]);

  function extractScreenNameFromPath(pathname) {
    try {
      const match = pathname.match(/^\/([a-zA-Z0-9_]{1,15})(?:\/|$)/);
      if (!match) {
        return null;
      }

      const candidate = match[1];
      if (RESERVED_PATHS.has(candidate.toLowerCase())) {
        return null;
      }

      return `@${candidate}`;
    } catch {
      return null;
    }
  }

  function extractExactScreenNameFromPath(pathname) {
    try {
      const match = pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/?$/);
      if (!match) {
        return null;
      }

      const candidate = match[1];
      if (RESERVED_PATHS.has(candidate.toLowerCase())) {
        return null;
      }

      return `@${candidate}`;
    } catch {
      return null;
    }
  }

  function getScreenName() {
    return extractScreenNameFromPath(window.location.pathname);
  }

  function debounce(fn, ms) {
    let timeoutId = null;
    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        fn.apply(this, args);
      }, ms);
    };
  }

  function saveMemo(screenName, text) {
    try {
      return chrome.storage.sync.set({
        [screenName]: {
          memo: text,
          updatedAt: Date.now()
        }
      });
    } catch {
      return Promise.resolve();
    }
  }

  function loadMemo(screenName) {
    try {
      return chrome.storage.sync
        .get([screenName])
        .then((result) => result[screenName]?.memo || "")
        .catch(() => "");
    } catch {
      return Promise.resolve("");
    }
  }

  function safeQuery(root, selector) {
    try {
      return root?.querySelector?.(selector) || null;
    } catch {
      return null;
    }
  }

  function safeQueryAll(root, selector) {
    try {
      return Array.from(root?.querySelectorAll?.(selector) || []);
    } catch {
      return [];
    }
  }

  function safeClosest(element, selector) {
    try {
      return element?.closest?.(selector) || null;
    } catch {
      return null;
    }
  }

  function insertAfter(target, element) {
    try {
      target?.insertAdjacentElement?.("afterend", element);
      return true;
    } catch {
      try {
        target?.parentNode?.insertBefore?.(element, target.nextSibling);
        return true;
      } catch {
        return false;
      }
    }
  }

  function prependTo(target, element) {
    try {
      target?.insertBefore?.(element, target.firstChild || null);
      return true;
    } catch {
      try {
        target?.appendChild?.(element);
        return true;
      } catch {
        return false;
      }
    }
  }

  function autoResize(textarea) {
    try {
      textarea.style.height = "auto";
      const nextHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
      textarea.style.height = `${nextHeight}px`;
    } catch {}
  }

  function extractHandleFromHref(href) {
    try {
      const url = new URL(href, window.location.origin);
      return extractScreenNameFromPath(url.pathname);
    } catch {
      return null;
    }
  }

  function getHandleFromUserName(userNameElement) {
    const links = safeQueryAll(userNameElement, "a[href]");
    for (const link of links) {
      const handle = extractHandleFromHref(link.href);
      if (handle) {
        return handle;
      }
    }

    try {
      const text = userNameElement?.textContent || "";
      const match = text.match(/@([a-zA-Z0-9_]{1,15})/);
      return match ? `@${match[1]}` : null;
    } catch {
      return null;
    }

    return null;
  }

  function isDarkTheme() {
    try {
      const rootDataset = Object.values(document.documentElement?.dataset || {}).join(" ").toLowerCase();
      const bodyDataset = Object.values(document.body?.dataset || {}).join(" ").toLowerCase();
      const bodyClassName =
        typeof document.body?.className === "string"
          ? document.body.className.toLowerCase()
          : Array.from(document.body?.classList || []).join(" ").toLowerCase();
      const rootClassName =
        typeof document.documentElement?.className === "string"
          ? document.documentElement.className.toLowerCase()
          : Array.from(document.documentElement?.classList || []).join(" ").toLowerCase();
      const signals = [rootDataset, bodyDataset, bodyClassName, rootClassName].join(" ");
      return signals.includes("dark") || signals.includes("dim");
    } catch {
      return false;
    }
  }

  function syncThemeClass() {
    try {
      document.documentElement.classList.toggle("x-memo-dark", isDarkTheme());
    } catch {}
  }

  function clearProfileMemo() {
    const memos = safeQueryAll(document, PROFILE_MEMO_SELECTOR);
    for (const memo of memos) {
      try {
        memo.remove();
      } catch {}
    }

    const markedTargets = safeQueryAll(document, `[data-xmemo="${PROFILE_TARGET_MARK}"]`);
    for (const target of markedTargets) {
      try {
        target.removeAttribute("data-xmemo");
      } catch {}
    }
  }

  function createMemoTextarea(screenName, ariaLabel) {
    const textarea = document.createElement("textarea");
    textarea.className = "x-memo-textarea";
    textarea.rows = 2;
    textarea.placeholder = "Write a note\u2026";
    textarea.setAttribute("aria-label", ariaLabel);

    const saveDebounced = debounce(() => {
      saveMemo(screenName, textarea.value || "");
    }, 300);

    textarea.addEventListener("input", () => {
      autoResize(textarea);
      saveDebounced();
    });

    return textarea;
  }

  function populateMemo(textarea, screenName, isStale) {
    loadMemo(screenName).then((memo) => {
      if (!textarea.isConnected) {
        return;
      }
      if (typeof isStale === "function" && isStale()) {
        return;
      }
      textarea.value = memo;
      autoResize(textarea);
    });
  }

  function findProfileUserName(primaryColumn, userDescription) {
    const userNames = safeQueryAll(primaryColumn, '[data-testid="UserName"]');

    if (userDescription) {
      for (const node of userNames) {
        const handle = getHandleFromUserName(node);
        let insideArticle = false;

        try {
          insideArticle = Boolean(node.closest("article"));
        } catch {}

        if (!handle || insideArticle) {
          continue;
        }

        try {
          if (node.compareDocumentPosition(userDescription) & Node.DOCUMENT_POSITION_FOLLOWING) {
            return node;
          }
        } catch {
          return node;
        }
      }
    }

    for (const node of userNames) {
      const handle = getHandleFromUserName(node);
      let insideArticle = false;

      try {
        insideArticle = Boolean(node.closest("article"));
      } catch {}

      if (handle && !insideArticle) {
        return node;
      }
    }

    return null;
  }

  function getProfileRoot() {
    return (
      safeQuery(document, '[data-testid="primaryColumn"]') ||
      safeQuery(document, 'main[role="main"]') ||
      safeQuery(document, "main") ||
      null
    );
  }

  function findProfileLink(root, screenName) {
    const links = safeQueryAll(root, "a[href]");

    for (const link of links) {
      const handle = (() => {
        try {
          const url = new URL(link.href, window.location.origin);
          return extractExactScreenNameFromPath(url.pathname);
        } catch {
          return null;
        }
      })();
      if (handle !== screenName) {
        continue;
      }

      let insideArticle = false;
      let insideLayers = false;

      try {
        insideArticle = Boolean(link.closest("article"));
      } catch {}

      try {
        insideLayers = Boolean(link.closest("#layers"));
      } catch {}

      if (!insideArticle && !insideLayers) {
        return link;
      }
    }

    return null;
  }

  function findProfileInsertionTarget(profileRoot, screenName, userName, userDescription) {
    if (userDescription) {
      return userDescription;
    }

    if (userName) {
      return userName.parentElement || userName;
    }

    const profileLink = findProfileLink(profileRoot, screenName);
    if (!profileLink) {
      return profileRoot.firstElementChild || profileRoot;
    }

    return (
      safeClosest(profileLink, '[data-testid="UserName"]') ||
      safeClosest(profileLink, "header") ||
      safeClosest(profileLink, "section") ||
      profileLink.parentElement ||
      profileLink
    );
  }

  function renderProfileMemo() {
    syncThemeClass();

    const profileRoot = getProfileRoot();
    if (!profileRoot) {
      return;
    }

    const userDescription = safeQuery(profileRoot, '[data-testid="UserDescription"]');
    const urlScreenName = getScreenName();

    if (!urlScreenName && !userDescription) {
      return;
    }

    const userName = findProfileUserName(profileRoot, userDescription);
    const screenName = (userName ? getHandleFromUserName(userName) : null) || urlScreenName;
    if (!screenName) {
      return;
    }

    if (currentProfileScreenName && currentProfileScreenName !== screenName) {
      clearProfileMemo();
    }

    const existingMemo = safeQuery(profileRoot, PROFILE_MEMO_SELECTOR);
    if (existingMemo && currentProfileScreenName === screenName) {
      return;
    }

    const insertionTarget = findProfileInsertionTarget(profileRoot, screenName, userName, userDescription);
    if (!insertionTarget) {
      return;
    }

    if (insertionTarget.dataset.xmemo && !existingMemo) {
      try {
        insertionTarget.removeAttribute("data-xmemo");
      } catch {}
    }

    if (insertionTarget.dataset.xmemo) {
      return;
    }

    const container = document.createElement("div");
    container.className = "x-memo-profile";

    const label = document.createElement("div");
    label.className = "x-memo-label";
    label.innerHTML =
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
      "</svg>" +
      "<span>Memo</span>";

    const textarea = createMemoTextarea(screenName, "Profile memo");

    container.appendChild(label);
    container.appendChild(textarea);

    const inserted =
      insertionTarget === profileRoot ? prependTo(profileRoot, container) : insertAfter(insertionTarget, container);

    if (!inserted) {
      return;
    }

    insertionTarget.dataset.xmemo = PROFILE_TARGET_MARK;
    currentProfileScreenName = screenName;
    populateMemo(textarea, screenName, () => currentProfileScreenName !== screenName);
  }

  function createCardToggleMarkup() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
      "</svg>" +
      "<span>Memo</span>"
    );
  }

  function findHoverCardContent(rootNode, userName) {
    const candidates = [
      safeQuery(rootNode, '[data-testid="HoverCard"]'),
      safeClosest(userName, 'div[role="dialog"]'),
      safeClosest(userName, '[data-testid="HoverCard"]'),
      safeClosest(userName, '[data-testid="TypeaheadUser"]'),
      safeClosest(userName, "section"),
      safeClosest(userName, "article"),
      rootNode
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.nodeType === Node.ELEMENT_NODE) {
        return candidate;
      }
    }

    return null;
  }

  function injectHoverCardMemo(rootNode) {
    if (!(rootNode instanceof Element)) {
      return;
    }

    const userName = safeQuery(rootNode, '[data-testid="UserName"]');
    if (!userName) {
      return;
    }

    const screenName = getHandleFromUserName(userName);
    if (!screenName) {
      return;
    }

    const cardContent = findHoverCardContent(rootNode, userName);
    if (!cardContent) {
      return;
    }

    if (safeQuery(cardContent, CARD_MEMO_SELECTOR)) {
      return;
    }

    if (cardContent.dataset.xmemo) {
      return;
    }

    const container = document.createElement("div");
    container.className = "x-memo-card";

    const toggle = document.createElement("button");
    toggle.className = "x-memo-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Toggle memo");
    toggle.innerHTML = createCardToggleMarkup();

    const body = document.createElement("div");
    body.className = "x-memo-card-body";

    const textarea = createMemoTextarea(screenName, "Hover card memo");
    body.appendChild(textarea);

    let hasLoaded = false;

    toggle.addEventListener("click", () => {
      const isOpen = body.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));

      if (!isOpen) {
        return;
      }

      if (!hasLoaded) {
        hasLoaded = true;
        populateMemo(textarea, screenName);
      } else {
        autoResize(textarea);
      }
    });

    container.appendChild(toggle);
    container.appendChild(body);

    try {
      cardContent.appendChild(container);
      cardContent.dataset.xmemo = CARD_TARGET_MARK;
    } catch {}
  }

  function scanHoverCards(rootNode) {
    if (!(rootNode instanceof Element)) {
      return;
    }

    injectHoverCardMemo(rootNode);

    const candidates = safeQueryAll(
      rootNode,
      '[data-testid="HoverCard"], div[role="dialog"], [data-testid="TypeaheadUser"], section, article'
    );

    for (const candidate of candidates) {
      injectHoverCardMemo(candidate);
    }
  }

  const scheduleProfileRender = debounce(renderProfileMemo, 80);
  const scheduleHoverScan = debounce(() => {
    const layers = safeQuery(document, "div#layers");
    if (layers) {
      scanHoverCards(layers);
    }
  }, 60);

  function handleLocationChange() {
    currentProfileScreenName = null;
    clearProfileMemo();
    syncThemeClass();
    scheduleProfileRender();
  }

  function patchHistoryMethod(methodName) {
    try {
      const original = history[methodName];
      if (original.__xMemoPatched) {
        return;
      }

      const patched = function patchedHistoryState(...args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event("locationchange"));
        return result;
      };

      patched.__xMemoPatched = true;
      history[methodName] = patched;
    } catch {}
  }

  function observeProfileArea() {
    if (!document.body || profileObserver) {
      return;
    }

    profileObserver = new MutationObserver(() => {
      syncThemeClass();
      scheduleProfileRender();
    });

    profileObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function startLayersObserver() {
    if (layersObserver) {
      return true;
    }

    const layers = safeQuery(document, "div#layers");
    if (!layers) {
      return false;
    }

    layersObserver = new MutationObserver((mutations) => {
      syncThemeClass();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          scanHoverCards(node);
        }

        if (mutation.target instanceof Element) {
          scanHoverCards(mutation.target);
        }
      }

      scheduleHoverScan();
    });

    layersObserver.observe(layers, { childList: true, subtree: true });

    scanHoverCards(layers);

    return true;
  }

  function observeLayers() {
    if (startLayersObserver()) {
      return;
    }

    if (layersWaitObserver) {
      return;
    }

    layersWaitObserver = new MutationObserver(() => {
      if (startLayersObserver()) {
        layersWaitObserver.disconnect();
        layersWaitObserver = null;
      }
    });

    layersWaitObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function observeThemeChanges() {
    if (themeObserver) {
      return;
    }

    themeObserver = new MutationObserver(() => {
      syncThemeClass();
    });

    try {
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "data-color-mode", "data-mode"]
      });
    } catch {}

    if (document.body) {
      try {
        themeObserver.observe(document.body, {
          attributes: true,
          attributeFilter: ["class", "data-theme", "data-color-mode", "data-mode"]
        });
      } catch {}
    }
  }

  function bootstrap() {
    syncThemeClass();
    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("locationchange"));
    });

    window.addEventListener("locationchange", handleLocationChange);

    observeThemeChanges();
    observeProfileArea();
    observeLayers();
    renderProfileMemo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
