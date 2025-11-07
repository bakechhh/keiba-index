/*
    競馬指数予測システム - 追加機能
    - オッズデータ読み込み
    - AI分析機能
*/

// ====================
// グローバル変数
// ====================
let currentOddsData = null;
let currentOddsType = 'tfw';
let currentOddsSort = 'combination';

// ====================
// イベントリスナー
// ====================
document.addEventListener('DOMContentLoaded', () => {
    // オッズタブのイベントリスナー
    document.querySelectorAll('.odds-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentOddsType = btn.dataset.oddsType;
            document.querySelectorAll('.odds-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOdds();
        });
    });

    // オッズソートのイベントリスナー
    document.getElementById('oddsSort').addEventListener('change', (e) => {
        currentOddsSort = e.target.value;
        renderOdds();
    });

    // AI分析ボタンのイベントリスナー
    document.getElementById('aiAnalyzeBtn').addEventListener('click', runAIAnalysis);
});


// ====================
// オッズデータ処理
// ====================
async function loadAndRenderOdds() {
    if (!selectedRace) return;

    const raceId = selectedRace.race_number; // 例: 東京1R

    try {
        // data-loader.jsのloadOddsData関数を使用（全券種を並列読み込み）
        currentOddsData = await window.loadOddsData(raceId);

        if (!currentOddsData || currentOddsData.length === 0) {
            throw new Error('オッズデータが見つかりません');
        }

        renderOdds();
    } catch (error) {
        document.getElementById('oddsContent').innerHTML = `<div class="error">${error.message}</div>`;
    }
}

function renderOdds() {
    if (!currentOddsData) return;

    const oddsContent = document.getElementById('oddsContent');
    const oddsForType = currentOddsData.find(o => o.odds_type === currentOddsType);

    if (!oddsForType) {
        oddsContent.innerHTML = '<div>この券種のオッズデータはありません。</div>';
        return;
    }

    let html = '';

    // 単勝・複勝（tfw）の場合は特別処理
    if (currentOddsType === 'tfw') {
        // 単勝テーブル
        html += '<h3>単勝</h3>';
        html += '<table class="odds-table"><thead><tr>';
        html += '<th>枠</th><th>馬番</th><th>馬名</th><th>オッズ</th>';
        html += '</tr></thead><tbody>';

        oddsForType.data.tansho.forEach(item => {
            html += '<tr>';
            html += `<td>${item.waku}</td>`;
            html += `<td>${item.horse_num}</td>`;
            html += `<td>${item.horse_name}</td>`;
            html += `<td>${item.odds}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';

        // 複勝テーブル
        html += '<h3>複勝</h3>';
        html += '<table class="odds-table"><thead><tr>';
        html += '<th>枠</th><th>馬番</th><th>馬名</th><th>オッズ</th>';
        html += '</tr></thead><tbody>';

        oddsForType.data.fukusho.forEach(item => {
            html += '<tr>';
            html += `<td>${item.waku}</td>`;
            html += `<td>${item.horse_num}</td>`;
            html += `<td>${item.horse_name}</td>`;
            html += `<td>${item.odds.min} - ${item.odds.max}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
    } else {
        // その他の券種（枠連、馬連、ワイド、馬単、3連複、3連単）
        let combinations = oddsForType.data.combinations;

        // ソート処理
        if (currentOddsSort === 'odds_asc') {
            combinations.sort((a, b) => (a.odds.min || a.odds) - (b.odds.min || b.odds));
        } else if (currentOddsSort === 'odds_desc') {
            combinations.sort((a, b) => (b.odds.min || b.odds) - (a.odds.min || a.odds));
        }

        // HTML生成
        html += '<table class="odds-table"><thead><tr>';
        const headers = Object.keys(combinations[0]).filter(k => k !== 'odds');
        headers.forEach(h => { html += `<th>${h}</th>`; });
        html += '<th>オッズ</th></tr></thead><tbody>';

        combinations.forEach(c => {
            html += '<tr>';
            headers.forEach(h => { html += `<td>${c[h]}</td>`; });
            const oddsValue = (typeof c.odds === 'object') ? `${c.odds.min} - ${c.odds.max}` : c.odds;
            html += `<td>${oddsValue}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
    }

    oddsContent.innerHTML = html;
}

// ====================
// AI分析処理
// ====================
async function runAIAnalysis() {
    if (!selectedRace) return;

    const aiResultDiv = document.getElementById('aiResult');
    aiResultDiv.innerHTML = '<div class="loading-spinner"></div><div>AIが分析中です...</div>';

    // パラメータ取得
    const budget = document.getElementById('aiBudget').value;
    const minReturn = document.getElementById('aiMinReturn').value;
    const targetReturn = document.getElementById('aiTargetReturn').value;
    const betTypes = Array.from(document.querySelectorAll('input[name="betType"]:checked')).map(cb => cb.value);

    try {
        // オッズデータが読み込まれていない場合は読み込む
        if (!currentOddsData) {
            const raceId = selectedRace.race_number;
            currentOddsData = await window.loadOddsData(raceId);
        }

        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                raceData: selectedRace,
                oddsData: currentOddsData,
                userParams: { budget, minReturn, targetReturn, betTypes }
            })
        });
        
        console.log('[runAIAnalysis] Response status:', response.status);

        if (!response.ok) {
            throw new Error('AI分析の実行に失敗しました');
        }

        const result = await response.json();

        // marked.jsを使ってMarkdownをHTMLに変換
        aiResultDiv.innerHTML = marked.parse(result.analysis);

    } catch (error) {
        aiResultDiv.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

// ====================
// グローバルに公開2
// ====================
window.loadAndRenderOdds = loadAndRenderOdds;
window.runAIAnalysis = runAIAnalysis;
