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
// 表示モード切り替え
// ====================
function changeViewMode(mode) {
    currentViewMode = mode;
    const viewModes = ['list', 'simple', 'detail', 'odds', 'ai'];
    
    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(mode)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // ビューの表示/非表示を切り替え
    viewModes.forEach(vm => {
        const viewElement = document.getElementById(`${vm}View`);
        if (viewElement) {
            viewElement.style.display = (vm === mode) ? 'block' : 'none';
        }
    });

    // オッズまたはAI分析が選択された場合、データを読み込む
    if (mode === 'odds') {
        loadOddsData();
    } else if (mode === 'ai') {
        // AI分析ビューの準備
    }
}

// ====================
// オッズデータ処理
// ====================
async function loadOddsData() {
    if (!selectedRace) return;

    const raceName = selectedRace.race_name;
    const oddsUrl = `https://bakechhh.github.io/keiba-index/odds/${raceName}.json`;

    try {
        const response = await fetch(oddsUrl);
        if (!response.ok) {
            throw new Error('オッズデータの読み込みに失敗しました');
        }
        currentOddsData = await response.json();
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

    let combinations = oddsForType.data.combinations;

    // ソート処理
    if (currentOddsSort === 'odds_asc') {
        combinations.sort((a, b) => (a.odds.min || a.odds) - (b.odds.min || b.odds));
    } else if (currentOddsSort === 'odds_desc') {
        combinations.sort((a, b) => (b.odds.min || b.odds) - (a.odds.min || a.odds));
    }

    // HTML生成
    let html = '<table class="odds-table"><thead><tr>';
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
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            body: JSON.stringify({
                raceName: selectedRace.race_name,
                userParams: { budget, minReturn, targetReturn, betTypes }
            })
        });

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
// 既存の関数を上書き
// ====================

// 既存のchangeViewModeを上書きして、新しいビューに対応
const originalChangeViewMode = window.changeViewMode;
window.changeViewMode = function(mode) {
    if (['odds', 'ai'].includes(mode)) {
        changeViewMode(mode);
    } else {
        originalChangeViewMode(mode);
    }
};
