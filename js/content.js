(function () {
  "use strict";

  const PROFILE_TARGET_MARK = "profile-target";
  const CARD_TARGET_MARK = "card-target";
  const PROFILE_MEMO_SELECTOR = ".x-memo-profile";
  const CARD_MEMO_SELECTOR = ".x-memo-card-host";

  let currentProfileScreenName = null;
  let currentViewerScreenName = null;
  let currentViewerResolvedAt = 0;
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
  const PROFILE_SUBPAGES = new Set([
    "",
    "with_replies",
    "highlights",
    "media",
    "likes",
    "followers",
    "following",
    "verified_followers",
    "articles"
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

  function getProfileRouteScreenName(pathname = window.location.pathname) {
    try {
      const match = pathname.match(/^\/([a-zA-Z0-9_]{1,15})(?:\/([^/?#]+))?(?:\/|$)/);
      if (!match) {
        return null;
      }

      const candidate = match[1];
      const subpage = (match[2] || "").toLowerCase();
      if (RESERVED_PATHS.has(candidate.toLowerCase()) || !PROFILE_SUBPAGES.has(subpage)) {
        return null;
      }

      return `@${candidate}`;
    } catch {
      return null;
    }
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

  function matchesSelector(element, selector) {
    try {
      return element?.matches?.(selector) || false;
    } catch {
      return false;
    }
  }

  function isInsideAppChrome(element) {
    return Boolean(
      safeClosest(element, "header") ||
        safeClosest(element, "nav") ||
        safeClosest(element, "aside") ||
        safeClosest(element, '[data-testid="SideNav_AccountSwitcher_Button"]') ||
        safeClosest(element, '[data-testid="AppTabBar_Profile_Link"]') ||
        safeClosest(element, '[aria-label*="Profile"]') ||
        safeClosest(element, '[aria-label*="profile"]') ||
        safeClosest(element, '[aria-label*="Account menu"]') ||
        safeClosest(element, '[aria-label*="account menu"]')
    );
  }

  function getViewerScreenName(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && currentViewerResolvedAt && now - currentViewerResolvedAt < 5000) {
      return currentViewerScreenName;
    }

    const candidateSelectors = [
      'a[data-testid="AppTabBar_Profile_Link"][href]',
      '[data-testid="SideNav_AccountSwitcher_Button"] a[href]',
      'nav a[href]',
      'header a[href]',
      'aside a[href]'
    ];

    for (const selector of candidateSelectors) {
      const links = safeQueryAll(document, selector);
      for (const link of links) {
        if (!(link instanceof HTMLAnchorElement) || !isInsideAppChrome(link)) {
          continue;
        }

        const handle = extractHandleFromHref(link.href);
        if (!handle) {
          continue;
        }

        const href = link.getAttribute("href") || "";
        const text = `${link.getAttribute("aria-label") || ""} ${link.textContent || ""}`.toLowerCase();
        const looksLikeProfileChromeLink =
          matchesSelector(link, '[data-testid="AppTabBar_Profile_Link"]') ||
          text.includes("profile") ||
          text.includes("account") ||
          /^\/[A-Za-z0-9_]{1,15}\/?$/.test(href);

        if (looksLikeProfileChromeLink) {
          currentViewerScreenName = handle;
          currentViewerResolvedAt = now;
          return currentViewerScreenName;
        }
      }
    }

    currentViewerScreenName = null;
    currentViewerResolvedAt = now;
    return null;
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

  function isElementVisible(element) {
    if (!(element instanceof Element) || !element.isConnected) {
      return false;
    }

    try {
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        style.opacity === "0"
      ) {
        return false;
      }
    } catch {
      return false;
    }

    try {
      return element.getClientRects().length > 0;
    } catch {
      return false;
    }
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
    textarea.rows = 1;
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
      return userDescription.parentElement || userDescription;
    }

    if (userName) {
      return userName.parentElement || userName;
    }

    const bioFallback =
      safeQuery(profileRoot, '[data-testid="UserDescription"]') ||
      safeQuery(profileRoot, '[data-testid="UserProfileHeader_Items"]') ||
      null;

    if (bioFallback) {
      return bioFallback.parentElement || bioFallback;
    }

    const profileLink = findProfileLink(profileRoot, screenName);
    if (!profileLink) {
      return profileRoot.firstElementChild || profileRoot;
    }

    return (
      safeClosest(profileLink, '[data-testid="UserProfileHeader_Items"]')?.parentElement ||
      safeClosest(profileLink, '[data-testid="UserDescription"]')?.parentElement ||
      safeClosest(profileLink, '[data-testid="UserName"]') ||
      safeClosest(profileLink, '[data-testid="UserName"]')?.parentElement ||
      safeClosest(profileLink, "header") ||
      safeClosest(profileLink, "section") ||
      profileLink.parentElement ||
      profileLink
    );
  }

  function moveProfileMemoToBestPosition(profileRoot, memoNode, insertionTarget) {
    if (!memoNode || !insertionTarget) {
      return false;
    }

    try {
      if (insertionTarget === profileRoot) {
        if (profileRoot.firstElementChild === memoNode) {
          return true;
        }
        return prependTo(profileRoot, memoNode);
      }

      if (memoNode.previousElementSibling === insertionTarget) {
        return true;
      }

      return insertAfter(insertionTarget, memoNode);
    } catch {
      return false;
    }
  }

  function renderProfileMemo() {
    syncThemeClass();

    const profileRoot = getProfileRoot();
    if (!profileRoot) {
      return;
    }

    const routeScreenName = getProfileRouteScreenName();
    if (!routeScreenName) {
      if (currentProfileScreenName) {
        currentProfileScreenName = null;
        clearProfileMemo();
      }
      return;
    }

    const userDescription = safeQuery(profileRoot, '[data-testid="UserDescription"]');
    const profileHeaderItems = safeQuery(profileRoot, '[data-testid="UserProfileHeader_Items"]');
    const userName = findProfileUserName(profileRoot, userDescription);
    const profileLink = findProfileLink(profileRoot, routeScreenName);

    if (!userDescription && !profileHeaderItems && !userName && !profileLink) {
      return;
    }

    const screenName = (userName ? getHandleFromUserName(userName) : null) || routeScreenName;
    if (!screenName) {
      return;
    }

    if (screenName === getViewerScreenName()) {
      if (currentProfileScreenName) {
        currentProfileScreenName = null;
        clearProfileMemo();
      }
      return;
    }

    if (currentProfileScreenName && currentProfileScreenName !== screenName) {
      clearProfileMemo();
    }

    const existingMemo = safeQuery(profileRoot, PROFILE_MEMO_SELECTOR);
    const insertionTarget = findProfileInsertionTarget(profileRoot, screenName, userName, userDescription);
    if (!insertionTarget) {
      return;
    }

    if (existingMemo && currentProfileScreenName === screenName) {
      moveProfileMemoToBestPosition(profileRoot, existingMemo, insertionTarget);
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

    const textarea = createMemoTextarea(screenName, "Profile memo");

    container.appendChild(textarea);

    const inserted = moveProfileMemoToBestPosition(profileRoot, container, insertionTarget);

    if (!inserted) {
      return;
    }

    insertionTarget.dataset.xmemo = PROFILE_TARGET_MARK;
    currentProfileScreenName = screenName;
    populateMemo(textarea, screenName, () => currentProfileScreenName !== screenName);
  }

  function getMemoThemeTokens() {
    if (isDarkTheme()) {
      return {
        bg: "rgba(39, 44, 48, 0.88)",
        text: "#e7e9ea",
        placeholder: "#6e767d",
        border: "#2f3336",
        label: "#71767b",
        focus: "#1d9bf0",
        panelBorder: "rgba(255, 255, 255, 0.08)",
        panelShadow: "none"
      };
    }

    return {
      bg: "rgba(255, 255, 255, 0.92)",
      text: "#0f1419",
      placeholder: "#a0aab4",
      border: "#eff3f4",
      label: "#536471",
      focus: "#1d9bf0",
      panelBorder: "rgba(15, 20, 25, 0.08)",
      panelShadow: "0 1px 2px rgba(15, 20, 25, 0.04)"
    };
  }

  function createHoverCardShadowStyles() {
    const theme = getMemoThemeTokens();
    return (
      ":host { all: initial; display: block; width: 100%; box-sizing: border-box; }\n" +
      ".x-memo-card { display: flex; flex-direction: column; align-items: stretch; width: 100%; margin-top: 8px; padding: 4px 0 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n" +
      ".x-memo-textarea { width: 100%; min-height: 36px; height: 36px; max-height: 36px; padding: 7px 10px; background: " +
      theme.bg +
      "; color: " +
      theme.text +
      "; border: 1px solid " +
      theme.border +
      "; border-radius: 4px; box-shadow: " +
      theme.panelShadow +
      "; box-sizing: border-box; font: inherit; font-size: 13px; line-height: 20px; resize: none; outline: none; overflow: hidden; }\n" +
      ".x-memo-textarea::placeholder { color: " +
      theme.placeholder +
      "; }\n" +
      ".x-memo-textarea:focus { border-color: " +
      theme.focus +
      "; }\n"
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

  function getExactHandleFromLinks(rootNode) {
    const links = safeQueryAll(rootNode, "a[href]");

    for (const link of links) {
      try {
        const url = new URL(link.href, window.location.origin);
        const handle = extractExactScreenNameFromPath(url.pathname);
        if (handle) {
          return handle;
        }
      } catch {}
    }

    return null;
  }

  function findHoverCardRoot(rootNode) {
    if (!(rootNode instanceof Element)) {
      return null;
    }

    return (
      (matchesSelector(rootNode, '[data-testid="HoverCard"]') ? rootNode : null) ||
      safeQuery(rootNode, '[data-testid="HoverCard"]') ||
      safeClosest(rootNode, '[data-testid="HoverCard"]') ||
      null
    );
  }

  function findHoverCardBody(cardContent) {
    const candidates = [
      safeQuery(cardContent, ":scope > div > div"),
      safeQuery(cardContent, ":scope > div"),
      safeQuery(cardContent, "div"),
      cardContent
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.nodeType === Node.ELEMENT_NODE) {
        return candidate;
      }
    }

    return null;
  }

  function findHoverCardInsertionTarget(cardContent) {
    const profileLinks = safeQueryAll(cardContent, "a[href]");
    for (const link of profileLinks) {
      const href = link.getAttribute("href") || "";
      if (!/^\/[A-Za-z0-9_]{1,15}$/.test(href)) {
        continue;
      }

      const isHiddenLink =
        link.getAttribute("aria-hidden") === "true" || link.getAttribute("tabindex") === "-1";
      const insideAvatar = Boolean(
        safeClosest(link, '[data-testid^="UserAvatar-Container"]') || safeClosest(link, ".r-1adg3ll")
      );

      if (isHiddenLink || insideAvatar) {
        continue;
      }

      const handleBlock =
        safeClosest(link, ".r-knv0ih") ||
        safeClosest(link, ".r-1wbh5a2") ||
        safeClosest(link, ".css-175oi2r") ||
        safeClosest(link, "div") ||
        link;
      return { mode: "after", target: handleBlock };
    }

    const bioNode =
      safeQuery(cardContent, '[data-testid="UserDescription"]') ||
      safeQuery(cardContent, ".cpft_text") ||
      null;

    if (bioNode) {
      return { mode: "before", target: bioNode };
    }

    const countLinks = safeQueryAll(
      cardContent,
      'a[href*="/following"], a[href*="/verified_followers"], a[href*="/followers"]'
    );

    if (countLinks.length > 0) {
      let lastCountBlock = countLinks[countLinks.length - 1];
      try {
        lastCountBlock = safeClosest(lastCountBlock, "div") || lastCountBlock;
      } catch {}
      return { mode: "after", target: lastCountBlock };
    }

    return { mode: "append", target: cardContent };
  }

  function clearLegacyHoverMemo(cardContent) {
    const legacyNodes = safeQueryAll(cardContent, ".x-memo-card");
    for (const node of legacyNodes) {
      try {
        if (!safeClosest(node, ".x-memo-card-host")) {
          node.remove();
        }
      } catch {}
    }

    const legacyHosts = safeQueryAll(cardContent, ".x-memo-card-host");
    for (const host of legacyHosts) {
      try {
        const hasButton = Boolean(host.shadowRoot?.querySelector("button"));
        if (hasButton) {
          host.remove();
        }
      } catch {}
    }
  }

  function injectHoverCardMemo(rootNode) {
    if (!(rootNode instanceof Element)) {
      return;
    }

    const hoverCardRoot = findHoverCardRoot(rootNode);
    if (!hoverCardRoot || !isElementVisible(hoverCardRoot)) {
      return;
    }

    const userName = safeQuery(hoverCardRoot, '[data-testid="UserName"]');
    const screenName = (userName ? getHandleFromUserName(userName) : null) || getExactHandleFromLinks(hoverCardRoot);
    if (!screenName) {
      return;
    }

    if (screenName === getViewerScreenName()) {
      return;
    }

    const cardContent =
      findHoverCardBody(hoverCardRoot) || findHoverCardContent(hoverCardRoot, userName || hoverCardRoot);
    if (!cardContent || !isElementVisible(cardContent)) {
      return;
    }

    clearLegacyHoverMemo(cardContent);

    if (safeQuery(cardContent, CARD_MEMO_SELECTOR)) {
      return;
    }

    if (cardContent.dataset.xmemo && !safeQuery(cardContent, CARD_MEMO_SELECTOR)) {
      try {
        cardContent.removeAttribute("data-xmemo");
      } catch {}
    }

    if (cardContent.dataset.xmemo) {
      return;
    }

    const host = document.createElement("div");
    host.className = "x-memo-card-host";
    host.style.display = "block";
    host.style.width = "100%";
    host.style.flex = "0 0 auto";
    host.style.boxSizing = "border-box";

    let shadowRoot = null;
    try {
      shadowRoot = host.attachShadow({ mode: "open" });
    } catch {
      return;
    }

    const style = document.createElement("style");
    style.textContent = createHoverCardShadowStyles();

    const container = document.createElement("div");
    container.className = "x-memo-card";

    const textarea = createMemoTextarea(screenName, "Hover card memo");
    textarea.placeholder = "Add a private note";
    populateMemo(textarea, screenName);

    container.appendChild(textarea);
    shadowRoot.appendChild(style);
    shadowRoot.appendChild(container);

    try {
      const insertion = findHoverCardInsertionTarget(cardContent);
      let inserted = false;

      if (insertion.mode === "after" && insertion.target) {
        inserted = insertAfter(insertion.target, host);
      } else if (insertion.mode === "before" && insertion.target?.parentNode) {
        insertion.target.parentNode.insertBefore(host, insertion.target);
        inserted = true;
      } else {
        cardContent.appendChild(host);
        inserted = true;
      }

      if (!inserted) {
        cardContent.appendChild(host);
      }

      cardContent.dataset.xmemo = CARD_TARGET_MARK;
    } catch {}
  }

  function scanHoverCards(rootNode) {
    if (!(rootNode instanceof Element)) {
      return;
    }

    const candidates = [];
    const rootHoverCard = findHoverCardRoot(rootNode);
    if (rootHoverCard) {
      candidates.push(rootHoverCard);
    }

    for (const candidate of safeQueryAll(rootNode, '[data-testid="HoverCard"]')) {
      if (!candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }

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
    currentViewerResolvedAt = 0;
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
