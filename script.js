console.log("Script loaded.");

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP UI ---
    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateDate();

    // Check if we have fresh data
    if (window.latestDigest) {
        console.log("Loading Digest form", window.latestDigest.date);
        renderDigest();
    } else {
        console.warn("No data.js found or loaded.");
    }

    // --- 2. COPY FUNCTION ---
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            let textToCopy = "";
            if (window.latestDigest && window.latestDigest.items) {
                textToCopy = `🧠 ${window.latestDigest.title}\n\n` +
                    window.latestDigest.items.map(i => `${i.text} (${i.link})`).join("\n");
            } else if (window.latestDigest && window.latestDigest.content) {
                textToCopy = window.latestDigest.content;
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = `Copied! <i data-lucide="check"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }, 2000);
            });
        });
    }
});

function updateDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function renderDigest() {
    if (!window.latestDigest) return;

    // Update Title & Date logic
    const dateDisplay = document.getElementById('digest-date');
    if (dateDisplay) dateDisplay.textContent = window.latestDigest.date;

    const container = document.getElementById('digest-content');
    if (!container) return;

    container.innerHTML = ''; // Clear previous

    // NEW: Structured Items (Buttons)
    if (window.latestDigest.items && Array.isArray(window.latestDigest.items)) {
        const list = document.createElement('div');
        list.className = 'digest-list';

        window.latestDigest.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'news-row';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'news-title';
            // Clean up the "- **Update:**" prefix if it exists, for cleaner UI
            let cleanTitle = item.text.replace(/-\s*\*\*Update:\*\*\s*/i, '').trim();
            titleSpan.textContent = cleanTitle;

            const linkBtn = document.createElement('a');
            linkBtn.className = 'news-btn';
            linkBtn.href = item.link;
            linkBtn.target = '_blank';
            linkBtn.innerHTML = `Read <i data-lucide="external-link"></i>`;

            row.appendChild(titleSpan);
            row.appendChild(linkBtn);
            list.appendChild(row);
        });

        container.appendChild(list);
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } else {
        // OLD: Fallback text string
        const rawText = window.latestDigest.content || "No news found.";
        // Simple text render
        const p = document.createElement('div');
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = rawText;
        container.appendChild(p);
    }
}
