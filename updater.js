const fs = require('fs');
const https = require('https');

// SETTINGS
const SOURCE_URL = "https://www.futuretools.io/news";

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
        // Extract SOURCE (.text-block-28) - NEW!
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

            if (title.length < 10) continue;

            updates.push({ text: title, link: link, source: source });
        }

        if (updates.length >= 40) break; // Extended limit to fill buckets
    }

    return updates;
}

function categorize(items) {
    const buckets = {
        google: [],
        openai: [],
        microsoft: [],
        anthropic: [],
        meta: [],
        general: []
    };

    items.forEach(item => {
        const t = item.text.toLowerCase();
        const s = item.source.toLowerCase();

        // Categorization Rules (Priority Order)
        if (s.includes('google') || s.includes('deepmind') || t.includes('gemini') || t.includes('google')) {
            buckets.google.push(item);
        }
        else if (s.includes('openai') || t.includes('chatgpt') || t.includes('openai') || t.includes('sora') || t.includes('sam altman')) {
            buckets.openai.push(item);
        }
        else if (s.includes('microsoft') || t.includes('microsoft') || t.includes('copilot') || t.includes('nadella')) {
            buckets.microsoft.push(item);
        }
        else if (s.includes('anthropic') || t.includes('claude') || t.includes('anthropic')) {
            buckets.anthropic.push(item);
        }
        else if (s.includes('meta') || s.includes('facebook') || t.includes('llama') || t.includes('zuckerberg')) {
            buckets.meta.push(item);
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

        console.log(`✅ Found ${updates.length} raw items. Categorizing...`);
        const categories = categorize(updates);

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const fileContent = `
// 🧠 AUTOMATICALLY GENERATED ON ${new Date().toISOString()}
window.latestDigest = {
    date: "${dateStr}",
    title: "🧠 Today’s AI Stuff",
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
