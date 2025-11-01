(function () {
    if (!window.__SOLARA_IS_MOBILE) {
        return;
    }

    const bridge = window.SolaraMobileBridge || {};
    bridge.handlers = bridge.handlers || {};
    bridge.queue = Array.isArray(bridge.queue) ? bridge.queue : [];
    window.SolaraMobileBridge = bridge;

    const dom = window.SolaraDom || {};
    let initialized = false;

    function updateMobileToolbarTitleImpl() {
        if (!dom.mobileToolbarTitle) {
            return;
        }
        dom.mobileToolbarTitle.textContent = "Solara";
    }

    function updateMobileOverlayScrim() {
        if (!dom.mobileOverlayScrim || !document.body) {
            return;
        }
        const hasOverlay = document.body.classList.contains("mobile-search-open") ||
            document.body.classList.contains("mobile-panel-open");
        dom.mobileOverlayScrim.setAttribute("aria-hidden", hasOverlay ? "false" : "true");
    }

    function openMobileSearchImpl() {
        if (!document.body) {
            return;
        }
        document.body.classList.add("mobile-search-open");
        document.body.classList.remove("mobile-panel-open");
        if (dom.searchArea) {
            dom.searchArea.setAttribute("aria-hidden", "false");
        }
        updateMobileOverlayScrim();
        if (dom.searchInput) {
            window.requestAnimationFrame(() => {
                try {
                    dom.searchInput.focus({ preventScroll: true });
                } catch (error) {
                    dom.searchInput.focus();
                }
            });
        }
    }

    function closeMobileSearchImpl() {
        if (!document.body) {
            return;
        }
        document.body.classList.remove("mobile-search-open");
        const toggleSearchMode = window.toggleSearchMode;
        if (typeof toggleSearchMode === "function") {
            toggleSearchMode(false);
        } else if (typeof window.hideSearchResults === "function") {
            window.hideSearchResults();
        }
        if (dom.searchArea) {
            dom.searchArea.setAttribute("aria-hidden", "true");
        }
        if (dom.searchInput) {
            dom.searchInput.blur();
        }
        updateMobileOverlayScrim();
    }

    function toggleMobileSearchImpl() {
        if (!document.body) {
            return;
        }
        if (document.body.classList.contains("mobile-search-open")) {
            closeMobileSearchImpl();
        } else {
            openMobileSearchImpl();
        }
    }

    function normalizePanelView(view) {
        return view === "lyrics" ? "playlist" : (view || "playlist");
    }

    function openMobilePanelImpl(view = "playlist") {
        if (!document.body) {
            return;
        }
        const targetView = normalizePanelView(view);
        if (typeof window.switchMobileView === "function") {
            window.switchMobileView(targetView);
        }
        closeMobileSearchImpl();
        document.body.classList.add("mobile-panel-open");
        document.body.setAttribute("data-mobile-panel-view", targetView);
        updateMobileOverlayScrim();
    }

    function closeMobilePanelImpl() {
        if (!document.body) {
            return;
        }
        document.body.classList.remove("mobile-panel-open");
        updateMobileOverlayScrim();
    }

    function toggleMobilePanelImpl(view = "playlist") {
        if (!document.body) {
            return;
        }
        const isOpen = document.body.classList.contains("mobile-panel-open");
        const currentView = document.body.getAttribute("data-mobile-panel-view") || "playlist";
        const targetView = normalizePanelView(view);
        if (isOpen && (!targetView || currentView === targetView)) {
            closeMobilePanelImpl();
        } else {
            openMobilePanelImpl(targetView || currentView || "playlist");
        }
    }

    function closeAllMobileOverlaysImpl() {
        closeMobileSearchImpl();
        closeMobilePanelImpl();
    }
// ========== 移动端认证弹窗增强 ==========

function showMobileAuthDialog() {
    // 移除已存在的弹窗，防止多次堆叠
    let overlay = document.getElementById('mobile-auth-overlay');
    if (overlay) overlay.remove();

    // 创建全屏弹窗
    overlay = document.createElement('div');
    overlay.id = 'mobile-auth-overlay';
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;
        background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;
        z-index:99999;touch-action:none;
    `;
    overlay.innerHTML = `
        <div style="width:94vw;max-width:420px;background:#fff;color:#222;border-radius:13px;padding:23px 12px;box-shadow:0 8px 42px rgba(0,0,0,.45);display:flex;flex-direction:column;">
          <h3 style="margin-bottom:16px;">请输入访问口令</h3>
          <input id="mobileAuthPwd" style="font-size:18px;padding:12px 10px;width:100%;border-radius:6px;border:1px solid #ccc;margin-bottom:10px;" type="password" placeholder="口令" autocomplete="one-time-code" />
          <div id="mobileAuthErr" style="color:#e53935;display:none;margin-bottom:6px;">口令错误，请重试</div>
          <button id="mobileAuthBtn" style="padding:13px 0;border-radius:8px;background:#1677ff;color:#fff;font-size:18px;border:none;width:100%;">登录</button>
        </div>
    `;
    document.body.appendChild(overlay);
    // 禁止页面滚动
    document.body.style.overflow = 'hidden';

    // 焦点聚焦到输入框
    setTimeout(() => {
        const pwdInput = document.getElementById('mobileAuthPwd');
        if (pwdInput) pwdInput.focus();
    }, 32);

    // 防止弹窗点击穿透
    overlay.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    // 提交事件
    async function handleSubmit() {
        let password = document.getElementById('mobileAuthPwd').value;
        let errTip = document.getElementById('mobileAuthErr');
        errTip.style.display = 'none';
        try {
            let res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ password }).toString()
            });
            let data = await res.json();
            if (res.ok && data.ok) {
                overlay.remove();
                document.body.style.overflow = '';
                if (typeof initSolaraApp === 'function') initSolaraApp();
            } else {
                errTip.style.display = 'block';
            }
        } catch {
            errTip.textContent = '网络错误，请重试';
            errTip.style.display = 'block';
        }
    }

    document.getElementById('mobileAuthBtn').onclick = handleSubmit;
    document.getElementById('mobileAuthPwd').onkeydown = e => { if (e.key === 'Enter') handleSubmit(); };
}

// 检查认证状态，如果未认证就弹窗
function getCookie(name) {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : null;
}
if (getCookie('solara_auth') !== 'yes') {
    showMobileAuthDialog();
}

    function initializeMobileUIImpl() {
        if (initialized || !document.body) {
            return;
        }
        initialized = true;

        document.body.classList.add("mobile-view");
        const initialView = "playlist";
        document.body.setAttribute("data-mobile-panel-view", initialView);
        if (dom.mobilePanelTitle) {
            dom.mobilePanelTitle.textContent = "播放列表";
        }
        if (dom.lyrics) {
            dom.lyrics.classList.remove("active");
        }
        if (dom.playlist) {
            dom.playlist.classList.add("active");
        }

        updateMobileToolbarTitleImpl();

        if (dom.mobileSearchToggle) {
            dom.mobileSearchToggle.addEventListener("click", toggleMobileSearchImpl);
        }
        if (dom.mobileSearchClose) {
            dom.mobileSearchClose.addEventListener("click", closeMobileSearchImpl);
        }
        if (dom.mobilePanelClose) {
            dom.mobilePanelClose.addEventListener("click", closeMobilePanelImpl);
        }
        if (dom.mobileQueueToggle) {
            dom.mobileQueueToggle.addEventListener("click", () => openMobilePanelImpl("playlist"));
        }
        const handleGlobalPointerDown = (event) => {
            if (!document.body) {
                return;
            }
            const hasOverlay = document.body.classList.contains("mobile-search-open") ||
                document.body.classList.contains("mobile-panel-open");
            if (!hasOverlay) {
                return;
            }

            const target = event.target;
            if (dom.mobilePanel && (dom.mobilePanel === target || dom.mobilePanel.contains(target))) {
                return;
            }
            if (dom.searchArea && (dom.searchArea === target || dom.searchArea.contains(target))) {
                return;
            }
            if (dom.playerQualityMenu && dom.playerQualityMenu.contains(target)) {
                return;
            }
            if (target && typeof target.closest === "function" && target.closest(".quality-menu")) {
                return;
            }

            closeAllMobileOverlaysImpl();
        };

        document.addEventListener("pointerdown", handleGlobalPointerDown, true);
        if (dom.searchArea) {
            dom.searchArea.setAttribute("aria-hidden", "true");
        }
        if (dom.mobileOverlayScrim) {
            dom.mobileOverlayScrim.setAttribute("aria-hidden", "true");
        }

        updateMobileOverlayScrim();
    }

    bridge.handlers.updateToolbarTitle = updateMobileToolbarTitleImpl;
    bridge.handlers.openSearch = openMobileSearchImpl;
    bridge.handlers.closeSearch = closeMobileSearchImpl;
    bridge.handlers.toggleSearch = toggleMobileSearchImpl;
    bridge.handlers.openPanel = openMobilePanelImpl;
    bridge.handlers.closePanel = closeMobilePanelImpl;
    bridge.handlers.togglePanel = toggleMobilePanelImpl;
    bridge.handlers.closeAllOverlays = closeAllMobileOverlaysImpl;
    bridge.handlers.initialize = initializeMobileUIImpl;

    if (bridge.queue.length) {
        const pending = bridge.queue.splice(0, bridge.queue.length);
        for (const entry of pending) {
            const handler = bridge.handlers[entry.name];
            if (typeof handler === "function") {
                handler(...(entry.args || []));
            }
        }
    }
})();
