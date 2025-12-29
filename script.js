console.log("Script loaded.");

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SETUP UI ---
    lucide.createIcons();
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
                    window.latestDigest.items.map(i => {
                        const source = i.source ? `[${i.source}] ` : "";
                        return `- ${source}${i.text} (${i.link})`;
                    }).join("\n");
            } else if (window.latestDigest && window.latestDigest.content) {
                textToCopy = window.latestDigest.content;
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = `Copied! <i data-lucide="check"></i>`;
                lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    lucide.createIcons();
                }, 2000);
            });
        });
    }

    // --- 3. REFRESH FUNCTION ---
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('spin');
            const icon = refreshBtn.querySelector('i');
            icon.style.animation = 'spin 1s linear infinite';

            // Cache bust data.js
            const oldScript = document.querySelector('script[src*="data.js"]');
            if (oldScript) oldScript.remove();

            const newScript = document.createElement('script');
            newScript.src = `data.js?t=${new Date().getTime()}`;
            newScript.onload = () => {
                console.log("Data refreshed!");
                renderDigest();
                icon.style.animation = 'none';

                const dateEl = document.getElementById('current-date');
                if (dateEl) dateEl.textContent = "Checked Just Now";
            };
            document.body.appendChild(newScript);
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
    container.innerHTML = ''; // Clear previous

    // NEW: Structured Items (Buttons)
    if (window.latestDigest.items && Array.isArray(window.latestDigest.items)) {
        const list = document.createElement('div');
        list.className = 'digest-list';

        window.latestDigest.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'news-row';

            // Left Side: Title
            const titleSpan = document.createElement('span');
            titleSpan.className = 'news-title';
            let cleanTitle = item.text.replace(/-\s*\*\*Update:\*\*\s*/i, '').trim();
            titleSpan.textContent = cleanTitle;

            // Right Side: Source Badge + Button
            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.alignItems = 'center';
            actions.style.gap = '12px';

            // Source Badge e.g. "TechCrunch"
            if (item.source) {
                const badge = document.createElement('span');
                badge.textContent = item.source;
                badge.style.fontSize = '0.7rem';
                badge.style.letterSpacing = '0.05em';
                badge.style.color = '#818cf8'; // Indigo-400
                badge.style.border = '1px solid rgba(129, 140, 248, 0.2)';
                badge.style.padding = '2px 8px';
                badge.style.borderRadius = '12px';
                badge.style.whiteSpace = 'nowrap';
                actions.appendChild(badge);
            }

            const linkBtn = document.createElement('a');
            linkBtn.className = 'news-btn';
            linkBtn.href = item.link;
            linkBtn.target = '_blank';
            linkBtn.innerHTML = `Read <i data-lucide="external-link"></i>`;
            actions.appendChild(linkBtn);

            row.appendChild(titleSpan);
            row.appendChild(actions);
            list.appendChild(row);
        });

        container.appendChild(list);
        lucide.createIcons(); // Refresh icons

    } else {
        // Fallback text string
        const rawText = window.latestDigest.content || "No news found.";
        const p = document.createElement('div');
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = rawText;
        container.appendChild(p);
    }
}

// Add spin style
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin { 100% { transform: rotate(360deg); } }
`;
document.head.appendChild(style);
