(() => {
  "use strict";

  const SELECTORS = {
    layers: "div#layers",
    primaryColumn: '[data-testid="primaryColumn"]',
    userDescription: '[data-testid="UserDescription"]',
    userName: '[data-testid="UserName"]'
  };

  const NAVIGATION_EVENT = "x-memo:navigation";
  const USERNAME_PATH_PATTERN = /^\/([A-Za-z0-9_]{1,15})$/;
  const RESERVED_PATHS = new Set([
    "account",
    "compose",
    "download",
    "explore",
    "followers",
    "following",
    "hashtag",
    "home",
    "i",
    "intent",
    "jobs",
    "login",
    "messages",
    "notifications",
    "privacy",
    "search",
    "settings",
    "share",
    "signup",
    "tos",
    "x"
  ]);

  const STRINGS = {
    hoverBadge: getMessage("hoverBadge", "Memo"),
    memoHelper: getMessage("memoHelper", "Private note synced with Chrome"),
    memoLabel: getMessage("memoLabel", "Memo"),
    memoPlaceholder: getMessage("memoPlaceholder", "Add a private note for yourself"),
    memoToggleCollapse: getMessage("memoToggleCollapse", "Hide memo"),
    memoToggleExpand: getMessage("memoToggleExpand", "Open memo")
  };

  let bodyObserver;
  let hoverObserver;
  let themeObserver;
  let observedLayers = null;
  let profileFrame = 0;
  let hoverFrame = 0;

  function getMessage(key, fallback) {
    try {
      return chrome.i18n.getMessage(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function init() {
    patchHistoryMethods();
    observeBody();
    observeTheme();
    window.addEventListener(NAVIGATION_EVENT, handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    scheduleProfileSync();
    observeHoverLayers();
    scheduleHoverSync();
  }

  function handleNavigation() {
    scheduleProfileSync();
    scheduleHoverSync();
  }

  function patchHistoryMethods() {
    if (window.__xMemoHistoryPatched) {
      return;
    }

    // X navigates client-side, so we mirror history changes into one custom signal.
    const wrapHistoryMethod = (methodName) => {
      const original = window.history[methodName];

      window.history[methodName] = function patchedHistoryMethod(...args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event(NAVIGATION_EVENT));
        return result;
      };
    };

    wrapHistoryMethod("pushState");
    wrapHistoryMethod("replaceState");
    window.__xMemoHistoryPatched = true;
  }

  function observeBody() {
    if (bodyObserver || !document.body) {
      return;
    }

    bodyObserver = new MutationObserver(() => {
      observeHoverLayers();
      scheduleProfileSync();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function observeTheme() {
    if (themeObserver) {
      return;
    }

    themeObserver = new MutationObserver(refreshThemes);

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-color-mode", "data-theme"]
    });

    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-color-mode", "data-theme"]
      });
    }
  }

  function observeHoverLayers() {
    const layers = document.querySelector(SELECTORS.layers);

    if (!layers) {
      observedLayers = null;
      if (hoverObserver) {
        hoverObserver.disconnect();
        hoverObserver = null;
      }
      return;
    }

    if (layers === observedLayers) {
      return;
    }

    observedLayers = layers;
    if (hoverObserver) {
      hoverObserver.disconnect();
    }

    hoverObserver = new MutationObserver(() => {
      scheduleHoverSync();
    });

    hoverObserver.observe(layers, {
      childList: true,
      subtree: true
    });

    scheduleHoverSync();
  }

  function scheduleProfileSync() {
    if (profileFrame) {
      return;
    }

    profileFrame = window.requestAnimationFrame(() => {
      profileFrame = 0;
      void syncProfileMemo();
      refreshThemes();
    });
  }

  function scheduleHoverSync() {
    if (hoverFrame) {
      return;
    }

    hoverFrame = window.requestAnimationFrame(() => {
      hoverFrame = 0;
      void syncHoverMemos();
      refreshThemes();
    });
  }

  async function syncProfileMemo() {
    try {
      const primaryColumn = document.querySelector(SELECTORS.primaryColumn);
      const screenName = getProfileScreenName();
      const existingWidgets = document.querySelectorAll(".x-memo-profile");

      if (!primaryColumn || !screenName) {
        removeNodes(existingWidgets);
        return;
      }

      const description = primaryColumn.querySelector(SELECTORS.userDescription);
      const userName = primaryColumn.querySelector(SELECTORS.userName);
      const host = description || userName;

      if (!host) {
        removeNodes(existingWidgets);
        return;
      }

      existingWidgets.forEach((widget) => {
        if (!primaryColumn.contains(widget)) {
          widget.remove();
        }
      });

      let widget = primaryColumn.querySelector(".x-memo-profile");
      if (!widget) {
        widget = createMemoShell("profile");
      }

      if (host.nextElementSibling !== widget) {
        host.insertAdjacentElement("afterend", widget);
      }

      await hydrateMemoShell(widget, screenName);
    } catch (error) {
      return;
    }
  }

  async function syncHoverMemos() {
    try {
      const layers = observedLayers || document.querySelector(SELECTORS.layers);

      if (!layers) {
        return;
      }

      const roots = collectHoverRoots(layers);
      const liveRoots = new Set(roots);

      layers.querySelectorAll(".x-memo-hover").forEach((widget) => {
        if (!liveRoots.has(widget.parentElement)) {
          widget.remove();
        }
      });

      for (const root of roots) {
        const screenName = extractScreenNameFromScope(root);

        if (!screenName) {
          continue;
        }

        let widget = Array.from(root.children).find((child) => child.classList?.contains("x-memo-hover"));
        if (!widget) {
          widget = createMemoShell("hover");
          root.appendChild(widget);
        }

        await hydrateMemoShell(widget, screenName);
      }
    } catch (error) {
      return;
    }
  }

  function collectHoverRoots(layers) {
    const roots = new Set();

    layers.querySelectorAll(SELECTORS.userName).forEach((node) => {
      const root = resolveHoverRoot(node, layers);
      if (!root) {
        return;
      }

      if (root.querySelectorAll(SELECTORS.userName).length > 2) {
        return;
      }

      roots.add(root);
    });

    return Array.from(roots);
  }

  function resolveHoverRoot(node, layers) {
    if (!(node instanceof Element)) {
      return null;
    }

    // Prefer the dialog wrapper when present, then fall back to the top portal child.
    const dialog = node.closest('[role="dialog"]');
    if (dialog && layers.contains(dialog)) {
      return dialog;
    }

    let current = node;
    while (current.parentElement && current.parentElement !== layers) {
      current = current.parentElement;
    }

    return current.parentElement === layers ? current : null;
  }

  function createMemoShell(kind) {
    const shell = document.createElement("section");
    shell.className = `x-memo-shell x-memo-${kind}`;
    shell.dataset.hasContent = "false";
    shell.dataset.xMemoTheme = getTheme();

    const header = document.createElement("div");
    header.className = "x-memo-header";

    const label = document.createElement("span");
    label.className = "x-memo-label";
    label.textContent = STRINGS.memoLabel;

    const meta = document.createElement("span");
    meta.className = "x-memo-meta";

    header.append(label, meta);

    const textarea = document.createElement("textarea");
    textarea.className = "x-memo-textarea";
    textarea.rows = 3;
    textarea.placeholder = STRINGS.memoPlaceholder;
    textarea.setAttribute("aria-label", STRINGS.memoLabel);

    bindAutosave(shell, textarea);

    if (kind === "profile") {
      const helper = document.createElement("p");
      helper.className = "x-memo-helper";
      helper.textContent = STRINGS.memoHelper;
      shell.append(header, textarea, helper);
      return shell;
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "x-memo-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", STRINGS.memoToggleExpand);

    const dot = document.createElement("span");
    dot.className = "x-memo-dot";
    dot.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = STRINGS.hoverBadge;

    toggle.append(dot, text);

    const panel = document.createElement("div");
    panel.className = "x-memo-panel";
    panel.hidden = true;
    panel.append(header, textarea);

    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = String(!expanded);

      toggle.setAttribute("aria-expanded", nextExpanded);
      toggle.setAttribute(
        "aria-label",
        expanded ? STRINGS.memoToggleExpand : STRINGS.memoToggleCollapse
      );
      panel.hidden = expanded;

      if (!expanded) {
        textarea.focus({ preventScroll: true });
      }
    });

    shell.append(toggle, panel);
    return shell;
  }

  function bindAutosave(shell, textarea) {
    if (shell.dataset.bound === "true") {
      return;
    }

    // Keep saves cheap while the user types and always persist by screen name.
    const saveMemo = debounce((screenName, memo) => {
      if (!screenName) {
        return;
      }

      void writeMemo(screenName, memo);
    }, 300);

    textarea.addEventListener("input", () => {
      const screenName = shell.dataset.screenName || "";
      updateMemoState(shell, textarea.value);
      saveMemo(screenName, textarea.value);
    });

    shell.dataset.bound = "true";
  }

  async function hydrateMemoShell(shell, screenName) {
    const textarea = shell.querySelector(".x-memo-textarea");
    const meta = shell.querySelector(".x-memo-meta");

    if (!(textarea instanceof HTMLTextAreaElement) || !(meta instanceof HTMLElement)) {
      return;
    }

    shell.dataset.screenName = screenName;
    shell.dataset.xMemoTheme = getTheme();
    meta.textContent = screenName;

    if (shell.dataset.loadedFor === screenName) {
      updateMemoState(shell, textarea.value);
      return;
    }

    shell.dataset.loadedFor = screenName;
    const requestId = String(Date.now()) + Math.random().toString(16).slice(2);
    shell.dataset.requestId = requestId;
    textarea.value = "";

    const entry = await readMemo(screenName);
    if (shell.dataset.requestId !== requestId || shell.dataset.screenName !== screenName) {
      return;
    }

    textarea.value = entry?.memo || "";
    updateMemoState(shell, textarea.value);
  }

  function updateMemoState(shell, memo) {
    shell.dataset.hasContent = String(memo.trim().length > 0);
  }

  function getProfileScreenName() {
    return parseScreenName(window.location.pathname);
  }

  function extractScreenNameFromScope(scope) {
    const userNameSection = scope.querySelector(SELECTORS.userName);
    const sections = userNameSection ? [userNameSection, scope] : [scope];

    for (const section of sections) {
      const links = section.querySelectorAll("a[href]");
      for (const link of links) {
        const screenName = parseScreenNameFromHref(link.getAttribute("href"));
        if (screenName) {
          return screenName;
        }
      }
    }

    return null;
  }

  function parseScreenNameFromHref(href) {
    if (!href) {
      return null;
    }

    try {
      const url = new URL(href, window.location.origin);
      return parseScreenName(url.pathname);
    } catch (error) {
      return null;
    }
  }

  function parseScreenName(pathname) {
    const cleanPath = pathname.replace(/\/+$/, "") || "/";
    const match = cleanPath.match(USERNAME_PATH_PATTERN);

    if (!match) {
      return null;
    }

    const rawName = match[1];
    if (RESERVED_PATHS.has(rawName.toLowerCase())) {
      return null;
    }

    return `@${rawName}`;
  }

  function getTheme() {
    try {
      const tokens = [
        document.documentElement.dataset.theme,
        document.documentElement.dataset.colorMode,
        document.documentElement.getAttribute("data-theme"),
        document.documentElement.getAttribute("data-color-mode"),
        document.documentElement.className,
        document.body?.dataset.theme,
        document.body?.dataset.colorMode,
        document.body?.className
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (tokens.includes("dark") || tokens.includes("dim") || tokens.includes("lightsout")) {
        return "dark";
      }
    } catch (error) {
      return "light";
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function refreshThemes() {
    const theme = getTheme();
    document.querySelectorAll(".x-memo-shell").forEach((node) => {
      node.dataset.xMemoTheme = theme;
    });
  }

  async function readMemo(screenName) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(screenName, (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }

          const entry = result?.[screenName];
          if (!entry || typeof entry.memo !== "string") {
            resolve(null);
            return;
          }

          resolve(entry);
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  async function writeMemo(screenName, memo) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set(
          {
            [screenName]: {
              memo,
              updatedAt: Date.now()
            }
          },
          () => {
            resolve(!chrome.runtime.lastError);
          }
        );
      } catch (error) {
        resolve(false);
      }
    });
  }

  function debounce(callback, wait) {
    let timerId = 0;

    return (...args) => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        callback(...args);
      }, wait);
    };
  }

  function removeNodes(nodes) {
    nodes.forEach((node) => {
      node.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
