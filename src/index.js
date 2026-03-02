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
        const days = new URL(request.url).searchParams.get('days') || 7;
        return await getAnalytics(db, days);
    }

    throw new Error('Not found');
}

async function getAnalytics(db, days) {
    // Daily sleep totals grouped by type
    const { results: sleepDaily } = await db.prepare(`
    SELECT date(start_time) as date, type,
           SUM(duration_minutes) as total_minutes,
           COUNT(*) as count
    FROM sleep_entries
    WHERE start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(start_time), type
    ORDER BY date
  `).bind(days).all();

    // Sleep by time of day (nap = 8am-5pm, night = 5pm-8am)
    const { results: sleepByPeriod } = await db.prepare(`
    SELECT
      CASE
        WHEN CAST(strftime('%H', start_time) AS INTEGER) BETWEEN 8 AND 16 THEN 'morning'
        ELSE 'evening'
      END as period,
      SUM(duration_minutes) as total_minutes
    FROM sleep_entries
    WHERE start_time >= datetime('now', '-' || ? || ' days')
    GROUP BY period
  `).bind(days).all();

    // Daily feed totals
    const { results: feedDaily } = await db.prepare(`
    SELECT date(time) as date, type,
           SUM(amount_oz) as total_oz,
           SUM(amount_tsp) as total_tsp,
           COUNT(*) as count
    FROM feed_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(time), type
    ORDER BY date
  `).bind(days).all();

    // Feed by time of day
    const { results: feedByPeriod } = await db.prepare(`
    SELECT
      CASE
        WHEN CAST(strftime('%H', time) AS INTEGER) BETWEEN 8 AND 16 THEN 'morning'
        ELSE 'evening'
      END as period,
      SUM(amount_oz) as total_oz,
      COUNT(*) as count
    FROM feed_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY period
  `).bind(days).all();

    // Daily diaper counts
    const { results: diaperDaily } = await db.prepare(`
    SELECT date(time) as date, type, COUNT(*) as count
    FROM diaper_entries
    WHERE time >= datetime('now', '-' || ? || ' days')
    GROUP BY date(time), type
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
