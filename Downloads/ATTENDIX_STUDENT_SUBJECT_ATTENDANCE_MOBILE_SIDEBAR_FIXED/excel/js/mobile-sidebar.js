// ATTENDIX Mobile Sidebar Fix
// Handles the hamburger button, sidebar overlay, and mobile menu closing.
// Does not modify Firebase, RFID, attendance, timetable, or authentication logic.

(function () {
    function initMobileSidebar() {
        const toggle = document.getElementById("sidebarToggle");
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");

        if (!toggle || !sidebar) return;
        if (toggle.dataset.attendixSidebarBound === "true") return;

        toggle.dataset.attendixSidebarBound = "true";

        const openSidebar = () => {
            sidebar.classList.add("open", "active");
            if (overlay) overlay.classList.add("show", "active");
            toggle.setAttribute("aria-expanded", "true");
            document.body.classList.add("sidebar-open");
        };

        const closeSidebar = () => {
            sidebar.classList.remove("open", "active");
            if (overlay) overlay.classList.remove("show", "active");
            toggle.setAttribute("aria-expanded", "false");
            document.body.classList.remove("sidebar-open");
        };

        toggle.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen =
                sidebar.classList.contains("open") ||
                sidebar.classList.contains("active");

            isOpen ? closeSidebar() : openSidebar();
        });

        if (overlay) {
            overlay.addEventListener("click", closeSidebar);
        }

        sidebar.querySelectorAll("a, button").forEach((item) => {
            if (item === toggle) return;
            item.addEventListener("click", () => {
                if (window.innerWidth <= 900) closeSidebar();
            });
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) closeSidebar();
        });

        toggle.setAttribute("aria-expanded", "false");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMobileSidebar);
    } else {
        initMobileSidebar();
    }
})();
