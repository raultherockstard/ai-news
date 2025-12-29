console.log("Script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    updateDate();

    if (window.latestDigest) {
        renderDigest();
    }

    // Copy Function (Aggregates all visible news)
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            let textToCopy = `🧠 ${window.latestDigest?.title || "AI Stuff"}\n\n`;

            const cats = window.latestDigest?.categories || {};

            // Helper to format category text
            const addCat = (name, items) => {
                if (items && items.length > 0) {
                    textToCopy += `--- ${name} ---\n`;
                    items.forEach(i => textToCopy += `• ${i.text} (${i.link})\n`);
                    textToCopy += `\n`;
                }
            };

            addCat("Google", cats.google);
            addCat("OpenAI", cats.openai);
            addCat("Microsoft", cats.microsoft);
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

function renderDigest() {
    if (!window.latestDigest || !window.latestDigest.categories) return;

    const cats = window.latestDigest.categories;

    // Helper to render list items
    const renderList = (elementId, items) => {
        const container = document.getElementById(elementId);
        if (!container) return;

        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<div class="empty-msg">No updates today</div>';
            return;
        }

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'news-row';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'news-title';
            titleSpan.textContent = item.text;

            const linkBtn = document.createElement('a');
            linkBtn.className = 'news-btn';
            linkBtn.href = item.link;
            linkBtn.target = '_blank';
            linkBtn.innerHTML = `Read <i data-lucide="external-link"></i>`;

            row.appendChild(titleSpan);
            row.appendChild(linkBtn);
            container.appendChild(row);
        });
    };

    renderList('list-google', cats.google);
    renderList('list-openai', cats.openai);
    renderList('list-microsoft', cats.microsoft);
    renderList('list-anthropic', cats.anthropic);
    renderList('list-feed', cats.general); // Main Feed

    // Refresh Icons after rendering
    lucide.createIcons();
}
