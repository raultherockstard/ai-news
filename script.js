const sources = [
    "@ylecun", "@seb", "@hardmaru", "@jeremyphoward", "@goodside",
    "@emollick", "@karpathy", "@omarsar0", "@mreflow", "@heyBarsee", "@_akhaliq"
];

const digestData = (window.latestDigest && window.latestDigest.content) ? window.latestDigest.content : `Title:
🧠 Today’s AI Stuff (Non-Boring Edition)

- **Karpathy says “Vibe Coding” is the future.** Basically: stop stressing over syntax. Just tell the AI what you want the app to do/feel like, and let it handle the code. If it works, it works.

- **OpenAI dropped the Sora mobile app.** You can finally generate video on your phone. The wildest part? They struck a deal with Disney, so yes, you can legally use Mickey in your AI clips now.

- **Google launched “Disco” for Chrome.** It takes your messy open tabs and turns them into clean, interactive mini-apps. Absolute lifesaver for tab hoarders.

- **GPT-5.2 is actually here.** It thinks longer and hallucinates less. The gap between "talking to a bot" and "talking to a smart human" just got uncomfortably small.

- **“Nano Banana” is taking over timelines.** It’s the viral image trend of the week. Weirdly specific, slightly cursed, but undeniably cool aesthetic.`;

function init() {
    renderMarquee();
    renderDigest(digestData);
    setupEventListeners();

    // Update date if available in new data
    if (window.latestDigest && window.latestDigest.date) {
        document.getElementById('current-date').innerText = window.latestDigest.date;
    } else {
        updateDate();
    }
}

function renderMarquee() {
    const marqueeContent = document.querySelector('.marquee-content');
    // duplicate sources for smooth scrolling loop
    const fullList = [...sources, ...sources, ...sources];

    marqueeContent.innerHTML = fullList.map(source =>
        `<span class="marquee-item">${source}</span>`
    ).join('');
}

function renderDigest(text) {
    const digestOutput = document.getElementById('digest-output');

    // Parse the raw text into styled HTML
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const title = lines[0]; // Title line
    const titleContent = lines[1]; // "🧠 Today..."

    // Extract bullets (lines starting with "-")
    const bullets = lines.filter(line => line.trim().startsWith('-'));

    let html = `
        <span class="digest-title">${titleContent}</span>
        <ul class="bullet-list">
    `;

    bullets.forEach(bullet => {
        // Simple markdown parser for bold text (**text**)
        let formatted = bullet.replace(/^- /, '')
            .replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>');

        html += `<li class="bullet-item">${formatted}</li>`;
    });

    html += `</ul>`;

    digestOutput.innerHTML = html;
}

function setupEventListeners() {
    const regenerateBtn = document.getElementById('regenerate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const digestOutput = document.getElementById('digest-output');

    regenerateBtn.addEventListener('click', () => {
        // Simulate loading state
        const originalContent = digestOutput.innerHTML;
        digestOutput.innerHTML = `
            <div class="loading-state">
                <div class="loader"></div>
                <p>Scanning the timeline...</p>
            </div>
        `;

        // Disable button temporarily
        regenerateBtn.disabled = true;
        lucide.createIcons(); // Re-init icons if needed inside loader (though none here)

        setTimeout(() => {
            digestOutput.innerHTML = originalContent;
            regenerateBtn.disabled = false;
        }, 1500);
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(digestData).then(() => {
            const originalText = copyBtn.querySelector('span').innerText;
            const originalIcon = copyBtn.querySelector('i').getAttribute('data-lucide');

            copyBtn.innerHTML = `<i data-lucide="check"></i><span>Copied!</span>`;
            copyBtn.style.background = '#10b981'; // Success green
            lucide.createIcons();

            setTimeout(() => {
                copyBtn.innerHTML = `<i data-lucide="${originalIcon}"></i><span>${originalText}</span>`;
                copyBtn.style.background = '';
                lucide.createIcons();
            }, 2000);
        });
    });
}

function updateDate() {
    const dateEl = document.getElementById('current-date');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.innerText = new Date().toLocaleDateString('en-US', options);
}

document.addEventListener('DOMContentLoaded', init);
