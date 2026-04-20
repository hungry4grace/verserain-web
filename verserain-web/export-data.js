import fs from 'fs';
import { Redis } from '@upstash/redis';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}


async function exportUsers() {
  console.log("Starting data export...");

  // 1. Fetch user scores from Upstash Redis (creator_points represents their level/fruits)
  let userScores = {};
  try {
    console.log("Fetching points from Redis...");
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (redisUrl && redisToken) {
      const redis = new Redis({ url: redisUrl, token: redisToken });
      // Fetch all creator_points
      const allData = await redis.zrange('verse_stats:creator_points', 0, -1, { withScores: true });
      for (let i = 0; i < allData.length; i += 2) {
        const name = allData[i];
        const score = parseFloat(allData[i + 1]) || 0;
        userScores[name] = score;
      }
    }
  } catch (err) {
    console.error("Error fetching Redis data:", err.message);
  }

  // 2. Fetch Usernames and Emails from PartyKit Auth DB
  let partyUsers = [];
  try {
    console.log("Fetching emails from PartyKit Auth DB...");
    const res = await fetch("https://verserain-party.hungry4grace.partykit.dev/parties/main/global-auth-db/export-users?secret=vrain_export_2026", {
      method: "POST"
    });
    if (!res.ok) {
      throw new Error(`PartyKit API error: ${res.status} - 請確認您已經執行過 npx partykit deploy`);
    }
    partyUsers = await res.json();
  } catch (err) {
    console.error("Error fetching PartyKit data:", err.message);
    if (err.message.includes("npx partykit deploy")) {
        console.error("【重要提示】您必須先在終端機執行 `npx partykit deploy` 更新雲端程式，才能抓取 Email！");
        return;
    }
  }

  // 3. Merge data
  console.log("Merging data into CSV format...");
  // Basic CSV header
  let csvContent = "\uFEFFUsername,Email,IsPremium,Score(Fruits)\n"; 

  // We loop over partyUsers first
  const handledNames = new Set();
  
  for (const user of partyUsers) {
    const name = user.name;
    const email = user.email;
    const isPremium = user.isPremium ? "Yes" : "No";
    const score = userScores[name] || 0;
    
    handledNames.add(name);
    // Escape quotes for CSV
    const safeName = `"${name.replace(/"/g, '""')}"`;
    const safeEmail = `"${email.replace(/"/g, '""')}"`;
    
    csvContent += `${safeName},${safeEmail},${isPremium},${score}\n`;
  }

  // Add any users that only exist in Redis (played games but not registered deeply)
  for (const [name, score] of Object.entries(userScores)) {
    if (!handledNames.has(name)) {
      const safeName = `"${name.replace(/"/g, '""')}"`;
      csvContent += `${safeName},"N/A","No",${score}\n`;
    }
  }

  // 4. Save to file
  const fileName = `Verserain_Users_Export_${new Date().toISOString().split('T')[0]}.csv`;
  fs.writeFileSync(fileName, csvContent, 'utf-8');
  console.log(`\n✅ 成功匯出檔案！下載路徑：${path.resolve(process.cwd(), fileName)}`);
}

exportUsers();
