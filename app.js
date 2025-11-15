/*
    競馬指数予測システム - 追加機能
    - オッズデータ読み込み
    - AI分析機能（直接Gemini API呼び出し）
*/

// ====================
// グローバル変数
// ====================
let currentOddsData = null;
let currentOddsType = 'tfw';
let currentOddsSort = 'combination';

// OpenAI APIキー（window.OPENAI_API_KEYを優先、なければlocalStorageから取得）
let openaiApiKey = '';

// APIキーを取得する関数
function getOpenAIApiKey() {
    return window.OPENAI_API_KEY || localStorage.getItem('openai_api_key') || '';
}

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
    
    // OpenAI APIキー保存ボタンのイベントリスナー
    const saveOpenAIKeyBtn = document.getElementById('saveOpenAIKey');
    if (saveOpenAIKeyBtn) {
        saveOpenAIKeyBtn.addEventListener('click', saveOpenAIKey);
    }
    
    // OpenAI APIキーの読み込み
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const savedKey = getOpenAIApiKey();
    if (openaiApiKeyInput && savedKey) {
        openaiApiKeyInput.value = savedKey;
    }
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
        oddsContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">この券種のオッズデータはありません。</div>';
        return;
    }

    let html = '';

    // 単勝・複勝（tfw）の場合は特別処理
    if (currentOddsType === 'tfw') {
        // 単勝データを取得してソート
        let tanshoData = [...oddsForType.data.tansho];
        
        if (currentOddsSort === 'odds_asc') {
            tanshoData.sort((a, b) => parseFloat(a.odds) - parseFloat(b.odds));
        } else if (currentOddsSort === 'odds_desc') {
            tanshoData.sort((a, b) => parseFloat(b.odds) - parseFloat(a.odds));
        }

        // 単勝テーブル
        html += '<h3 class="odds-section-title">単勝</h3>';
        html += '<table class="odds-table-modern"><thead><tr>';
        html += '<th>馬番</th><th>馬名</th><th>オッズ</th>';
        html += '</tr></thead><tbody>';

        tanshoData.forEach(item => {
            html += '<tr>';
            html += `<td>${item.horse_num}</td>`;
            html += `<td style="text-align: left; padding-left: 12px;">${item.horse_name}</td>`;
            html += `<td>${item.odds}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';

        // 複勝データを取得してソート
        let fukushoData = [...oddsForType.data.fukusho];
        
        if (currentOddsSort === 'odds_asc') {
            fukushoData.sort((a, b) => parseFloat(a.odds.min) - parseFloat(b.odds.min));
        } else if (currentOddsSort === 'odds_desc') {
            fukushoData.sort((a, b) => parseFloat(b.odds.max) - parseFloat(a.odds.max));
        }

        // 複勝テーブル
        html += '<h3 class="odds-section-title">複勝</h3>';
        html += '<table class="odds-table-modern"><thead><tr>';
        html += '<th>馬番</th><th>馬名</th><th>オッズ</th>';
        html += '</tr></thead><tbody>';

        fukushoData.forEach(item => {
            html += '<tr>';
            html += `<td>${item.horse_num}</td>`;
            html += `<td style="text-align: left; padding-left: 12px;">${item.horse_name}</td>`;
            html += `<td>${item.odds.min} - ${item.odds.max}</td>`;
            html += '</tr>';
        });
        html += '</tbody></table>';
    } else {
        // その他の券種（枠連、馬連、ワイド、馬単、3連複、3連単）
        let combinations = [...oddsForType.data.combinations];

        // ソート処理
        if (currentOddsSort === 'odds_asc') {
            combinations.sort((a, b) => {
                const aOdds = (typeof a.odds === 'object') ? parseFloat(a.odds.min) : parseFloat(a.odds);
                const bOdds = (typeof b.odds === 'object') ? parseFloat(b.odds.min) : parseFloat(b.odds);
                // NaNやundefinedを除外
                if (isNaN(aOdds)) return 1;
                if (isNaN(bOdds)) return -1;
                return aOdds - bOdds;
            });
        } else if (currentOddsSort === 'odds_desc') {
            combinations.sort((a, b) => {
                const aOdds = (typeof a.odds === 'object') ? parseFloat(a.odds.max || a.odds.min) : parseFloat(a.odds);
                const bOdds = (typeof b.odds === 'object') ? parseFloat(b.odds.max || b.odds.min) : parseFloat(b.odds);
                // NaNやundefinedを除外
                if (isNaN(aOdds)) return 1;
                if (isNaN(bOdds)) return -1;
                return bOdds - aOdds;
            });
        }

        // HTML生成（combinationのみ表示）
        html += '<table class="odds-table-modern"><thead><tr>';
        html += '<th>組み合わせ</th>';
        html += '<th>オッズ</th>';
        html += '</tr></thead><tbody>';

        combinations.forEach(c => {
            html += '<tr>';
            // combinationフィールドを表示
            html += `<td style="font-weight: bold; color: #667eea;">${c.combination}</td>`;
            // オッズを表示
            const oddsValue = (typeof c.odds === 'object') ? `${c.odds.min} - ${c.odds.max}` : c.odds;
            html += `<td>${oddsValue}</td>`;
            html += '</tr>';
        });

        html += '</tbody></table>';
    }

    oddsContent.innerHTML = html;
}

// ====================
// AI分析処理（直接Gemini API呼び出し）
// ====================
async function runAIAnalysis() {
    if (!selectedRace) return;

    const aiResultDiv = document.getElementById('aiResult');
    
    // モデル選択を先に取得
    const selectedModel = document.getElementById('geminiModel').value;
    
    // OpenAIモデルの場合は別関数を呼び出す（Gemini APIキーチェックをスキップ）
    if (selectedModel === 'gpt-5-nano' || selectedModel === 'gpt-4o-mini') {
        return runAIAnalysisWithOpenAI(selectedModel);
    }
    
    // Geminiモデルの場合のAPIキーチェック
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    if (!apiKey) {
        aiResultDiv.innerHTML = '<div class="error">❌ Gemini APIキーを入力してください。<br><a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>で無料取得できます。</div>';
        return;
    }

    aiResultDiv.innerHTML = '<div class="loading-spinner"></div><div>AIが分析中です...</div>';

    // パラメータ取得
    const budget = document.getElementById('aiBudget').value;
    const minReturn = document.getElementById('aiMinReturn').value;
    const targetReturn = document.getElementById('aiTargetReturn').value;
    const betTypes = Array.from(document.querySelectorAll('input[name="betType"]:checked')).map(cb => cb.value);
    console.log('[runAIAnalysis] betTypes:', betTypes);
    
    // パドック評価の取得（チェックされた馬番）
    const paddockHorses = Array.from(document.querySelectorAll('input[name="paddockEval"]:checked')).map(cb => parseInt(cb.value));

    try {
        // オッズデータが読み込まれていない場合は読み込む
        if (!currentOddsData) {
            const raceId = selectedRace.race_number;
            currentOddsData = await window.loadOddsData(raceId);
        }

        // プロンプト作成（パドック情報を含む）
        const prompt = createPrompt(selectedRace, currentOddsData, { budget, minReturn, targetReturn, betTypes, paddockHorses });

        console.log('[AI Analysis] Calling Gemini API directly...');
        console.log('[AI Analysis] Model:', selectedModel);
        console.log('[AI Analysis] Prompt length:', prompt.length);
        console.log('=' .repeat(80));
        console.log('[AI Analysis] Full Prompt:');
        console.log(prompt);
        console.log('='.repeat(80));

        // オンライン状態を確認
        if (!navigator.onLine) {
            throw new Error('オフライン状態です。インターネット接続を確認してください。');
        }

        // 503エラーの自動リトライ（指数バックオフ）
        let response;
        let retryCount = 0;
        const maxRetries = 3;  // 3回リトライ
        
        while (retryCount <= maxRetries) {
            try {
                // AbortControllerでタイムアウト制御（120秒）
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000);
                
                try {
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: prompt
                                }]
                            }]
                        }),
                        signal: controller.signal,
                        cache: 'no-store'
                    });
                } finally {
                    clearTimeout(timeoutId);
                }
        
                console.log('[AI Analysis] Response status:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('[AI Analysis] Error response:', errorData);
                    
                    // 429エラー（レート制限）の場合はリトライ
                    if (response.status === 429 && retryCount < maxRetries) {
                        retryCount++;
                        const waitTime = Math.pow(2, retryCount) * 1000; // 指数バックオフ: 2s, 4s, 8s
                        console.log(`[AI Analysis] 429 Rate Limit. Retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
                        aiResultDiv.innerHTML = `<div class="loading-spinner"></div><div>API利用制限に達しました。待機中... (リトライ ${retryCount}/${maxRetries})</div>`;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue; // ループを続ける
                    }
                    
                    // 503エラーの場合はリトライ
                    if (response.status === 503 && retryCount < maxRetries) {
                        retryCount++;
                        const waitTime = Math.pow(2, retryCount) * 1000; // 指数バックオフ: 2s, 4s, 8s
                        console.log(`[AI Analysis] 503 error. Retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
                        aiResultDiv.innerHTML = `<div class="loading-spinner"></div><div>AIが分析中です... (リトライ ${retryCount}/${maxRetries})</div>`;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue; // ループを続ける
                    }
                    
                    // 503エラーが3回続いた場合、OpenAI APIキーがあればGPT-4o-miniにフォールバック
                    if (response.status === 503 && retryCount >= maxRetries) {
                        if (getOpenAIApiKey()) {
                            console.log('[AI Analysis] Gemini failed after 3 retries. Switching to GPT-4o-mini...');
                            aiResultDiv.innerHTML = '<div class="loading-spinner"></div><div>Geminiが混雑しています。GPT-4o-miniに切り替え中...</div>';
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            return runAIAnalysisWithOpenAI('gpt-4o-mini');
                        } else {
                            console.log('[AI Analysis] Gemini failed after 3 retries. No OpenAI API key available.');
                            throw new Error('Gemini APIが混雑しています。時間を空けて再試行してください。');
                        }
                    }
                    
                    throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
                }
                
                // 成功したらループを抜ける
                break;
                
            } catch (fetchError) {
                // タイムアウトエラーの場合
                if (fetchError.name === 'AbortError') {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        const waitTime = Math.pow(2, retryCount) * 1000;
                        console.log(`[AI Analysis] Timeout. Retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
                        aiResultDiv.innerHTML = `<div class="loading-spinner"></div><div>リクエストがタイムアウトしました。再試行中... (リトライ ${retryCount}/${maxRetries})</div>`;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    throw new Error('リクエストがタイムアウトしました。再試行してください。');
                }
                
                // ネットワークエラーなどの場合もリトライ
                if (retryCount < maxRetries) {
                    retryCount++;
                    const waitTime = Math.pow(2, retryCount) * 1000;
                    console.log(`[AI Analysis] Network error. Retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
                    aiResultDiv.innerHTML = `<div class="loading-spinner"></div><div>AIが分析中です... (リトライ ${retryCount}/${maxRetries})</div>`;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                throw fetchError;
            }
        }

        const result = await response.json();
        console.log('[AI Analysis] Success');

        // レスポンスからテキストを抽出
        const analysisText = result.candidates[0].content.parts[0].text;

        // marked.jsを使ってMarkdownをHTMLに変換
        aiResultDiv.innerHTML = marked.parse(analysisText);
        
        // localStorageに保存
        saveAIAnalysisResult(selectedRace.race_number, {
            timestamp: Date.now(),
            result: analysisText,
            model: selectedModel,
            params: { budget, minReturn, targetReturn, betTypes, paddockHorses }
        });
        
        // AI分析完了通知を送信
        if (typeof window.notifyAIAnalysisComplete === 'function') {
            const raceName = `${selectedRace.place}${selectedRace.round}R ${selectedRace.race_name || ''}`;
            window.notifyAIAnalysisComplete({
                raceName: raceName,
                raceId: selectedRace.race_number
            });
        }

    } catch (error) {
        console.error('[AI Analysis] Error:', error);
        const errorMessage = getErrorMessage(error);
        aiResultDiv.innerHTML = `<div class="error">⚠️ ${errorMessage}</div>`;
    }
}

/**
 * プロンプトを作成（改善版・禁止事項を明記）
 */
function createPrompt(raceData, oddsData, userParams) {
    const {
        budget,
        betTypes,
        minReturn,
        targetReturn,
        paddockHorses
    } = userParams;

    return `あなたは競馬予想AIで馬券構築のプロ、名前はUmaAiです。以下のデータを分析して、馬券購入の推奨を提供してください。

## レース情報
- **レース名**: ${raceData.race_name}
- **開催場所**: ${raceData.place}
- **距離**: ${raceData.surface}${raceData.distance}m
- **馬場状態**: ${raceData.condition}
- **出走頭数**: ${raceData.horses.length}頭

## 出走馬データ
${formatHorsesData(raceData.horses)}

## オッズデータ
${formatSelectedOddsData(oddsData, betTypes)}

## ユーザー条件
- **予算**: ${budget}円
- **購入方式**: ${betTypes.join(', ')}
- **下限回収率**: ${minReturn}%
- **目標回収率**: ${targetReturn}%
${paddockHorses && paddockHorses.length > 0 ? `
## 🐴 パドック評価（ユーザーが現地で確認）
以下の馬はパドックで調子が良いとユーザーが判断しました：
**${paddockHorses.map(h => `${h}番`).join(', ')}**

**パドック評価の活用方法**:
- パドックで調子が良い馬は、指数が中位でも穴馬候補として考慮する
- 指数が高くパドックも良い馬は、本命候補として優先する
- パドック情報は当日の馬体状態を反映しているため、馬券に重視して含めること
` : ''}

## 分析の中核原則

### 1. LightGBMモデルの理解と活用

#### モデルの特性
- **AUC 0.78-0.80**の精度を持つ予測モデル
- AIスコアは相対的評価値（**確率ではない**）
- **順位 > スコアの絶対値**で判断すること

#### 特徴量の重要度（参考程度に）
**勝率モデル（単勝）**:
1. **final_score** - 最重要（既存の総合指数）
2. **zi_deviation** - 重要（前走の能力偏差値）
3. **base_score** - 重要（基礎スコア）
4. **mining_index** - やや重要

**連対率モデル**:
1. **base_score** - 最重要
2. **final_score** - 重要
3. **zi_deviation** - やや重要

**複勝率モデル**:
1. **final_score** - 最重要
2. **base_score** - 重要
3. **mining_index** - やや重要

特徴量の確認
- **final_score**：総合力の指標（モデルが最重視）
- **base_score**：係数処理前の馬基礎スコア（連対率・複勝率で重要）
- **zi_deviation**：前走能力（単勝で重要）
- **mining_index**：マイニングによる偏差値指数（穴馬でもこの数字が高いと可能性は上がる傾向）

#### AIモデルの評価基準について

**重要な考え方**:
- LightGBMモデルから算出した指数が評価する1位は、人気とは無関係に指数から比較したAI順位で決まる
- AI順位1位の馬が下位人気でも、それはAIにとっての「本命」である
- 「波乱」という概念は使わず、「AI評価と人気の乖離」として扱う
- 乖離が大きい馬は「妙味がある」「オッズバリューがある」と表現する

#### 券種別の最適な予想順位の使い分け（前日結果データに基づく）

**重要**: 券種によって、参照すべき予想順位が異なります。

**単勝を買う場合**:
- **単勝予想順位**を最優先（1位の1着率26.7%）
- AI単勝順位1位を軸にする
- 連対予想2位は単勝予想1位に匹敵する1着率(要注意）

**馬連・馬単を買う場合**:
- **連対予想順位**を重視（2位の1着率26.7%と非常に高い）
- AI連対順位1-2位を中心に組み立てる
- 連対予想2位は単勝予想1位に匹敵する1着率

**ワイド・3連複を買う場合**:
- **複勝予想順位**を重視（1-3位の複勝圏内率52.2%で最高）
- AI複勝順位1-3位を中心に組み立てる
- 複勝予想1位の複勝圏内率は66.7%で最も高い
- 紐は複勝スコアを見ながら検討

**複勝を買う場合**:
- **複勝予想順位**を最優先（1位の複勝圏内率66.7%）
- 複勝スコア0.5以上（サイト表示50以上）から選択可能

**馬券構築の実践**:
- 単勝・馬単を含む場合: 単勝予想順位と連対予想順位を併用
- ワイド・3連複を含む場合: 複勝予想順位を重視
- 馬連を含む場合: 連対予想順位も重視
- **複数の予想順位を総合的に判断し、券種に応じて最適な順位を使い分けること**

#### 複勝スコアの閾値と活用方法（実績データに基づく）

**複勝スコアの重要性**:
- 複勝スコアは、複勝圏内（1-3着）に入る能力を示す指標
- **単勝スコアが低くても、複勝スコアが高ければ複勝圏内に入る可能性がある**

**複勝スコアの閾値**:
- **0.8以上（サイト表示80以上）**: 複勝圏内率66.7% - 非常に信頼できる軸候補
- **0.7以上（サイト表示70以上）**: 複勝圏内率51.2% - 軸候補として有効
- **0.5以上（サイト表示50以上）**: 複勝圏内率20.0% - 相手・ヒモ候補として有効
- **0.5未満（サイト表示50未満）**: 複勝圏内率20.0%未満 - 0.48（サイト表示48）未満は馬券に含めにくい

**活用方法**:
- **複勝、ワイド、3連複の相手・ヒモを選ぶ際**: 複勝スコア0.5以上（50以上）を基準にする
- **単勝予想順位が低くても、複勝スコアが0.5以上なら**: 複勝、ワイド、3連複の相手・ヒモ候補として検討
- **複勝スコア0.7以上（70以上）**: 複勝、ワイド、3連複の軸候補として積極採用

**注意**: サイト表示の複勝スコアは、実際のスコア×10で表示されています（例: 実際0.5 → サイト表示50）

### 2. 分析の優先順位（これを必ず守る）

**第1優先: AI順位の確認（券種に応じて使い分ける）**
- **単勝・馬単を含む場合**: AI単勝順位を最優先、AI連対順位も重視
- **馬連を含む場合**: AI連対順位を最優先
- **ワイド・3連複を含む場合**: AI複勝順位を最優先
- **複勝を含む場合**: AI複勝順位を最優先
- 複数の順位で上位 = 信頼度が高い
- **AI順位1-5位程度を馬券の中心にする**
- **複勝スコア0.5以上（50以上）**: 単勝順位が低くても、複勝・ワイド・3連複の相手・ヒモ候補として検討

**第2優先: 人気との乖離分析**
- オッズから人気順位を算出
- **AI順位 < 人気順位** = 妙味あり（積極採用）
- **AI順位 > 人気順位** = 過剰人気（警戒）

**第3優先: パドック評価の反映**
- パドック評価馬は優先的に馬券に組み込む
- AI中位でもパドック良好なら穴馬候補

### 3. 馬の分類（レース全体を把握する）

**本命群**: AI上位＋人気上位（堅実）
- AI順位1-3位で人気も上位の馬
- 的中率は高いが、回収率は標準的

**妙味群**: AI上位＋人気下位（狙い目）
- AI順位1-5位で人気が低い馬
- オッズバリューがあり、回収率向上に寄与
- **積極的に採用すべき馬**

**警戒群**: AI下位＋人気上位（危険）
- AI順位6位以降なのに人気がある馬
- 過剰人気で強気は避けるべき

**消去群**: AI下位＋人気下位（弱気）
- AI順位6位以降で人気もない馬
- 何か特徴がある場合でやっと紐になる

### 4. 回収率の考え方

**回収率の定義**
- 回収率(%) = (的中時の払戻金 ÷ 購入金額) × 100


**基本理念**
- 回収率は長期的視点で評価する指標
- 1レースで無理に達成する必要はない
- 下限を維持しつつ妙味のある馬を選んだ結果として自然に決まる

**重要な回収率の考え方**:
- **下限回収率${minReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値を下回らないこと
- **目標回収率${targetReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値に近づくように馬券を選定すること
- 個別の馬券ではなく、**推奨する全馬券の資金配分を考慮した合計期待回収率**で判断する
- **無理に能力のない穴馬を突っ込んで見せかけの回収率を作らないこと**

### 5. 馬券構築の戦略

**多軸展開**
- **AI順位上位の馬（1-5位程度）**から複数の軸を設定
- 本命一辺倒を避け、リスク分散
- 本命（AI1位）を含む馬券と、本命を含まない馬券をバランスよく配分

**相関関係の活用**
- 同じ組み合わせで複数券種を購入（例：馬連＋馬単＋ワイド）
- 同時的中により回収率を最大化
- **相関関係のある馬券を優先的に選定すること**

**相関関係の具体例**:
1. **馬連 + 馬単（両方向）+ ワイド**: 同じ2頭の組み合わせ
2. **3連複 + ワイド（3通り）**: 同じ3頭の組み合わせ
3. **3連複 + 複勝（3頭）**: 同じ3頭の組み合わせ
4. **馬単 + 単勝**: 軸馬が1着なら両方的中
5. **馬連 + ワイド**: 同じ2頭の組み合わせ
6. **複勝（複数頭）**: 複数頭購入で複数的中の可能性（オッズは一番低い）
7. **3連単**：複合は多数あるが、順番指定のため点数が必要（オッズは一番高い）

## 馬券構築の思考プロセス（重要：軸飛び対策を最優先）

### 1. 多軸展開の設計
- **AI順位上位の馬（1-5位程度）**から、複数の軸候補を選定
- 本命（AI1位）を軸にした馬券
- AI2-3位を軸にした馬券
- AI評価と人気の乖離が大きい馬（妙味群）を軸にした馬券
- **重要**: 本命だけに偏らず、複数の軸から馬券を構築する

### 2. 相関関係の活用
- 同じ組み合わせで複数券種を購入し、同時的中時の回収率を最大化
- 例: 10-5の組み合わせで「馬連」「馬単（両方向）」「ワイド」を購入
- 例: 10-5-18の組み合わせで「3連複」「ワイド（3通り）」「複勝（3頭）」を購入
- **相関関係のある馬券を優先的に選定すること**

### 3. 相手馬の選定
- 軸馬との相性（展開予想）
- オッズバリューの有無（AI評価と人気の乖離）
- 特徴量の補完関係
- パドック評価馬を積極的に絡める

### 4. 買い目の最適化
- 的中率と配当のバランス
- 予算内での効率的な資金配分
- トリガミ回避の意識
- **相関関係のある馬券を優先**
- 妙味のある馬券（AI評価とオッズの乖離が大きい）に厚く配分
- 妙味のない馬券（AI評価も人気も同じくらいでオッズが低い）は薄く配分
- **単体オッズの妙味はなくてもある程度かたい場合厚く配分して回収率を伸ばす選択もある**

### 5. 軸飛び対策（必須）
- **本命が飛んだ場合でも回収できる馬券を必ず含める**
- 本命を含まない組み合わせ（例: AI2位×AI4位）も積極的に購入
- 複数の軸から馬券を構築することで、どの馬が来ても回収できる構成にする

## ⚠️ 重要：絶対にしてはいけないこと

### 禁止事項1: AIスコアを確率として扱うこと
- **AI単勝スコア、AI連対スコア、AI複勝スコア**は確率ではありません
- これらは機械学習モデルの正規化された出力値であり、相対的な評価値です
- **絶対に「AI単勝スコア × AI連対スコア」のような掛け算をしないこと**
- **絶対に「AI単勝スコア = 勝つ確率」と解釈しないこと**

### 禁止事項2: AIスコアの数値を過信すること
- AIスコアの絶対値に意味はありません
- 重要なのは**AI順位**（1位が最有力、2位が次点、など）
- AUCスコア0.78-0.80のモデルなので、完璧ではありません

### 禁止事項3: AI順位6位以降を軸にすること
- **AI順位1-5位程度を馬券の中心にする**
- AI順位6位以降は複勝圏内率が低い（実績データで裏付けられている）
- 相手やヒモとして使うのは可だが、軸にはしない

### 禁止事項4: 回収率を無理に達成しようとすること
- 目標回収率に合わせるために、穴馬を無理に突っ込まないこと
- 妙味のある馬券を選定した結果として、自然に回収率が決まる
- AI評価が低い馬を、回収率のためだけに採用しないこと

## 出力形式

### 📊 レース総評

#### レースレベル評価
- **AI評価と人気の乖離度**: ★☆☆☆☆（一致）～ ★★★★★（大きく乖離）
  - AI上位馬と人気上位馬の一致度から判定
  - 乖離が大きいほど、AI評価に基づく妙味のある馬券が構築できる
- **レースの質**: 高い/標準/低い
  - 上位馬の最終スコアの絶対値から判定

#### 展開予想
- AI順位と各指標から予想される展開
- 注目すべきポイント
- リスク要因

#### 狙い目分析
- AI順位と人気順位の乖離が大きい馬（オッズバリューあり）
- 特徴量が優秀なのに人気がない馬
- 危険な人気馬（AI評価が低いのに人気先行）

### 🐴 馬印

各馬にAI評価と人気を併記：
- ◎ ○番 馬名（AI単勝○位/人気○番人気）
- ○ ○番 馬名（AI単勝○位/人気○番人気）
- ▲ ○番 馬名（AI単勝○位/人気○番人気）
- △ ○番 馬名（AI連対○位/人気○番人気）
- ☆ ○番 馬名（AI複勝○位/人気○番人気）
- 注 ○番 馬名（AI複勝○位/人気○番人気）
※△以下は複数馬指定可能（全馬指定するレベルの印は不要）

### 🐴 全馬総評

**出走馬全頭について、以下の形式で簡潔に評価してください**：

#### 評価形式
各馬について、1～2行で記載：

**○番 馬名（AI単勝○位/人気○番人気）**
- **評価**: ◎本命 / ○対抗 / ▲単穴 / △連下 / ☆穴 / 注意 / 消し
- **総評**: AI順位と人気の関係、最終スコア、特徴量の特徴を踏まえた簡潔な評価
- **推奨**: 軸候補 / 相手候補 / ヒモ候補 / 消し

#### 評価基準
- **◎本命**: AI順位・人気・指数が全て上位で信頼度が高い
- **○対抗**: 本命に次ぐ評価、AI順位または指数が優秀
- **▲単穴**: AI順位は高いが人気がない（妙味あり）
- **△連下**: 2～3着候補、指数は中位だが安定性あり
- **☆穴**: AI順位と人気の乖離が大きい、一発の可能性
- **注意**: 指数は低いが、パドックや特殊条件で注目
- **消し**: 全ての指数が低く、馬券に含めない

#### 重要な注意事項
- **全頭について必ず評価すること**（出走頭数分）
- AI順位と人気の乖離を必ず指摘すること
- 消し馬も理由を明記すること
- パドック評価がある馬は必ず言及すること

### 🎯 推奨馬券（多軸展開 + 相関関係重視）

**各馬券について、以下の情報を記載**:

| 馬券種別 | 組み合わせ | オッズ | 購入金額 | 的中時払戻 |
|---------|-----------|--------|----------|------------|
| ○○ | ○-○-○ | ○○倍 | ○○円 | ○○円 |

**選定理由**: 
- **AI評価**: ○番はAI○位、○番はAI○位
- **人気**: ○番は○番人気、○番は○番人気
- **妙味**: AI評価と人気の乖離が○○（ある/ない）
- **相関関係**: ○○と同時的中の可能性（具体的に記載）
- **軸馬**: ○番を軸にした馬券
- **軸飛び対策**: 本命を含まない組み合わせの場合は明記

**推奨馬券の構成指針**:
- 本命（AI1位）を含む馬券と、本命を含まない馬券をバランスよく配分
- 相関関係のある馬券を優先的に購入
- 妙味のある馬券（AI評価と人気の乖離が大きい）に厚く配分
- 妙味のない馬券（AI評価と人気が一致）は薄く配分
- 無理に穴馬を突っ込まず、AI評価に基づいて自然に構築

### 💰 資金配分サマリー

| 軸馬 | 金額 | 比率 | 最大払戻（単体） | 最大払戻（相関） | 想定回収率 |
|------|------|------|-----------------|-----------------|------------|
| ○番を軸 | ○○円 | ○○% | ○○円 | ○○円 | ○○% |
| ○番を軸 | ○○円 | ○○% | ○○円 | ○○円 | ○○% |
| ○番を軸 | ○○円 | ○○% | ○○円 | ○○円 | ○○% |
| **合計** | **${budget}円** | **100%** | - | - | **○○%** |

**相関関係による回収率向上**:
- ○番を軸にした組み合わせが的中し、相関する馬券が全て的中した場合: 払戻○○円（回収率○○%）
- ○番を軸にした組み合わせが的中し、相関する馬券が全て的中した場合: 払戻○○円（回収率○○%）

**軸飛び対策の効果**:
- 本命（AI1位）が飛んだ場合でも、他の軸が的中すれば回収率○○%以上を確保
- 下限回収率${minReturn}%を下回らない構成

### 🔍 データ分析詳細

#### AI順位と人気の乖離TOP3
1. ○番馬：AI単勝○位だが○番人気（乖離+○）- オッズバリューあり
2. ○番馬：AI連対○位だが○番人気（乖離+○）- オッズバリューあり
3. ○番馬：AI複勝○位だが○番人気（乖離+○）- オッズバリューあり

#### 特徴量による隠れた実力馬
- 最終スコアが高い割に人気がない：○番、○番
- マイニング指数が優秀：○番、○番
- ZI指数が高い：○番、○番

#### 危険な人気馬
- AI順位は低いが人気先行：○番、○番

### ⚠️ 注意事項
- オッズは変動する可能性があります
- AI予測の限界を理解した上で参考にしてください
- 最終的な購入判断は自己責任でお願いします

---

## 必須制約
- **予算**: ${budget}円を使い切る
- **購入単位**: 1馬券あたり100円単位（最小100円）
- **回収率**: 全体の想定回収率が下限${minReturn}%を下回らないこと、目標回収率${targetReturn}%も可能な限り近づけること
- **戦略**: 多軸展開で本命偏重を避ける、相関関係を活用する、AI順位1-5位を中心にする（広げて買う選択もありなので縛りすぎない）
- 現実的で実行可能な馬券を推奨すること

##　分析の自由度
- AIは提供されたデータから自由に分析・判断してよい
- 狙うオッズ帯や相手馬は固定せず、データに基づいて決定
- ユーザーの目標に最適な組み合わせを考案すること
`;
}

/**
 * 出走馬データをフォーマット（gemini.jsと同じロジック）
 */
function formatHorsesData(horses) {
    // 表形式で見やすく整理（AIスコアとランクを追加）
    let formatted = '\n| 順位 | 馬番 | 馬名 | 最終スコア | AI単勝スコア | AI単順位 | AI連対スコア | AI連順位 | AI複勝スコア | AI複順位 | マイニング指数 | 戦績マイニング | ZI指数 | 補正タイム偏差値 | 類似係数 | 安定係数 | 騎手名 | 騎手勝率 | 調教師名 | 調教師勝率 | 出走間隔 | 前走着順 |\n';
    formatted += '|------|------|------|------------|------------|----------|------------|----------|------------|----------|----------------|----------------|--------|----------------|----------|----------|--------|----------|----------|------------|----------|----------|\n';

    horses.forEach((horse, index) => {
        const pastRace = horse.past_races && horse.past_races.length > 0 ? horse.past_races[0] : null;
        
        // AIスコアとランクを取得
        const winScore = horse.predictions ? horse.predictions.win_rate.toFixed(4) : '-';
        const winRank = horse.predictions ? horse.predictions.win_rate_rank : '-';
        const placeScore = horse.predictions ? horse.predictions.place_rate.toFixed(4) : '-';
        const placeRank = horse.predictions ? horse.predictions.place_rate_rank : '-';
        const showScore = horse.predictions ? horse.predictions.show_rate.toFixed(4) : '-';
        const showRank = horse.predictions ? horse.predictions.show_rate_rank : '-';
        
        formatted += `| ${index + 1} | ${horse.horse_number} | ${horse.horse_name} | `;
        formatted += `${horse.indices.final_score.toFixed(2)} | `;
        formatted += `**${winScore}** | ${winRank} | `;  // AI単勝スコアとランク
        formatted += `**${placeScore}** | ${placeRank} | `;  // AI連対スコアとランク
        formatted += `**${showScore}** | ${showRank} | `;  // AI複勝スコアとランク
        formatted += `${horse.indices.mining_index.toFixed(1)} | `;
        formatted += `**${horse.battle_mining.toFixed(1)}** | `;  // 戦績マイニングを強調
        formatted += `${horse.zi_index.toFixed(1)} | `;
        formatted += `**${horse.indices.corrected_time_deviation ? horse.indices.corrected_time_deviation.toFixed(1) : '-'}** | `;  // 補正タイム偏差値を強調
        formatted += `${horse.indices.similarity_coefficient.toFixed(5)} | `;  // 小数点第5位まで
        formatted += `${horse.indices.stability_coefficient.toFixed(5)} | `;   // 小数点第5位まで
        formatted += `${horse.jockey.name} | `;
        formatted += `${horse.jockey.this_year.win_rate.toFixed(1)}% | `;
        formatted += `${horse.trainer.name} | `;
        formatted += `${horse.trainer.this_year.win_rate.toFixed(1)}% | `;
        formatted += `${horse.interval}週 | `;
        formatted += `${pastRace ? pastRace.rank + '着' : '-'} |\n`;
    });

    // 詳細情報（上位5頭のみ）
    formatted += '\n### 上位5頭の詳細分析\n\n';
    
    horses.slice(0, 5).forEach((horse, index) => {
        // AIスコアとランクを取得
        const winScore = horse.predictions ? horse.predictions.win_rate.toFixed(4) : '-';
        const winRank = horse.predictions ? horse.predictions.win_rate_rank : '-';
        const placeScore = horse.predictions ? horse.predictions.place_rate.toFixed(4) : '-';
        const placeRank = horse.predictions ? horse.predictions.place_rate_rank : '-';
        const showScore = horse.predictions ? horse.predictions.show_rate.toFixed(4) : '-';
        const showRank = horse.predictions ? horse.predictions.show_rate_rank : '-';
        
        formatted += `#### ${index + 1}位: ${horse.horse_number}番 ${horse.horse_name}\n`;
        formatted += `- **最終スコア**: ${horse.indices.final_score.toFixed(2)}\n`;
        formatted += `- **AI単勝スコア**: **${winScore}** (順位: ${winRank})（LightGBM正規化スコア、確率ではない）\n`;
        formatted += `- **AI連対スコア**: **${placeScore}** (順位: ${placeRank})（LightGBM正規化スコア、確率ではない）\n`;
        formatted += `- **AI複勝スコア**: **${showScore}** (順位: ${showRank})（LightGBM正規化スコア、確率ではない）\n`;
        formatted += `- **マイニング指数**: ${horse.indices.mining_index.toFixed(1)}\n`;
        formatted += `- **戦績マイニング**: **${horse.battle_mining.toFixed(1)}**（重視）\n`;
        formatted += `- **ZI指数**: ${horse.zi_index.toFixed(1)}（標準的な指標）\n`;
        formatted += `- **補正タイム偏差値**: **${horse.indices.corrected_time_deviation ? horse.indices.corrected_time_deviation.toFixed(1) : '-'}**（重要指標）\n`;
        formatted += `- **類似係数**: ${horse.indices.similarity_coefficient.toFixed(5)}（1.0が標準、${horse.indices.similarity_coefficient >= 1.0 ? '好材料' : '注意'}）\n`;
        formatted += `- **安定係数**: ${horse.indices.stability_coefficient.toFixed(5)}（1.0が標準、${horse.indices.stability_coefficient >= 1.0 ? '安定' : '不安定'}）\n`;
        formatted += `- **騎手**: ${horse.jockey.name} (${horse.jockey.weight}kg) - 勝率${horse.jockey.this_year.win_rate.toFixed(1)}%（参考）\n`;
        formatted += `- **調教師**: ${horse.trainer.name} (${horse.trainer.affiliation}) - 勝率${horse.trainer.this_year.win_rate.toFixed(1)}%（参考）\n`;
        formatted += `- **出走間隔**: ${horse.interval}週（あまり気にしない）\n`;
        
        // 過去3走の成績
        if (horse.past_races && horse.past_races.length > 0) {
            formatted += `- **過去3走**:\n`;
            horse.past_races.slice(0, 3).forEach((race, raceIndex) => {
                formatted += `  ${raceIndex + 1}. ${race.date} ${race.place} ${race.surface}${race.distance}m (${race.track_condition}) - ${race.rank}着\n`;
            });
        }
        formatted += '\n';
    });

    return formatted;
}

/**
 * オッズデータをフォーマット（gemini.jsと同じロジック）
 */
function formatOddsData(oddsData) {
    let formatted = '';

    oddsData.forEach(odds => {
        formatted += `\n### ${odds.odds_type_name}\n`;

        switch (odds.odds_type) {
            case 'tfw':
                // 単勝（全頭）
                formatted += '\n#### 単勝\n';
                formatted += '| 馬番 | 馬名 | オッズ |\n';
                formatted += '|------|------|--------|\n';
                odds.data.tansho.forEach(item => {
                    formatted += `| ${item.horse_num} | ${item.horse_name} | ${item.odds} |\n`;
                });

                // 複勝（全頭）
                formatted += '\n#### 複勝\n';
                formatted += '| 馬番 | 馬名 | オッズ |\n';
                formatted += '|------|------|--------|\n';
                odds.data.fukusho.forEach(item => {
                    formatted += `| ${item.horse_num} | ${item.horse_name} | ${item.odds.min} - ${item.odds.max} |\n`;
                });
                break;

            default:
                // その他の券種（枠連、馬連、ワイド、馬単、3連複、3連単）
                formatted += '\n| 組み合わせ | オッズ |\n';
                formatted += '|------------|--------|\n';
                
                // 全件表示（Geminiが正確な馬券推奨をできるように）
                odds.data.combinations.forEach(c => {
                    const oddsValue = (typeof c.odds === 'object') ? `${c.odds.min} - ${c.odds.max}` : c.odds;
                    formatted += `| ${c.combination} | ${oddsValue} |\n`;
                });
                break;
        }
    });

    return formatted;
}

/**
 * 選択された馬券種のオッズデータのみをフォーマット（プロンプトサイズ削減）
 * @param {Array} oddsData - 全オッズデータ
 * @param {Array} betTypes - 選択された馬券種（例: ['馬単', '馬連', '3連複']）
 */
function formatSelectedOddsData(oddsData, betTypes) {
    let formatted = '';

    // 馬券種名とodds_typeのマッピング（yahoo_odds_scheduler.pyの値と一致）
    const betTypeMap = {
        '単勝': 'tfw',
        '複勝': 'tfw',
        '枠連': 'wakuren',
        '馬連': 'umaren',
        'ワイド': 'wide',
        '馬単': 'umatan',
        '3連複': 'sanrenpuku',
        '3連単': 'sanrentan'
    };

    // 選択された馬券種のodds_typeを取得
    const selectedOddsTypes = betTypes.map(bt => betTypeMap[bt]).filter(Boolean);

    // 単勝・複勝は常に含める（基本情報として）
    if (!selectedOddsTypes.includes('tfw')) {
        selectedOddsTypes.unshift('tfw');
    }
    
    console.log('[formatSelectedOddsData] betTypes:', betTypes);
    console.log('[formatSelectedOddsData] selectedOddsTypes:', selectedOddsTypes);

    oddsData.forEach(odds => {
        console.log('[formatSelectedOddsData] Processing odds_type:', odds.odds_type, 'odds_type_name:', odds.odds_type_name);
        // 選択された馬券種のみ出力
        if (!selectedOddsTypes.includes(odds.odds_type)) {
            console.log('[formatSelectedOddsData] Skipping odds_type:', odds.odds_type);
            return;
        }
        console.log('[formatSelectedOddsData] Including odds_type:', odds.odds_type);

        formatted += `\n### ${odds.odds_type_name}\n`;

        switch (odds.odds_type) {
            case 'tfw':
                // 単勝（全頭）
                formatted += '\n#### 単勝\n';
                formatted += '| 馬番 | 馬名 | オッズ |\n';
                formatted += '|------|------|--------|\n';
                odds.data.tansho.forEach(item => {
                    formatted += `| ${item.horse_num} | ${item.horse_name} | ${item.odds} |\n`;
                });

                // 複勝（全頭）
                formatted += '\n#### 複勝\n';
                formatted += '| 馬番 | 馬名 | オッズ |\n';
                formatted += '|------|------|--------|\n';
                odds.data.fukusho.forEach(item => {
                    formatted += `| ${item.horse_num} | ${item.horse_name} | ${item.odds.min} - ${item.odds.max} |\n`;
                });
                break;

            default:
                // その他の券種（枚連、馬連、ワイド、馬単、3連複、3連単）
                formatted += '\n| 組み合わせ | オッズ |\n';
                formatted += '|------------|--------|\n';
                
                // 全件表示（Geminiが正確な馬券推奨をできるように）
                odds.data.combinations.forEach(c => {
                    const oddsValue = (typeof c.odds === 'object') ? `${c.odds.min} - ${c.odds.max}` : c.odds;
                    formatted += `| ${c.combination} | ${oddsValue} |\n`;
                });
                break;
        }
    });

    return formatted;
}

// ====================
// OpenAI API関連
// ====================

/**
 * OpenAI APIキーを保存
 */
function saveOpenAIKey() {
    const apiKeyInput = document.getElementById('openaiApiKey');
    if (!apiKeyInput) return;
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('APIキーを入力してください');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        alert('OpenAI APIキーは "sk-" で始まる必要があります');
        return;
    }
    
    localStorage.setItem('openai_api_key', apiKey);
    window.OPENAI_API_KEY = apiKey;
    alert('OpenAI APIキーを保存しました');
}

/**
 * OpenAI APIを呼び出し
 */
async function callOpenAI(model, prompt) {
    // APIキーを最新の状態で取得
    const apiKey = getOpenAIApiKey();
    
    if (!apiKey) {
        throw new Error('OpenAI APIキーが設定されていません。API設定から設定してください。');
    }
    
    console.log(`[OpenAI] API Key found: ${apiKey.substring(0, 10)}...`);
    
    console.log(`[OpenAI] Calling ${model}...`);
    console.log(`[OpenAI] Prompt length: ${prompt.length}`);
    
    // リクエストボディの構築
    const requestBody = {
        model: model,
        messages: [
            {
                role: 'system',
                content: 'あなたは競馬予想の専門家です。データを分析して、的確な馬券推奨を行ってください。'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_completion_tokens: model.includes('gpt-5') ? 16000 : 4000  // GPT-5は16000トークン
    };
    
    // GPT-5-nano以外のモデルのみにtemperatureを設定
    if (!model.includes('gpt-5')) {
        requestBody.temperature = 0.7;
    }
    
    // AbortControllerでタイムアウト制御（120秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    let response;
    try {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    console.log('[OpenAI] Success');
    console.log('[OpenAI] Response:', result);
    
    // レスポンスの構造を確認
    if (!result.choices || result.choices.length === 0) {
        console.error('[OpenAI] Invalid response structure:', result);
        throw new Error('OpenAI APIからのレスポンスが無効です。');
    }
    
    const content = result.choices[0].message?.content;
    if (!content) {
        console.error('[OpenAI] No content in response:', result.choices[0]);
        throw new Error('OpenAI APIからのレスポンスにコンテンツがありません。');
    }
    
    console.log('[OpenAI] Content length:', content.length);
    return content;
}

/**
 * AI分析を実行（OpenAI版）
 */
async function runAIAnalysisWithOpenAI(model) {
    const aiResultDiv = document.getElementById('aiResult');
    aiResultDiv.innerHTML = '<div class="loading-spinner"></div><div>AIが分析中です...</div>';
    
    // OpenAI APIキーの確認
    if (!getOpenAIApiKey()) {
        aiResultDiv.innerHTML = '<div class="error">OpenAI APIキーを設定してください。<br>AIモデル選択でGPT-5-nanoまたはGPT-4o-miniを選ぶと、APIキー入力欄が表示されます。</div>';
        return;
    }
    
    // 選択されたレースの確認
    if (!selectedRace) {
        aiResultDiv.innerHTML = '<div class="error">レースを選択してください。</div>';
        return;
    }
    
    // ユーザーパラメータの取得
    const budgetEl = document.getElementById('aiBudget');
    const minReturnEl = document.getElementById('aiMinReturn');
    const targetReturnEl = document.getElementById('aiTargetReturn');
    
    if (!budgetEl || !minReturnEl || !targetReturnEl) {
        aiResultDiv.innerHTML = '<div class="error">エラー: AI分析フォームが見つかりません。ページをリロードしてください。</div>';
        console.error('[OpenAI] Form elements not found:', { budgetEl, minReturnEl, targetReturnEl });
        return;
    }
    
    const budget = parseInt(budgetEl.value) || 1000;
    const minReturn = parseFloat(minReturnEl.value) || 1.5;
    const targetReturn = parseFloat(targetReturnEl.value) || 10.0;
    const betTypes = Array.from(document.querySelectorAll('input[name="betType"]:checked')).map(cb => cb.value);
    const paddockHorses = Array.from(document.querySelectorAll('input[name="paddockEval"]:checked')).map(cb => parseInt(cb.value));
    
    try {
        // オッズデータが読み込まれていない場合は読み込む
        if (!currentOddsData) {
            const raceId = selectedRace.race_number;
            currentOddsData = await window.loadOddsData(raceId);
        }
        
        // プロンプト作成
        const prompt = createPrompt(selectedRace, currentOddsData, { budget, minReturn, targetReturn, betTypes, paddockHorses });
        
        console.log('[OpenAI] Calling OpenAI API...');
        console.log('[OpenAI] Model:', model);
        console.log('[OpenAI] Prompt length:', prompt.length);
        console.log('='.repeat(80));
        console.log('[OpenAI] Full Prompt:');
        console.log(prompt);
        console.log('='.repeat(80));
        
        // OpenAI APIを呼び出し
        const analysisText = await callOpenAI(model, prompt);
        
        // marked.jsを使ってMarkdownをHTMLに変換
        aiResultDiv.innerHTML = marked.parse(analysisText);
        
        // localStorageに保存
        saveAIAnalysisResult(selectedRace.race_number, {
            timestamp: Date.now(),
            result: analysisText,
            model: model,
            params: { budget, minReturn, targetReturn, betTypes, paddockHorses }
        });
        
        // AI分析完了通知を送信
        if (typeof window.notifyAIAnalysisComplete === 'function') {
            const raceName = `${selectedRace.place}${selectedRace.round}R ${selectedRace.race_name || ''}`;
            window.notifyAIAnalysisComplete({
                raceName: raceName,
                raceId: selectedRace.race_number
            });
        }
        
    } catch (error) {
        console.error('[OpenAI] Error:', error);
        aiResultDiv.innerHTML = `<div class="error">AI分析エラー: ${error.message}</div>`;
    }
}

// ====================
// localStorage関連
// ====================

/**
 * AI分析結果をlocalStorageに保存
 * @param {string} raceId - レースID
 * @param {object} data - 保存するデータ { timestamp, result, model, params }
 */
function saveAIAnalysisResult(raceId, data) {
    try {
        const savedResults = JSON.parse(localStorage.getItem('ai_analysis_results') || '{}');
        savedResults[raceId] = data;
        localStorage.setItem('ai_analysis_results', JSON.stringify(savedResults));
        console.log('[localStorage] Saved AI analysis result for race:', raceId);
    } catch (error) {
        console.error('[localStorage] Error saving AI analysis result:', error);
    }
}

/**
 * AI分析結果をlocalStorageから読み込み
 * @param {string} raceId - レースID
 * @returns {object|null} 保存されたデータ、または null
 */
function loadAIAnalysisResult(raceId) {
    try {
        const savedResults = JSON.parse(localStorage.getItem('ai_analysis_results') || '{}');
        return savedResults[raceId] || null;
    } catch (error) {
        console.error('[localStorage] Error loading AI analysis result:', error);
        return null;
    }
}

/**
 * レース選択時に保存されたAI分析結果を自動読み込み
 * @param {string} raceId - レースID
 */
function autoLoadAIAnalysisResult(raceId) {
    console.log('[localStorage] Checking for saved analysis for race:', raceId);
    const savedData = loadAIAnalysisResult(raceId);
    if (savedData) {
        const aiResultDiv = document.getElementById('aiResult');
        if (aiResultDiv) {
            // 保存されたMarkdownをHTMLに変換して表示
            aiResultDiv.innerHTML = marked.parse(savedData.result);
            
            // 保存情報を表示
            const savedDate = new Date(savedData.timestamp);
            const infoDiv = document.createElement('div');
            infoDiv.className = 'saved-info';
            infoDiv.style.cssText = 'background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin-bottom: 15px; font-size: 0.9em;';
            infoDiv.innerHTML = `
                <strong>💾 保存された分析結果</strong><br>
                保存日時: ${savedDate.toLocaleString('ja-JP')}<br>
                モデル: ${savedData.model}<br>
                パラメータ: 予算${savedData.params.budget}円、下限${savedData.params.minReturn}%、目標${savedData.params.targetReturn}%
            `;
            aiResultDiv.insertBefore(infoDiv, aiResultDiv.firstChild);
            
            console.log('[localStorage] Loaded saved AI analysis result for race:', raceId);
        }
    } else {
        console.log('[localStorage] No saved analysis found for race:', raceId);
    }
}

// グローバルに公開
window.autoLoadAIAnalysisResult = autoLoadAIAnalysisResult;

/**
 * 古いAI分析結果を削除（PWA対応）
 * - raceid.csvに存在しないレースIDのデータを削除
 * - 7日以上前のデータも削除
 */
async function cleanupOldAnalysisResults() {
    try {
        console.log('[Cleanup] Starting cleanup of old AI analysis results...');
        
        // raceid.csvから現在のレースIDリストを取得
        const timestamp = new Date().getTime();
        const raceidUrl = `https://bakechhh.github.io/keiba-index/raceid.csv?_=${timestamp}`;
        const response = await fetch(raceidUrl, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            console.warn('[Cleanup] Failed to fetch raceid.csv');
            return;
        }
        
        const text = await response.text();
        const lines = text.trim().split('\n');
        const currentRaceIds = [];
        
        // raceid.csvをパース（1行目はヘッダーなのでスキップ）
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const columns = line.split(',');
            if (columns.length >= 1) {
                const raceId = columns[0].trim();
                if (raceId) {
                    currentRaceIds.push(raceId);
                }
            }
        }
        
        console.log('[Cleanup] Current race IDs count:', currentRaceIds.length);
        
        // localStorageから保存されているAI分析結果を取得
        const savedResults = JSON.parse(localStorage.getItem('ai_analysis_results') || '{}');
        
        // 古いレースIDのデータを削除
        let deletedCount = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        for (const raceId in savedResults) {
            let shouldDelete = false;
            
            // 条件1: raceid.csvに存在しないレースID
            if (!currentRaceIds.includes(raceId)) {
                console.log('[Cleanup] Deleting race not in raceid.csv:', raceId);
                shouldDelete = true;
            }
            
            // 条件2: 7日以上前のデータ
            if (savedResults[raceId].timestamp < sevenDaysAgo) {
                console.log('[Cleanup] Deleting old data (>7 days):', raceId);
                shouldDelete = true;
            }
            
            if (shouldDelete) {
                delete savedResults[raceId];
                deletedCount++;
            }
        }
        
        // 更新されたデータを保存
        localStorage.setItem('ai_analysis_results', JSON.stringify(savedResults));
        
        // 現在のレースIDリストを保存（次回の比較用）
        localStorage.setItem('current_race_ids', JSON.stringify(currentRaceIds));
        localStorage.setItem('last_cleanup_timestamp', Date.now().toString());
        
        if (deletedCount > 0) {
            console.log(`[Cleanup] ✅ Deleted ${deletedCount} old analysis results`);
        } else {
            console.log('[Cleanup] ✅ No old data to delete');
        }
        
    } catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
    }
}

// ====================
// エラーメッセージ改善関数
// ====================
function getErrorMessage(error) {
    if (!navigator.onLine) {
        return 'インターネット接続がありません。接続を確認してください。';
    }
    
    if (error.message.includes('AbortError') || error.message.includes('タイムアウト')) {
        return 'リクエストがタイムアウトしました。もう一度お試しください。';
    }
    
    if (error.message.includes('429')) {
        return 'APIの利用制限に達しました。しばらく待ってからお試しください。';
    }
    
    if (error.message.includes('403')) {
        return 'APIキーが無効です。設定を確認してください。';
    }
    
    if (error.message.includes('Failed to fetch')) {
        return 'ネットワークエラーが発生しました。接続を確認してください。';
    }
    
    return `エラーが発生しました: ${error.message}`;
}

// ====================
// ネットワーク状態監視（PWA対応）
// ====================
window.addEventListener('online', () => {
    console.log('✅ オンラインに復帰しました');
    // UIに通知を表示（オプション）
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    notification.textContent = '✅ インターネットに接続しました';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
});

window.addEventListener('offline', () => {
    console.log('⚠️ オフラインになりました');
    // UIに警告を表示
    const warning = document.createElement('div');
    warning.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #FF9800; color: white; padding: 15px 20px; border-radius: 5px; z-index: 10000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    warning.textContent = '⚠️ インターネット接続が切断されました';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 5000);
});

// グローバルに公開
window.cleanupOldAnalysisResults = cleanupOldAnalysisResults;
window.runAIAnalysis = runAIAnalysis;
window.getErrorMessage = getErrorMessage;