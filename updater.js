const fs = require('fs');
const https = require('https');

// --- CONFIGURATION ---
const SOURCES = [
    { name: "FutureTools", url: "https://www.futuretools.io/news", parser: parseFutureTools },

    // Official Blogs (Priority)
    { name: "OpenAI", url: "https://openai.com/news/", parser: parseOpenAI },
    { name: "Claude (Anthropic)", url: "https://www.anthropic.com/news", parser: parseAnthropic },
    { name: "Google Gemini", url: "https://blog.google/technology/ai/", parser: parseGoogle },
    { name: "Meta AI", url: "https://ai.meta.com/blog/", parser: parseMeta },
    { name: "Microsoft AI", url: "https://blogs.microsoft.com/ai/", parser: parseMicrosoft },

    // News & Aggregators
    { name: "TechCrunch AI", url: "https://techcrunch.com/category/artificial-intelligence/", parser: parseTechCrunch },
    { name: "AI Weekly", url: "https://aiweekly.co/", parser: parseAIWeekly },
    { name: "AI News", url: "https://www.artificialintelligence-news.com/", parser: parseAINews }
];

// --- NETWORK UTILS ---
function fetchHTML(url) {
    return new Promise((resolve) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            }
        };

        const req = https.get(url, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchHTML(res.headers.location).then(resolve);
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', (e) => {
            console.error(`❌ Error fetching ${url}:`, e.message);
            resolve('');
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
            if (link.startsWith('/')) link = 'https://www.futuretools.io' + link;
            updates.push({ text: titleMatch[1].trim(), link: link, source: 'FutureTools' });
        }
    }
    return updates;
}

function parseTechCrunch(html) {
    const updates = [];
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const link = match[1];
        const text = match[2].trim();
        if ((link.includes('/2025/') || link.includes('/2024/')) && text.length > 20 && !text.includes('Read More')) {
            const cleanText = text.replace(/&#8217;/g, "'").replace(/&amp;/g, "&").replace(/&#8211;/g, "-");
            updates.push({ text: cleanText, link: link, source: 'TechCrunch' });
        }
        if (updates.length >= 8) break;
    }
    return updates;
}

function parseOpenAI(html) {
    const updates = [];
    const chunks = html.split('href="/index/');
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const slugMatch = chunk.match(/^([^"]+)"/);
        if (!slugMatch) continue;
        const link = `https://openai.com/index/${slugMatch[1]}`;
        const textChunk = chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const possibleTitle = textChunk.split('  ')[0].substring(0, 100);
        if (possibleTitle.length > 10 && !possibleTitle.includes('Read more')) {
            updates.push({ text: possibleTitle, link: link, source: 'OpenAI' });
        }
    }
    return updates;
}

function parseAnthropic(html) {
    const updates = [];
    const chunks = html.split('href="/news/');
    for (let i = 1; i < chunks.length; i++) {
        const chunk = chunks[i];
        const slugMatch = chunk.match(/^([^"]+)"/);
        if (!slugMatch) continue;
        const link = `https://www.anthropic.com/news/${slugMatch[1]}`;
        const textOnly = chunk.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const title = textOnly.split('  ')[0].substring(0, 100);
        if (title.length > 15) {
            updates.push({ text: title, link: link, source: 'Claude (Anthropic)' });
        }
        if (updates.length >= 3) break;
    }
    return updates;
}

function parseGoogle(html) {
    const updates = [];
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        let link = match[1];
        let text = match[2].replace(/<[^>]+>/g, '').trim();
        if (link.includes('/technology/ai/') || link.includes('/products/gemini')) {
            if (link.startsWith('/')) link = "https://blog.google" + link;
            if (text.length > 15 && !text.includes('Read more')) {
                text = text.replace(/&#8217;/g, "'").replace(/&amp;/g, "&");
                updates.push({ text: text, link: link, source: 'Google Gemini' });
            }
        }
        if (updates.length >= 5) break;
    }
    return updates;
}

function parseMeta(html) {
    const updates = [];
    const regex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let link = match[1];
        let content = match[2];
        if (link.includes('/blog/') && !link.endsWith('/blog/') && !link.includes('page')) {
            if (link.startsWith('/')) link = "https://ai.meta.com" + link;
            let text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (text.length > 20 && !text.includes('Read more')) {
                updates.push({ text: text, link: link, source: 'Meta AI' });
            }
        }
        if (updates.length >= 4) break;
    }
    return updates;
}

function parseMicrosoft(html) {
    const updates = [];
    const regex = /<h[23][^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const link = match[1];
        const title = match[2].trim();
        if (title.length > 15) {
            updates.push({ text: title, link: link, source: 'Microsoft AI' });
        }
        if (updates.length >= 4) break;
    }
    return updates;
}

function parseAIWeekly(html) {
    const updates = [];
    const regex = /<strong>([^<]+)<\/strong>[\s\S]*?<a[^>]+href="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const title = match[1].trim();
        const link = match[2];
        if (title.length > 10 && !link.includes('twitter') && !link.includes('aiweekly')) {
            updates.push({ text: title, link: link, source: 'AI Weekly' });
        }
        if (updates.length >= 5) break;
    }
    return updates;
}

function parseAINews(html) {
    const updates = [];
    const regex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        let link = match[1];
        let title = match[2].trim();
        if (link.includes('artificialintelligence-news.com') && link.length > 35 && title.length > 20) {
            title = title.replace(/&amp;/g, '&');
            updates.push({ text: title, link: link, source: 'AI News' });
        }
        if (updates.length >= 6) break;
    }
    return updates;
}

// --- ENGINE ---
async function run() {
    console.log('🚀 AI News Engine Starting (9 Sources)...');
    let allUpdates = [];
    const seen = new Set();

    // PRIORITY LIST
    const PRIORITY = ['OpenAI', 'Google Gemini', 'Claude (Anthropic)', 'Meta AI', 'Microsoft AI'];

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

    allUpdates.sort((a, b) => {
        const aP = PRIORITY.includes(a.source) ? 1 : 0;
        const bP = PRIORITY.includes(b.source) ? 1 : 0;
        if (aP !== bP) return bP - aP;
        return 0;
    });

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
