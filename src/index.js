// SleepZzz — Cloudflare Worker API
// Serves the frontend and handles REST API for baby tracking

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // CORS headers for API
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // API routes
        if (path.startsWith('/api/')) {
            try {
                const result = await handleAPI(path, method, request, env);
                return new Response(JSON.stringify(result), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }
        }

        // Let Cloudflare serve static assets from public/
        return env.ASSETS.fetch(request);
    },

    async scheduled(event, env, ctx) {
        ctx.waitUntil(generateAndCacheInsights(env));
    },
};

async function handleAPI(path, method, request, env) {
    const db = env.DB;

    // ── Sleep ────────────────────────────────────────────
    if (path === '/api/sleep' && method === 'GET') {
        const days = new URL(request.url).searchParams.get('days') || 30;
        const { results } = await db.prepare(
            `SELECT * FROM sleep_entries WHERE start_time >= datetime('now', '-' || ? || ' days') ORDER BY start_time DESC`
        ).bind(days).all();
        return results;
    }

    if (path === '/api/sleep' && method === 'POST') {
        const body = await request.json();
        const duration = calcMinutes(body.start_time, body.end_time);
        const { meta } = await db.prepare(
            `INSERT INTO sleep_entries (type, start_time, end_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)`
        ).bind(body.type, body.start_time, body.end_time, duration, body.notes || '').run();
        return { id: meta.last_row_id, success: true };
    }

    if (path.startsWith('/api/sleep/') && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const duration = calcMinutes(body.start_time, body.end_time);
        await db.prepare(
            `UPDATE sleep_entries SET type=?, start_time=?, end_time=?, duration_minutes=?, notes=? WHERE id=?`
        ).bind(body.type, body.start_time, body.end_time, duration, body.notes || '', id).run();
        return { success: true };
    }

    if (path.startsWith('/api/sleep/') && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM sleep_entries WHERE id = ?').bind(id).run();
        return { success: true };
    }

    // ── Feeds ────────────────────────────────────────────
    if (path === '/api/feeds' && method === 'GET') {
        const days = new URL(request.url).searchParams.get('days') || 30;
        const { results } = await db.prepare(
            `SELECT * FROM feed_entries WHERE time >= datetime('now', '-' || ? || ' days') ORDER BY time DESC`
        ).bind(days).all();
        return results;
    }

    if (path === '/api/feeds' && method === 'POST') {
        const body = await request.json();
        const { meta } = await db.prepare(
            `INSERT INTO feed_entries (type, time, amount_ml, amount_oz, amount_tsp, sub_type, category, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            body.type, body.time, body.amount_oz || 0,
            body.amount_oz || 0, body.amount_tsp || 0,
            body.sub_type || '', body.category || '', body.notes || ''
        ).run();
        return { id: meta.last_row_id, success: true };
    }

    if (path.startsWith('/api/feeds/') && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        await db.prepare(
            `UPDATE feed_entries SET type=?, time=?, amount_oz=?, amount_tsp=?, sub_type=?, category=?, notes=? WHERE id=?`
        ).bind(body.type, body.time, body.amount_oz || 0, body.amount_tsp || 0, body.sub_type || '', body.category || '', body.notes || '', id).run();
        return { success: true };
    }

    if (path.startsWith('/api/feeds/') && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM feed_entries WHERE id = ?').bind(id).run();
        return { success: true };
    }

    // ── Diapers ──────────────────────────────────────────
    if (path === '/api/diapers' && method === 'GET') {
        const days = new URL(request.url).searchParams.get('days') || 30;
        const { results } = await db.prepare(
            `SELECT * FROM diaper_entries WHERE time >= datetime('now', '-' || ? || ' days') ORDER BY time DESC`
        ).bind(days).all();
        return results;
    }

    if (path === '/api/diapers' && method === 'POST') {
        const body = await request.json();
        const { meta } = await db.prepare(
            `INSERT INTO diaper_entries (type, time, notes) VALUES (?, ?, ?)`
        ).bind(body.type, body.time, body.notes || '').run();
        return { id: meta.last_row_id, success: true };
    }

    if (path.startsWith('/api/diapers/') && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        await db.prepare(
            `UPDATE diaper_entries SET type=?, time=?, notes=? WHERE id=?`
        ).bind(body.type, body.time, body.notes || '', id).run();
        return { success: true };
    }

    if (path.startsWith('/api/diapers/') && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM diaper_entries WHERE id = ?').bind(id).run();
        return { success: true };
    }

    // ── Wake-ups ─────────────────────────────────────────
    if (path === '/api/wakeups' && method === 'GET') {
        const days = new URL(request.url).searchParams.get('days') || 30;
        const { results } = await db.prepare(
            `SELECT * FROM wake_ups WHERE time >= datetime('now', '-' || ? || ' days') ORDER BY time DESC`
        ).bind(days).all();
        return results;
    }

    if (path === '/api/wakeups' && method === 'POST') {
        const body = await request.json();
        const { meta } = await db.prepare(
            `INSERT INTO wake_ups (sleep_entry_id, time, notes) VALUES (?, ?, ?)`
        ).bind(body.sleep_entry_id, body.time, body.notes || '').run();
        return { id: meta.last_row_id, success: true };
    }

    if (path.startsWith('/api/wakeups/') && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM wake_ups WHERE id = ?').bind(id).run();
        return { success: true };
    }

    // ── Analytics ────────────────────────────────────────
    if (path === '/api/analytics' && method === 'GET') {
        const params = new URL(request.url).searchParams;
        const days = params.get('days') || 7;
        const tz = parseInt(params.get('tz') || '0', 10);
        return await getAnalytics(db, days, tz);
    }

    // ── AI Insights (cached) ─────────────────────────────
    if (path === '/api/insights' && method === 'GET') {
        const row = await db.prepare('SELECT insights_text, generated_at FROM insights_cache WHERE id = 1').first();
        return {
            insights: row?.insights_text || 'No insights yet — check back after 6 PM!',
            generated_at: row?.generated_at || null,
        };
    }

    throw new Error('Not found');
}

async function getAnalytics(db, days, tzOffsetMinutes = 0) {
    // Convert JS getTimezoneOffset (minutes behind UTC) to SQLite offset string
    // e.g., 300 (EST) -> '-5 hours', -60 (CET) -> '+1 hours'
    const offsetHours = -(tzOffsetMinutes / 60);
    const sign = offsetHours >= 0 ? '+' : '';
    const tzMod = `${sign}${offsetHours} hours`;

    // Daily sleep totals grouped by type (local time)
    const { results: sleepDaily } = await db.prepare(`
    SELECT date(start_time, '${tzMod}') as date, type,
           SUM(duration_minutes) as total_minutes,
           COUNT(*) as count
    FROM sleep_entries
    WHERE start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(start_time, '${tzMod}'), type
    ORDER BY date
  `).bind(days).all();

    // Sleep by time of day (nap = 8am-5pm, night = 5pm-8am) - local hour
    const { results: sleepByPeriod } = await db.prepare(`
    SELECT
      CASE
        WHEN CAST(strftime('%H', start_time, '${tzMod}') AS INTEGER) BETWEEN 8 AND 16 THEN 'morning'
        ELSE 'evening'
      END as period,
      SUM(duration_minutes) as total_minutes
    FROM sleep_entries
    WHERE start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY period
  `).bind(days).all();

    // Daily feed totals (local time)
    const { results: feedDaily } = await db.prepare(`
    SELECT date(time, '${tzMod}') as date, type,
           SUM(amount_oz) as total_oz,
           SUM(amount_tsp) as total_tsp,
           COUNT(*) as count
    FROM feed_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(time, '${tzMod}'), type
    ORDER BY date
  `).bind(days).all();

    // Feed by time of day - local hour
    const { results: feedByPeriod } = await db.prepare(`
    SELECT
      CASE
        WHEN CAST(strftime('%H', time, '${tzMod}') AS INTEGER) BETWEEN 8 AND 16 THEN 'morning'
        ELSE 'evening'
      END as period,
      SUM(amount_oz) as total_oz,
      COUNT(*) as count
    FROM feed_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY period
  `).bind(days).all();

    // Daily diaper counts (local time)
    const { results: diaperDaily } = await db.prepare(`
    SELECT date(time, '${tzMod}') as date, type, COUNT(*) as count
    FROM diaper_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(time, '${tzMod}'), type
    ORDER BY date
  `).bind(days).all();

    // Summary totals
    const { results: sleepTotal } = await db.prepare(`
    SELECT SUM(duration_minutes) as total_minutes, COUNT(*) as count
    FROM sleep_entries
    WHERE start_time >= datetime('now', '-' || ? || ' days')
  `).bind(days).all();

    const { results: feedTotal } = await db.prepare(`
    SELECT SUM(amount_oz) as total_oz, SUM(amount_tsp) as total_tsp, COUNT(*) as count
    FROM feed_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
  `).bind(days).all();

    const { results: diaperTotal } = await db.prepare(`
    SELECT COUNT(*) as count
    FROM diaper_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
  `).bind(days).all();

    return {
        sleepDaily,
        sleepByPeriod,
        feedDaily,
        feedByPeriod,
        diaperDaily,
        summary: {
            totalSleepMinutes: sleepTotal[0]?.total_minutes || 0,
            totalSleepSessions: sleepTotal[0]?.count || 0,
            totalMilkOz: feedTotal[0]?.total_oz || 0,
            totalSolidsTsp: feedTotal[0]?.total_tsp || 0,
            totalFeeds: feedTotal[0]?.count || 0,
            totalDiapers: diaperTotal[0]?.count || 0,
            days: parseInt(days),
        },
    };
}

function calcMinutes(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    return Math.round((e - s) / 60000);
}

async function generateAndCacheInsights(env) {
    const db = env.DB;
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('Gemini API key not configured — skipping insights generation');
        return;
    }

    // Gather last 7 days of data
    const [sleep, feeds, diapers, wakeups] = await Promise.all([
        db.prepare(`SELECT type, start_time, end_time, duration_minutes, notes FROM sleep_entries WHERE start_time >= datetime('now', '-7 days') ORDER BY start_time DESC`).all(),
        db.prepare(`SELECT type, time, amount_oz, amount_tsp, sub_type, category FROM feed_entries WHERE time >= datetime('now', '-7 days') ORDER BY time DESC`).all(),
        db.prepare(`SELECT type, time FROM diaper_entries WHERE time >= datetime('now', '-7 days') ORDER BY time DESC`).all(),
        db.prepare(`SELECT time, notes FROM wake_ups WHERE time >= datetime('now', '-7 days') ORDER BY time DESC`).all(),
    ]);

    // Build summary
    const summary = {
        sleep: sleep.results.map(e => `${e.type}: ${e.start_time} → ${e.end_time} (${e.duration_minutes}min${e.notes ? ', ' + e.notes : ''})`),
        feeds: feeds.results.map(e => {
            if (e.type === 'milk') return `Milk (${e.sub_type || 'formula'}): ${e.amount_oz}oz at ${e.time}`;
            return `Solid (${e.category || ''}): ${e.amount_tsp}tsp at ${e.time}`;
        }),
        diapers: diapers.results.map(e => `${e.type} at ${e.time}`),
        wakeups: wakeups.results.map(e => `Woke at ${e.time}${e.notes ? ' (' + e.notes + ')' : ''}`),
    };

    const prompt = `You are a warm, knowledgeable baby care assistant for a parent tracking their baby's sleep, feeding, and diaper patterns. Analyze the past 7 days of data below and provide:

1. **Suggestions** — 3-4 thoughtful, detailed, and actionable suggestions based on the data. Each suggestion should explain *why* it matters and give a concrete step the parent can try. Draw from pediatric best practices and tailor them to the specific patterns you see.
2. **Patterns** — 2-3 key observations about sleep schedule, feeding patterns, or diaper trends
3. **Encouragement** — A brief, genuine word of encouragement for the parent

Keep your response under 350 words, warm, and supportive. Use emoji sparingly. Don't be overly clinical. Address the parent directly with "you" and refer to the baby as "your little one."

Data from the last 7 days:
- Sleep sessions (${sleep.results.length}): ${summary.sleep.join(' | ') || 'None recorded'}
- Feeds (${feeds.results.length}): ${summary.feeds.join(' | ') || 'None recorded'}
- Diapers (${diapers.results.length}): ${summary.diapers.join(' | ') || 'None recorded'}
- Brief wake-ups (${wakeups.results.length}): ${summary.wakeups.join(' | ') || 'None recorded'}`;

    const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let geminiData;
    let lastErr;
    for (const model of models) {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
                }),
            }
        );
        if (geminiRes.ok) {
            geminiData = await geminiRes.json();
            break;
        }
        lastErr = await geminiRes.text();
    }

    if (!geminiData) {
        console.error('Gemini API error:', lastErr);
        return;
    }

    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'No insights available right now.';

    // Upsert into insights_cache
    await db.prepare(
        `INSERT INTO insights_cache (id, insights_text, generated_at) VALUES (1, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET insights_text = excluded.insights_text, generated_at = excluded.generated_at`
    ).bind(text).run();

    console.log('Insights generated and cached successfully');
}
