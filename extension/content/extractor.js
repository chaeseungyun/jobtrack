export function extractJobHtml(siteConfig) {
  const BASE_REMOVE_SELECTORS = ["script", "style", "noscript", "iframe", "svg"];
  const GENERIC_CONTENT_SELECTORS = ["main", "article", "#content", "body"];

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function queryAllSafe(root, selectors) {
    const elements = [];
    const seen = new Set();

    for (const selector of selectors) {
      try {
        for (const element of root.querySelectorAll(selector)) {
          if (!seen.has(element)) {
            seen.add(element);
            elements.push(element);
          }
        }
      } catch {
        // Ignore invalid selectors so one site config typo does not break extraction.
      }
    }

    return elements;
  }

  function queryFirstMatchingSet(root, selectors) {
    for (const selector of selectors) {
      try {
        const elements = Array.from(root.querySelectorAll(selector));

        if (elements.length > 0) {
          return elements;
        }
      } catch {
        // Ignore invalid selectors so later fallback selectors can still run.
      }
    }

    return [];
  }

  function findContainers(selectors) {
    const containers = queryFirstMatchingSet(document, selectors);

    if (containers.length > 0) {
      return containers;
    }

    return queryFirstMatchingSet(document, GENERIC_CONTENT_SELECTORS);
  }

  function getVisibleRatio(element) {
    const rect = element.getBoundingClientRect();

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    if (rect.height <= 0 || rect.width <= 0 || viewportHeight <= 0) {
      return 0;
    }

    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    return visibleHeight / viewportHeight;
  }

  function selectBestContainer(containers) {
    if (containers.length <= 1) {
      return containers[0] || document.body;
    }

    return containers
      .map((element, index) => ({
        element,
        index,
        ratio: getVisibleRatio(element),
      }))
      .sort((a, b) => {
        if (b.ratio !== a.ratio) {
          return b.ratio - a.ratio;
        }

        return a.index - b.index;
      })[0].element;
  }

  function removeNoise(root, selectors) {
    for (const element of queryAllSafe(root, selectors)) {
      element.remove();
    }
  }

  function stripAttributes(root) {
    const elements = [root, ...root.querySelectorAll("*")];

    for (const element of elements) {
      const attributes = Array.from(element.attributes);

      for (const attribute of attributes) {
        if (
          attribute.name === "style" ||
          attribute.name === "class" ||
          attribute.name === "id" ||
          attribute.name.startsWith("data-")
        ) {
          element.removeAttribute(attribute.name);
        }
      }
    }
  }

  function getTitle(element) {
    const heading = element.querySelector("h1, h2, h3");
    const headingText = normalizeText(heading?.textContent);

    if (headingText) {
      return headingText.slice(0, 30);
    }

    return normalizeText(document.title).slice(0, 30);
  }

  function sanitizeContainer(element, removeSelectors) {
    const clone = element.cloneNode(true);
    removeNoise(clone, removeSelectors);
    stripAttributes(clone);

    return {
      html: clone.outerHTML,
      title: getTitle(element),
    };
  }

  const contentSelectors = Array.isArray(siteConfig?.content)
    ? siteConfig.content
    : GENERIC_CONTENT_SELECTORS;
  const removeSelectors = [
    ...BASE_REMOVE_SELECTORS,
    ...(Array.isArray(siteConfig?.remove) ? siteConfig.remove : []),
  ];
  const containers = findContainers(contentSelectors);
  const selectedContainer = selectBestContainer(containers);
  const selected = sanitizeContainer(selectedContainer, removeSelectors);
  const alternatives = containers
    .filter((container) => container !== selectedContainer)
    .map((container) => sanitizeContainer(container, removeSelectors));

  return {
    html: selected.html,
    title: selected.title,
    alternatives,
  };
}
