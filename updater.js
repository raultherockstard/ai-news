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

    // FutureTools structure relies on link-block-8 and text-block-27
    const linkBlocks = html.split('class="link-block-8');

    const updates = [];
    const seen = new Set(); // TRACK SEEN ITEMS

    for (let i = 1; i < linkBlocks.length; i++) {
        const block = linkBlocks[i];

        // Extract HREF
        const hrefMatch = block.match(/href="([^"]+)"/);
        // Extract TITLE
        const titleMatch = block.match(/class="[^"]*text-block-27[^"]*">([^<]+)<\/div>/);

        if (hrefMatch && titleMatch) {
            let link = hrefMatch[1];
            let title = titleMatch[1].trim();

            // Clean up entities
            title = title.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

            // Fix relative links
            if (link.startsWith('/')) link = 'https://www.futuretools.io' + link;

            // DEDUPLICATION LOGIC
            // Normalize for comparison
            const uniqueKey = title.toLowerCase();
            if (seen.has(link) || seen.has(uniqueKey)) {
                // Skip duplicates
                continue;
            }

            // Mark as seen
            seen.add(link);
            seen.add(uniqueKey);

            // Filters (Short title check)
            if (title.length < 10) continue;

            updates.push({ title, link });
        }

        if (updates.length >= 10) break;
    }

    return updates;
}

// --- MAIN ---
async function run() {
    try {
        console.log(`📡 Connecting to ${SOURCE_URL}...`);
        const html = await fetchHTML(SOURCE_URL);

        const updates = parseNews(html);

        if (updates.length === 0) {
            console.log('⚠️ No updates found. Layout might have changed.');
            return;
        }

        console.log(`✅ Found ${updates.length} unique items.`);

        // Format for the Digest
        // Format: "- **Update:** Title ([Link](...))"
        const formattedContent = updates.map(item =>
            `- **Update:** ${item.title} ([Link](${item.link}))`
        ).join('\n\n');

        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const fileContent = `
// 🧠 AUTOMATICALLY GENERATED ON ${new Date().toISOString()} (Source: FutureTools.io)
window.latestDigest = {
    date: "${dateStr}",
    title: "🧠 Today’s AI Stuff",
    content: \`Title:
🧠 Today’s AI Stuff (Non-Boring Edition)

${formattedContent}\`
};
`;

        fs.writeFileSync('data.js', fileContent);
        console.log('💾 Website Updated Successfully!');

    } catch (err) {
        console.error('Fatal Error:', err);
    }
}

run();
