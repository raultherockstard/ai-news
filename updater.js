const fs = require('fs');
const https = require('https');

// --- CONFIGURATION ---
const SOURCES = [
    {
        name: "FutureTools",
        url: "https://www.futuretools.io/news",
        parser: parseFutureTools
    },
    {
        name: "TechCrunch AI",
        url: "https://techcrunch.com/category/artificial-intelligence/",
        parser: parseTechCrunch
    },
    {
        name: "OpenAI Blog",
        url: "https://openai.com/news/",
        parser: parseOpenAI
    }
];

// --- NETWORK UTILS ---
function fetchHTML(url) {
    return new Promise((resolve) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/'
            }
        };

        const req = https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Handle basic redirect
                fetchHTML(res.headers.location).then(resolve);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', (e) => {
            console.error(`❌ Error fetching ${url}:`, e.message);
            resolve(''); // Return empty string on error so we don't crash
        });
    });
}

// --- PARSERS ---

function parseFutureTools(html) {
    const linkBlocks = html.split('class="link-block-8');
    const updates = [];

    for (let i = 1; i < linkBlocks.length; i++) {
        const block = linkBlocks[i];
        const hrefMatch = block.match(/href="([^"]+)"/);
        const titleMatch = block.match(/class="[^"]*text-block-27[^"]*">([^<]+)<\/div>/);

        if (hrefMatch && titleMatch) {
            let link = hrefMatch[1];
            let title = titleMatch[1].trim();
            if (link.startsWith('/')) link = 'https://www.futuretools.io' + link;
            updates.push({ text: title, link: link, source: 'FutureTools' });
        }
    }
    return updates;
}

function parseTechCrunch(html) {
    // Robust Parser: Look for Any link containing /2025/ or /2024/
    const updates = [];
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const link = match[1];
        const text = match[2].trim();

        // Filter: Must be an article link (has date structure)
        if (link.includes('/2025/') || link.includes('/2024/')) {
            // Filter: Text must be substantial
            if (text.length > 20 && !text.includes('Read More') && !text.includes('comment')) {
                // Decode
                const cleanText = text.replace(/&#8217;/g, "'").replace(/&amp;/g, "&").replace(/&#8211;/g, "-");
                updates.push({ text: cleanText, link: link, source: 'TechCrunch' });
            }
        }
        if (updates.length >= 10) break;
    }
    return updates;
}

function parseOpenAI(html) {
    const updates = [];
    // We look for links starting with /index/
    const chunks = html.split('href="/index/');

    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const slugMatch = chunk.match(/^([^"]+)"/);
        if (!slugMatch) continue;

        const link = `https://openai.com/index/${slugMatch[1]}`;

        // Naive text finder
        const textChunk = chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const possibleTitle = textChunk.split('  ')[0].substring(0, 100);

        if (possibleTitle.length > 10 && !possibleTitle.includes('Read more')) {
            updates.push({ text: possibleTitle, link: link, source: 'OpenAI' });
        }
    }
    return updates;
}

// --- ENGINE ---
async function run() {
    console.log('🚀 AI News Engine Starting...');
    let allUpdates = [];
    const seen = new Set();

    // 1. Fetch All Sources
    for (const source of SOURCES) {
        console.log(`📡 Fetching ${source.name}...`);
        const html = await fetchHTML(source.url);
        if (!html) continue;

        const items = source.parser(html);
        console.log(`   - Found ${items.length} items.`);

        for (const item of items) {
            const key = item.text.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!seen.has(key) && !seen.has(item.link)) {
                seen.add(key);
                seen.add(item.link);
                allUpdates.push(item);
            }
        }
    }

    // 3. Output
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const fileContent = `
// 🧠 AUTOMATICALLY GENERATED ON ${new Date().toISOString()}
window.latestDigest = {
    date: "${dateStr}",
    title: "🧠 Today’s AI Stuff",
    items: ${JSON.stringify(allUpdates, null, 4)}
};
`;

    fs.writeFileSync('data.js', fileContent);
    console.log('💾 Website Updated.');
}

run();
