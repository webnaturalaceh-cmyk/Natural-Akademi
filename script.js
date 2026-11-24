"use strict";

// Attempt autoplay with sound; use a muted fallback when browser policy blocks it.
(() => {
  const video = document.querySelector(".hero-video");
  if (!video) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let playbackAttempt = 0;

  function syncPlayback() {
    const attempt = ++playbackAttempt;
    if (reducedMotion.matches || document.hidden) {
      video.pause();
      return;
    }

    video.muted = false;
    video.play().then(() => {
      if (attempt !== playbackAttempt) return;
      document.removeEventListener("click", enableAudio);
      document.removeEventListener("keydown", enableAudio);
    }).catch((error) => {
      if (attempt !== playbackAttempt || error.name !== "NotAllowedError") return;
      video.muted = true;
      video.play().catch(() => {
        // Keep the static Hero background if playback is unavailable.
      });
    });
  }

  function enableAudio(event) {
    if (!event.isTrusted) return;
    if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "Escape"].includes(event.key)) return;
    syncPlayback();
  }

  document.addEventListener("click", enableAudio);
  document.addEventListener("keydown", enableAudio);
  reducedMotion.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);
  syncPlayback();
})();

(() => {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  const menuLabel = document.querySelector(".menu-label");
  if (!toggle || !navigation || !menuLabel) return;

  const mobileLayout = window.matchMedia("(max-width: 1023px)");

  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Tutup menu navigasi" : "Buka menu navigasi";
    navigation.hidden = mobileLayout.matches && !open;
  }

  function syncLayout() {
    const focusWasInNavigation = navigation.contains(document.activeElement);
    const focusWasOnToggle = document.activeElement === toggle;
    toggle.hidden = !mobileLayout.matches;
    setMenu(false);
    if (mobileLayout.matches && focusWasInNavigation) toggle.focus();
    if (!mobileLayout.matches && focusWasOnToggle) navigation.querySelector("a").focus();
  }

  toggle.addEventListener("click", () => {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (mobileLayout.matches && link) {
      setMenu(false);
      if (link.hash && (!link.pathname || link.pathname === window.location.pathname)) {
        const target = document.getElementById(link.hash.slice(1));
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        } else {
          toggle.focus();
        }
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (mobileLayout.matches && !navigation.contains(event.target) && !toggle.contains(event.target)) {
      if (toggle.getAttribute("aria-expanded") === "true") {
        const focusWasInNavigation = navigation.contains(document.activeElement);
        setMenu(false);
        if (focusWasInNavigation) toggle.focus();
      }
    }
  });

  mobileLayout.addEventListener("change", syncLayout);
  syncLayout();
})();

// Dropdown menu interaction for "Tentang Kami" (Visi dan Misi, Tujuan Utama, Struktur Pengelola)
(() => {
  const dropdowns = document.querySelectorAll(".nav-dropdown");
  if (!dropdowns.length) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const menu = dropdown.querySelector(".dropdown-menu");
    if (!trigger || !menu) return;

    let hoverTimeout;

    function openDropdown() {
      clearTimeout(hoverTimeout);
      trigger.setAttribute("aria-expanded", "true");
      dropdown.classList.add("is-open");
    }

    function closeDropdown() {
      clearTimeout(hoverTimeout);
      trigger.setAttribute("aria-expanded", "false");
      dropdown.classList.remove("is-open");
    }

    function toggleDropdown() {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleDropdown();
    });

    // Close dropdown when an item inside is clicked (e.g. on-page anchor link)
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeDropdown();
      }
    });

    dropdown.addEventListener("pointerenter", () => {
      if (canHover.matches) {
        openDropdown();
      }
    });

    dropdown.addEventListener("pointerleave", () => {
      if (canHover.matches) {
        hoverTimeout = setTimeout(closeDropdown, 200);
      }
    });

    dropdown.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (trigger.getAttribute("aria-expanded") === "true") {
          event.stopPropagation();
          closeDropdown();
          trigger.focus();
        }
      }
    });
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(event.target)) {
        const trigger = dropdown.querySelector(".dropdown-trigger");
        trigger?.setAttribute("aria-expanded", "false");
        dropdown.classList.remove("is-open");
      }
    });
  });
})();

// Accessible tabs: automatic activation with roving keyboard focus.
(() => {
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    if (!tabs.length || panels.some((panel) => !panel || !group.contains(panel))) return;

    function activateTab(index, moveFocus = false) {
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[tabIndex].hidden = !selected;
      });
      if (moveFocus) tabs[index].focus();
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(index));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        switch (event.key) {
          case "ArrowRight": nextIndex = (index + 1) % tabs.length; break;
          case "ArrowLeft": nextIndex = (index - 1 + tabs.length) % tabs.length; break;
          case "Home": nextIndex = 0; break;
          case "End": nextIndex = tabs.length - 1; break;
          case "Enter":
          case " ": nextIndex = index; break;
          default: return;
        }
        event.preventDefault();
        activateTab(nextIndex, true);
      });
    });

    function syncTabWithHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const targetIndex = tabs.findIndex(
        (tab, idx) => tab.id === hash || panels[idx]?.id === hash
      );
      if (targetIndex >= 0) {
        activateTab(targetIndex);
      }
    }

    window.addEventListener("hashchange", syncTabWithHash);
    const initialIndex = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    activateTab(initialIndex < 0 ? 0 : initialIndex);
    syncTabWithHash();
  });
})();

// Keep anchor offsets aligned with the rendered sticky header, including text zoom.
(() => {
  const header = document.querySelector(".site-header");
  if (header && "ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--scroll-header-height", `${header.getBoundingClientRect().height}px`);
    });
    observer.observe(header);
  }

  const links = document.querySelectorAll('.navigation a[href^="#"]');
  function updateCurrentLink() {
    const hash = window.location.hash || "#beranda";
    links.forEach((link) => {
      if (link.hash === hash) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", updateCurrentLink);
  updateCurrentLink();

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();


// Galeri Photo Filter & Lightbox Modal
(() => {
  const modal = document.getElementById("photo-lightbox");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const photoItems = Array.from(document.querySelectorAll(".photo-item"));

  // 1. Category Filtering
  if (filterButtons.length && photoItems.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter") || "all";

        filterButtons.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");

        photoItems.forEach((item) => {
          const cat = item.getAttribute("data-category");
          if (filter === "all" || cat === filter) {
            item.removeAttribute("hidden");
          } else {
            item.setAttribute("hidden", "");
          }
        });
      });
    });
  }

  // 2. Lightbox Modal
  if (!modal) return;

  const img = document.getElementById("lightbox-img");
  const caption = document.getElementById("lightbox-caption");
  const closeBtn = modal.querySelector(".lightbox-close");
  const backdrop = modal.querySelector(".lightbox-backdrop");
  const prevBtn = modal.querySelector(".lightbox-prev");
  const nextBtn = modal.querySelector(".lightbox-next");

  function getVisibleCards() {
    return Array.from(document.querySelectorAll(".photo-item:not([hidden]) .photo-card"));
  }

  let currentIndex = 0;
  let lastActiveElement = null;

  function showIndex(index) {
    const visibleCards = getVisibleCards();
    if (!visibleCards.length) return;
    currentIndex = (index + visibleCards.length) % visibleCards.length;
    const card = visibleCards[currentIndex];
    const fullSrc = card.getAttribute("data-full") || card.querySelector("img")?.src;
    const fullCaption = card.getAttribute("data-caption") || card.querySelector("img")?.alt || "";

    if (img) {
      img.src = fullSrc;
      img.alt = fullCaption;
    }
    if (caption) {
      caption.textContent = fullCaption;
    }
  }

  function openLightbox(card) {
    const visibleCards = getVisibleCards();
    const index = visibleCards.indexOf(card);
    if (index === -1) return;
    lastActiveElement = document.activeElement;
    showIndex(index);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    closeBtn?.focus();
  }

  function closeLightbox() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (img) img.src = "";
    if (lastActiveElement && typeof lastActiveElement.focus === "function") {
      lastActiveElement.focus();
    }
  }

  document.querySelectorAll(".photo-card").forEach((card) => {
    card.addEventListener("click", () => openLightbox(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(card);
      }
    });
  });

  closeBtn?.addEventListener("click", closeLightbox);
  backdrop?.addEventListener("click", closeLightbox);

  prevBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showIndex(currentIndex - 1);
  });
  nextBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    showIndex(currentIndex + 1);
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      showIndex(currentIndex - 1);
    } else if (event.key === "ArrowRight") {
      showIndex(currentIndex + 1);
    }
  });
})();
