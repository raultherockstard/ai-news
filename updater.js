const fs = require('fs');
const https = require('https');

// SETTINGS
const SOURCE_URL = "https://www.futuretools.io/news";

// --- FILTERS (The Bouncer) ---
const BORING_KEYWORDS = [
    // Academic & Papers
    "arxiv", "paper", "research paper", "thesis", "study", "abstract",
    "metrics", "benchmark", "evaluation", "dataset", "parameter", "weights",

    // Enterprise & Infrastructure
    "enterprise", "b2b", "datacenter", "server", "cloud infrastructure",
    "latency", "inference", "throughput", "training", "fine-tuning",
    "api", "sdk", "middleware", "supply chain", "logistics",

    // Policy & Business (Boring side)
    "policy", "regulation", "lawsuit", "compliance", "copyright",
    "hiring", "appointed", "joins board", "executive", "quarterly", "earnings",
    "market share", "acquisition", "funding", "investors" // User might want big funding, but generally boring
];

const EXCITING_KEYWORDS = [
    // Override boring if it contains these?
    "cure", "cancer", "life", "save", // Health overrides
    "video", "music", "movie", "game", // Media overrides
    "robot", "humanoid", "agent"
];

function isBoring(text) {
    const t = text.toLowerCase();

    // 1. Check strict boring words
    const foundBoring = BORING_KEYWORDS.find(k => t.includes(k));

    if (foundBoring) {
        // 2. Check if it has an "Exciting" override
        // e.g. "Research paper finds cure for cancer" -> Keep
        const foundExciting = EXCITING_KEYWORDS.find(k => t.includes(k));
        if (foundExciting) return false; // Saved by the exciting word

        return true; // Use the ban hammer
    }

    return false;
}

// --- SCRAPER ENGINE ---
function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
    });
}

function parseNews(html) {
    console.log('🧐 Parsing content...');

    const linkBlocks = html.split('class="link-block-8');
    const updates = [];
    const seen = new Set();

    for (let i = 1; i < linkBlocks.length; i++) {
        const block = linkBlocks[i];

        // Extract HREF
        const hrefMatch = block.match(/href="([^"]+)"/);
        // Extract TITLE (.text-block-27)
        const titleMatch = block.match(/class="[^"]*text-block-27[^"]*">([^<]+)<\/div>/);
        // Extract SOURCE (.text-block-28)
        const sourceMatch = block.match(/class="[^"]*text-block-28[^"]*">([^<]+)<\/div>/);

        if (hrefMatch && titleMatch) {
            let link = hrefMatch[1];
            let title = titleMatch[1].trim();
            let source = sourceMatch ? sourceMatch[1].trim() : "Unknown";

            // Clean up entities
            title = title.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

            // Fix relative links
            if (link.startsWith('/')) link = 'https://www.futuretools.io' + link;

            // Deduplication
            const uniqueKey = title.toLowerCase();
            if (seen.has(link) || seen.has(uniqueKey)) continue;
            seen.add(link);
            seen.add(uniqueKey);

            // --- FILTER: THE BOUNCER ---
            if (isBoring(title)) {
                // console.log(`Skipping boring: ${title}`);
                continue;
            }

            if (title.length < 10) continue;

            updates.push({ text: title, link: link, source: source });
        }

        if (updates.length >= 40) break;
    }

    return updates;
}

function categorize(items) {
    const buckets = {
        google: [],
        openai: [],
        microsoft: [], // Kept in logic but hidden in UI, just in case
        anthropic: [],
        general: []
    };

    items.forEach(item => {
        const t = item.text.toLowerCase();
        const s = item.source.toLowerCase();

        // Categorization Rules
        if (s.includes('google') || s.includes('deepmind') || t.includes('gemini') || t.includes('google')) {
            buckets.google.push(item);
        }
        else if (s.includes('openai') || t.includes('chatgpt') || t.includes('openai') || t.includes('sora') || t.includes('sam altman')) {
            buckets.openai.push(item);
        }
        else if (s.includes('microsoft') || t.includes('microsoft') || t.includes('copilot') || t.includes('nadella')) {
            buckets.microsoft.push(item); // User hid this card, but we categorize it so it doesn't clutter main feed
            // Actually, if we want microsoft to NOT show up at all since the card is gone? 
            // The user said "remove micrscrost" from the layout. 
            // If we classify it here, it vanishes from UI. That's good.
        }
        else if (s.includes('anthropic') || t.includes('claude') || t.includes('anthropic')) {
            buckets.anthropic.push(item);
        }
        else {
            buckets.general.push(item);
        }
    });

    return buckets;
}

// --- MAIN ---
async function run() {
    try {
        console.log(`📡 Connecting to ${SOURCE_URL}...`);
        const html = await fetchHTML(SOURCE_URL);

        const updates = parseNews(html);

        if (updates.length === 0) {
            console.log('⚠️ No updates found.');
            return;
        }

        console.log(`✅ Found ${updates.length} curated items per your taste.`);
        const categories = categorize(updates);

        // Auto-Generate Summary (First 5 items)
        const summary = updates.slice(0, 5);

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const fileContent = `
// 🧠 AUTOMATICALLY GENERATED ON ${new Date().toISOString()}
window.latestDigest = {
    date: "${dateStr}",
    title: "🧠 Today’s AI Stuff",
    summary: ${JSON.stringify(summary, null, 4)},
    categories: ${JSON.stringify(categories, null, 4)}
};
`;

        fs.writeFileSync('data.js', fileContent);
        console.log('💾 Website Updated Successfully!');

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

run();
