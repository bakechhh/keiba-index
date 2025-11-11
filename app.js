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
    
    // APIキーの取得
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
    const selectedModel = document.getElementById('geminiModel').value; // モデル選択
    
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

        // Gemini APIを直接呼び出し（選択されたモデルを使用）
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
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
            })
        });
        
        console.log('[AI Analysis] Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[AI Analysis] Error response:', errorData);
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log('[AI Analysis] Success');

        // レスポンスからテキストを抽出
        const analysisText = result.candidates[0].content.parts[0].text;

        // marked.jsを使ってMarkdownをHTMLに変換
        aiResultDiv.innerHTML = marked.parse(analysisText);
        
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
        aiResultDiv.innerHTML = `<div class="error">AI分析エラー: ${error.message}</div>`;
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

    return `あなたは競馬予想AIです。以下のデータを分析して、馬券購入の推奨を提供してください。

## レース情報
- **レース名**: ${raceData.race_name}
- **開催場所**: ${raceData.place}
- **距離**: ${raceData.surface}${raceData.distance}m
- **馬場状態**: ${raceData.condition}
- **出走頭数**: ${raceData.horses.length}頭

## 出走馬データ
${formatHorsesData(raceData.horses)}

## オッズデータ
${formatOddsData(oddsData)}

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

### 回収率の定義
\`\`\`
回収率(%) = (的中時の払戻金 ÷ 購入金額) × 100
\`\`\`

**重要な回収率の考え方**: 
- **下限回収率${minReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値を下回らないこと
- **目標回収率${targetReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値に近づくように馬券を選定すること
- 個別の馬券ではなく、**推奨する全馬券の資金配分を考慮した合計期待回収率**で判断する

**資金配分の考え方**:
- 本線、抑え、大穴の配分は目標回収率に応じて調整
- 各馬券の的中確率 × 配当 × 購入比率 の合計が全体の期待回収率

## ⚠️ 重要：Geminiが絶対にしてはいけないこと

### 禁止事項1: AIスコアを確率として扱うこと
- **AI単勝スコア、AI連対スコア、AI複勝スコア**は確率ではありません
- これらは機械学習モデルの正規化された出力値であり、相対的な評価値です
- **絶対に「AI単勝スコア × AI連対スコア」のような掛け算をしないこと**
- **絶対に「AI単勝スコア = 勝つ確率」と解釈しないこと**

### 禁止事項2: AIスコアの数値を過信すること
- AIスコアの絶対値に意味はありません
- 重要なのは**AI順位**（1位が最有力、2位が次点、など）
- AUCスコア0.78-0.80のモデルなので、完璧ではありません

### 禁止事項3: 特定の指標だけで判断すること
- final_score、AI順位、オッズ、特徴量を総合的に判断してください
- 1つの指標だけで馬券を決めないこと

## 分析指示

### 1. LightGBMモデルについて理解すべきこと

#### モデルの特徴量重要度（学習時に最も重視された指標）

**勝率モデル（単勝）**:
1. **final_score** - 最重要（既存の総合指数）
2. **zi_deviation** - 重要（前走の能力偏差値）
3. **base_score** - 重要（基礎スコア）
4. **mining_index** - やや重要
5. **jockey_coefficient** - 補助的

**連対率モデル**:
1. **base_score** - 最重要
2. **final_score** - 重要
3. **zi_deviation** - やや重要
4. **mining_index** - やや重要

**複勝率モデル**:
1. **final_score** - 最重要
2. **base_score** - 重要
3. **mining_index** - やや重要
4. **zi_deviation** - やや重要

#### AIスコアと順位の読み方
- **AI単勝スコア、AI連対スコア、AI複勝スコア**: 
  - 機械学習モデルの生の出力値（**確率ではない**）
  - 相対的な強さを示す評価値
  - 値の絶対的な大きさに意味はない
  
- **AI単勝順位、AI連対順位、AI複勝順位**: 
  - 各スコアに基づく順位（1位が最有力）
  - **順位の方がスコアより重要**
  - 複数の順位で上位 = 信頼度高い

### 2. オッズとの照合方法

#### 人気順位の確認
1. オッズデータから各馬の単勝オッズを抽出
2. オッズが低い順に並べて人気順位を付ける
3. AI順位と人気順位を比較

#### 狙い目の見つけ方
- **AI順位 < 人気順位**（AI評価は高いが人気がない）→ 妙味あり
- **AI順位 > 人気順位**（AI評価は低いが人気がある）→ 避ける候補
- 順位の乖離が大きいほどチャンスまたはリスク

### 3. 分析の進め方

#### ステップ1：データの整理
- 各馬のAI順位（単勝・連対・複勝）を確認
- オッズから人気順位を算出
- AI順位と人気順位の乖離をチェック

#### ステップ2：特徴量の確認
- **final_score**：総合力の指標（モデルが最重視）
- **base_score**：基礎能力（連対率・複勝率で重要）
- **zi_deviation**：前走能力（単勝で重要）
- **mining_index**：総合的な能力指標

#### ステップ3：馬券組み立て
- ユーザーの目標回収率に応じて戦略を変える
- 低回収率目標 → 堅実路線
- 高回収率目標 → 穴馬重視
- AI順位と人気の乖離を活用

### 4. 分析の重要ポイント

- AI順位を最優先で確認する
- 人気順位との乖離を探す
- ユーザーの目標回収率に合わせて柔軟に対応
- データに基づいた客観的な分析を行う
- **AIスコアは相対的な評価値として扱う（確率ではない）**

## 出力形式

### 📊 レース総評（拡大版）

#### レースレベル評価
- **波乱度**: ★☆☆☆☆（堅い）～ ★★★★★（大波乱）
  - AI上位馬と人気上位馬の一致度から判定
  - 各馬の指数のばらつきから判定
- **レースの質**: 高い/標準/低い
  - 上位馬のfinal_scoreの絶対値から判定
  - 全体的な指数分布から判定

#### 展開予想
- AI順位と各指標から予想される展開
- 注目すべきポイント
- リスク要因

#### 狙い目分析
- AI順位と人気順位の乖離が大きい馬
- 特徴量が優秀なのに人気がない馬
- 危険な人気馬

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
- **評価**: ◎本命 / ○対抗 / ▲単穴 / △連下 / ☆穴 / 注注意 / ×消し
- **総評**: AI順位と人気の関係、final_score、特徴量の特徴を踏まえた簡潔な評価
- **推奨**: 軸候補 / 相手候補 / ヒモ候補 / 消し / 様子見

#### 評価基準
- **◎本命**: AI順位・人気・指数が全て上位で信頼度が高い
- **○対抗**: 本命に次ぐ評価、AI順位または指数が優秀
- **▲単穴**: AI順位は高いが人気がない（妙味あり）
- **△連下**: 2～3着候補、指数は中位だが安定性あり
- **☆穴**: AI順位と人気の乖離が大きい、一発の可能性
- **注注意**: 指数は低いが、パドックや特殊条件で注目
- **×消し**: 全ての指数が低く、馬券に含めない

#### 記載例
**1番 ジェネチェン（AI単勝1位/人気3番人気）**
- **評価**: ▲単穴
- **総評**: final_score 65.2と高く、AI単勝1位だが人気は3番人気と妙味あり。zi_deviation 58.3と前走内容も良好。
- **推奨**: 軸候補または相手候補

**2番 アーティラリー（AI単勝5位/人気1番人気）**
- **評価**: 注注意
- **総評**: 人気先行でAI評価は5位。final_score 52.1と標準的。人気ほどの信頼度はない。
- **推奨**: 相手候補（本命視は危険）

**3番 サクライズ（AI単勝8位/人気10番人気）**
- **評価**: ×消し
- **総評**: final_score 42.3と低く、AI順位も8位。全ての指数が下位で馬券妙味なし。
- **推奨**: 消し

#### 重要な注意事項
- **全頭について必ず評価すること**（出走頭数分）
- AI順位と人気の乖離を必ず指摘すること
- 消し馬も理由を明記すること
- パドック評価がある馬は必ず言及すること

### 🎯 推奨馬券

#### 本線（メイン勝負）
| 馬券種別 | 組み合わせ | オッズ | 購入金額 | 的中時払戻 |
|---------|-----------|--------|----------|------------|
| ○○ | ○-○-○ | ○○倍 | ○○円 | ○○円 |

**選定理由**: AI順位と人気の関係、特徴量の優位性など

#### 抑え（リスクヘッジ）
| 馬券種別 | 組み合わせ | オッズ | 購入金額 | 的中時払戻 |
|---------|-----------|--------|----------|------------|
| ○○ | ○-○-○ | ○○倍 | ○○円 | ○○円 |

**選定理由**: バランス重視の理由

#### 大穴（一発狙い）
| 馬券種別 | 組み合わせ | オッズ | 購入金額 | 的中時払戻 |
|---------|-----------|--------|----------|------------|
| ○○ | ○-○-○ | ○○倍 | ○○円 | ○○円 |

**選定理由**: 順位乖離、高配当の可能性

### 💰 資金配分サマリー

| 区分 | 金額 | 比率 | 最大払戻 | 想定回収率 |
|------|------|------|----------|------------|
| 本線 | ○○円 | ○○% | ○○円 | ○○% |
| 抑え | ○○円 | ○○% | ○○円 | ○○% |
| 大穴 | ○○円 | ○○% | ○○円 | ○○% |
| **合計** | **${budget}円** | **100%** | - | **○○%** |

### 🔍 データ分析詳細

#### AI順位と人気の乖離TOP3
1. ○番馬：AI単勝○位だが○番人気（乖離○）
2. ○番馬：AI連対○位だが○番人気（乖離○）
3. ○番馬：AI複勝○位だが○番人気（乖離○）

#### 特徴量による隠れた実力馬
- final_scoreが高い割に人気がない：○番、○番
- base_scoreが優秀：○番、○番
- zi_deviationが高い：○番、○番

#### 危険な人気馬
- AI順位は低いが人気先行：○番、○番

### ⚠️ 注意事項
- オッズは変動する可能性があります
- AI予測の限界を理解した上で参考にしてください
- 最終的な購入判断は自己責任でお願いします

---

**制約事項**: 
- 予算${budget}円を必ず使い切ること
- 全体の想定回収率が下限${minReturn}%を下回らないこと
- 目標回収率${targetReturn}%に可能な限り近づけること
- 1馬券あたり最低100円（50円単位は不可）
- 現実的で実行可能な馬券を推奨すること

**分析の自由度**:
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
