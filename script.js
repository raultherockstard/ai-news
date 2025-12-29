console.log("Script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateDate();

    // Refresh Logic
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.style.transform = "rotate(360deg)";
            setTimeout(() => window.location.reload(), 300);
        });
    }

    if (window.latestDigest) {
        renderDigest();
    }

    // Copy Function
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            let textToCopy = `🧠 ${window.latestDigest?.title || "AI Stuff"}\n\n`;

            const cats = window.latestDigest?.categories || {};

            const addCat = (name, items) => {
                if (items && items.length > 0) {
                    textToCopy += `--- ${name} ---\n`;
                    items.forEach(i => textToCopy += `• ${cleanTitleText(i.text)} (${i.link})\n`);
                    textToCopy += `\n`;
                }
            };

            addCat("Google", cats.google);
            addCat("OpenAI", cats.openai);
            // Microsoft removed
            addCat("Anthropic", cats.anthropic);
            addCat("General", cats.general);

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
});

function updateDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function cleanTitleText(text) {
    if (!text) return "";
    let clean = text;
    clean = clean.replace(/^(Update:|Announcing|Introducing|Unveiling|Launching|Google adds|Google launches|Microsoft announces|OpenAI releases)\s*/i, "");
    clean = clean.replace(/^\s*-\s*/, "");
    return clean;
}

function renderDigest() {
    if (!window.latestDigest) return;

    // RENDER MAIN SUMMARY
    const summaryData = window.latestDigest.summary;
    const summaryContainer = document.getElementById('list-summary');
    if (summaryContainer && summaryData) {
        summaryContainer.innerHTML = '';
        summaryData.forEach(item => {
            const row = document.createElement('div');
            row.className = 'news-row';
            row.style.border = 'none'; // Cleaner look for summary

            const titleSpan = document.createElement('span');
            titleSpan.className = 'news-title';
            titleSpan.style.fontSize = '1rem'; // Slightly larger for summary
            titleSpan.style.color = '#fff';
            titleSpan.textContent = "✨ " + cleanTitleText(item.text); // Add sparkle bullet

            // Link wrapper
            const link = document.createElement('a');
            link.href = item.link;
            link.target = "_blank";
            link.style.textDecoration = "none";
            link.style.display = "block";
            link.style.width = "100%";
            link.style.padding = "4px 0";

            link.appendChild(titleSpan);
            row.appendChild(link);
            summaryContainer.appendChild(row);
        });
    }

    // RENDER SOURCE CARDS
    const cats = window.latestDigest.categories;
    if (!cats) return;

    const renderList = (elementId, items) => {
        const container = document.getElementById(elementId);
        if (!container) return;

        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-msg">No fresh updates</div>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'news-row';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'news-title';
            titleSpan.textContent = cleanTitleText(item.text);

            const linkBtn = document.createElement('a');
            linkBtn.className = 'news-btn';
            linkBtn.href = item.link;
            linkBtn.target = '_blank';
            linkBtn.innerHTML = `Read`;

            row.appendChild(titleSpan);
            row.appendChild(linkBtn);
            container.appendChild(row);
        });
    };

    renderList('list-google', cats.google);
    renderList('list-openai', cats.openai);
    renderList('list-anthropic', cats.anthropic);
    renderList('list-feed', cats.general);

    lucide.createIcons();
}
