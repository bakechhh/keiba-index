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
                return aOdds - bOdds;
            });
        } else if (currentOddsSort === 'odds_desc') {
            combinations.sort((a, b) => {
                const aOdds = (typeof a.odds === 'object') ? parseFloat(a.odds.max || a.odds.min) : parseFloat(a.odds);
                const bOdds = (typeof b.odds === 'object') ? parseFloat(b.odds.max || b.odds.min) : parseFloat(b.odds);
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
        console.log('[AI Analysis] Prompt length:', prompt.length);

        // Gemini APIを直接呼び出し（gemini-2.5-flashを使用）
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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

    } catch (error) {
        console.error('[AI Analysis] Error:', error);
        aiResultDiv.innerHTML = `<div class="error">AI分析エラー: ${error.message}</div>`;
    }
}

/**
 * プロンプトを作成（gemini.jsと同じロジック）
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
- パドック情報は当日の馬体状態を反映しているため、馬券に重視して含めること（過度な期待は注意）
` : ''}

### 回収率の定義
\`\`\`
回収率(%) = (的中時の払戻金 ÷ 購入金額) × 100
\`\`\`

**例**:
- 単勝5.0倍に100円購入 → 的中時500円払戻 → 回収率500%
- 3連単100倍に100円購入 → 的中時10,000円払戻 → 回収率10,000%

**重要な回収率の考え方**: 
- **下限回収率${minReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値を下回らないこと
- **目標回収率${targetReturn}%**: このレース全体での推奨馬券の合計期待回収率がこの値に近づくように馬券を選定すること
- 個別の馬券ではなく、**推奨する全馬券の資金配分を考慮した合計期待回収率**で判断する
- 例: 本線(的中率高・配当低) + 抑え(バランス) + 大穴(的中率低・配当高) の組み合わせで、全体の期待回収率が目標値になるように調整

**資金配分の考え方**:
- 本線50% + 抑え35% + 大穴15% のように配分
- 各馬券の的中確率 × 配当 × 購入比率 の合計が全体の期待回収率
- 下限を下回らず、目標に近づけるバランスを見つけること

## 分析指示

### 1. データの読み方と重視度

#### 最重要指標（必ず確認）
- **final_score（最終スコア）**: 総合評価指数。高いほど有力。**そこそこ重視**
  - **50以上の馬は馬券内に積極的に含めること**
- **battle_mining（戦績マイニング）**: 過去の戦績から算出した実力指数。**重視する（ただし重くしすぎない）**
- **corrected_time_deviation（補正タイム偏差値）**: 前走の補正タイムを偏差値化した指標。**重要指標**
  - **55以上の馬は馬券内に積極的に含めること**
- **オッズとの乖離**: 指数が高いのにオッズが高い馬は狙い目

#### 重要指標
- **mining_index（マイニング指数）**: タイム・戦績から算出した基礎能力
- **zi_index（ZI指数）**: 前走の補正タイム偏差値。**標準的な指標**（前走のレース内容だけの指数のため、過度に重視しない）
- **similarity_coefficient（類似係数）**: 馬券内に来た馬と似た走りをしているか
  - **1.0が標準**。1.00001以上なら好材料、1.0未満なら注意
  - 動き幅が小さい係数なので、小数点第5位まで見て判断
- **stability_coefficient（安定係数）**: 成績の安定性
  - **1.0が標準**。1.00001以上なら安定、1.0未満なら不安定
  - 動き幅が小さい係数なので、小数点第5位まで見て判断

#### 参考指標（過度に重視しない）
- **騎手勝率・複勝率**: 今年の実績（参考程度）
- **調教師勝率・複勝率**: 今年の実績（参考程度）
- **出走間隔（interval）**: 前走からの週数。**あまり気にしすぎない**（休み明けでも好走する馬はいる）

#### 使用しない指標
- **脚質バランス**: JSONに平均脚質データがないため、脚質による展開予想は行わない

### 2. 分析のポイント

#### 本命候補の選定
- final_scoreが上位3頭を中心に分析
- battle_miningが高い馬を重視（ただし重くしすぎない）
- similarity_coefficient、stability_coefficientが1.0以上の馬は信頼度が高い

#### 穴候補の選定
- battle_miningが高いが、final_scoreが中位の馬（オッズ妙味あり）
- mining_indexが高く、オッズが高い馬
- similarity_coefficientが1.0以上で、オッズが高い馬

#### 消し馬の判断（慎重に行う）
- **以下の理由だけで消さないこと**:
  - 騎手・調教師の成績が悪い → 馬の実力とは別
  - 出走間隔が長い → 休み明けでも好走する馬はいる
  - 過去走で凡走続き → 今回は条件が違う可能性がある
- **消す場合の基準**:
  - すべての指数（final_score、battle_mining、mining_index）が極端に低い
  - similarity_coefficientとstability_coefficientが両方とも1.0を大きく下回る
  - オッズが極端に低く、指数とのバランスが悪い

#### オッズとの乖離を探す
- final_scoreやbattle_miningが高いのに、オッズが高い馬は狙い目
- 逆に、指数が低いのにオッズが低い馬は避ける

### 3. 馬券選定の戦略

#### 本線（的中確率重視）
- final_scoreとbattle_miningが高い馬の組み合わせ
- similarity_coefficient、stability_coefficientが1.0以上の馬を優先
- 回収率が下限を上回る組み合わせ

#### 抑え（バランス重視）
- 本命候補 + 穴候補の組み合わせ
- オッズ妙味がある馬を含める
- 回収率が目標値に近い組み合わせ

#### 大穴（高配当狙い）
- battle_miningが高いが、オッズが高い馬の組み合わせ
- similarity_coefficientが1.0以上で、オッズが高い馬
- 回収率が目標値を大きく上回る組み合わせ

#### 資金配分の目安
- 本線: 50-60%
- 抑え: 30-40%
- 大穴: 15-20%

#### 点数の考え方
- **点数を絞り込みすぎないこと**
- 本線・抑え・大穴をバランスよく推奨する
- 複数の組み合わせを推奨して、リスク分散を図る

#### 馬券種別の注意
- **指定された馬券以外も推奨してもよい**（例：「馬連もおすすめ」など）
- **しかし、購入すべき馬券内は指定された馬券のみで構成すること**

## 出力形式
以下の形式でMarkdownで出力してください：

### 🐴 馬印
以下の形式で馬印を付けてください：

- **◎：本命** - 最も勝つ確率が高い馬。トップ評価。
- **○：対抗** - 本命に対抗できる馬。２番手評価。
- **▲：単穴** - ◎や○の馬に勝てる能力がある馬。３番手評価。
- **△：連下** - ２・３着に来る可能性がある馬。
- **☆：星** - ◎○▲△以外で、勝てる可能性がある穴馬。
- **注：注意** - ３着までなら可能性があると思われる馬。

例：
- ◎ 1番 ジェネチェン
- ○ 2番 アーティラリー
- ▲ 3番 サクライズ

### 📊 総評
- レース全体の傾向（本命、対抗、穴馬の評価）
- 注目すべきポイント（オッズ妙味、指数の特徴）
- リスク要因（荒れる可能性、注意すべき馬）

### 🎯 推奨馬券
各購入方式ごとに、以下の情報を含めてください：

#### 単勝・複勝
- **馬番-馬名**: オッズ
- **購入金額**: ○○円
- **期待回収率**: ○○%
- **推奨理由**: （final_score、battle_mining、similarity_coefficient、stability_coefficientなどから）

#### 馬連・ワイド・馬単
- **組み合わせ**: 馬番-馬番
- **購入金額**: ○○円
- **期待回収率**: ○○%
- **推奨理由**: （2頭の指数、オッズ妙味など）

#### 3連複・3連単
- **組み合わせ**: 馬番-馬番-馬番
- **購入金額**: ○○円
- **期待回収率**: ○○%
- **推奨理由**: （3頭の組み合わせ妙味、指数バランスなど）

### 💰 資金配分
| 区分 | 馬券種別 | 買い目 | 点数 | 1点あたり | 合計金額 | オッズ | 想定回収額 | 期待回収率 |
|------|----------|--------|------|----------|----------|--------|------------|------------|
| 本線 | ○○ | 例: 軸○番→相手△,□,× | ○点 | ○○円 | ○○円 | ○○倍 | ○○円 | ○○% |
| 抑え | ○○ | 例: ○,△,□ボックス | ○点 | ○○円 | ○○円 | ○○倍 | ○○円 | ○○% |
| 大穴 | ○○ | 例: ○-△-□ | ○点 | ○○円 | ○○円 | ○○倍 | ○○円 | ○○% |
| **合計** | - | - | - | - | **○○円** | - | **○○円** | **平均○○%** |

**馬券の買い方の表記ルール**:
- **単体馬券（単勝・複勝）**: 「○番単体」（1点）
- **単発の組み合わせ**: 「○-△」（1点）
- **複数の組み合わせ**: 「○-△,○-□」（2点）、「○-△,△-□,□-×」（3点）など、カンマ区切りで列挙
- **軸1頭流し**: 「軸○番 → 相手△,□,×」（3点）
- **ボックス**: 「○,△,□のボックス」（3頭ボックスは3点）
- **フォーメーション**: 「1着○,△ → 2着□,× → 3着全」（○点）
- 点数と1点あたりの金額を必ず明記すること
- 合計金額 = 点数 × 1点あたり金額
- 想定回収額 = オッズ × 合計金額（的中時の払戻金）

### ⚠️ 注意事項
- リスクとリターンのバランス
- 推奨しない理由（該当する場合）
- その他の留意点

---

**重要な制約**: 
- 予算${budget}円を超えないこと
- **このレース全体での推奨馬券の合計期待回収率**が下限${minReturn}%を下回らないこと
- **このレース全体での推奨馬券の合計期待回収率**が可能な限り目標回収率${targetReturn}%に近づくこと
- 個別の馬券の回収率は参考値であり、**レース全体での回収率を最優先**で考えること
- **複勝・ワイド以外の馬券は1レースで的中が1点のみ**（複数の組み合わせを推奨する場合、そのうち1点しか的中しないことを考慮すること）
- 現実的で実行可能な馬券を推奨すること
- 1馬券あたり最低100円なので、150円など50円単位は必ず出さないこと
- 予算はすべて使い切ること
- 想定回収額はオッズ×合計金額
- 資金配分の表の内容は守ること
- 馬券の組み合わせは、実際のオッズデータに基づいて選定すること
- 消し馬の判断は慎重に行い、過度に消さないこと
`;
}

/**
 * 出走馬データをフォーマット（gemini.jsと同じロジック）
 */
function formatHorsesData(horses) {
    // 表形式で見やすく整理
    let formatted = '\n| 順位 | 馬番 | 馬名 | 最終スコア | マイニング指数 | 戦績マイニング | ZI指数 | 補正タイム偏差値 | 類似係数 | 安定係数 | 騎手名 | 騎手勝率 | 調教師名 | 調教師勝率 | 出走間隔 | 前走着順 |\n';
    formatted += '|------|------|------|------------|----------------|----------------|--------|----------------|----------|----------|--------|----------|----------|------------|----------|----------|\n';

    horses.forEach((horse, index) => {
        const pastRace = horse.past_races && horse.past_races.length > 0 ? horse.past_races[0] : null;
        
        formatted += `| ${index + 1} | ${horse.horse_number} | ${horse.horse_name} | `;
        formatted += `${horse.indices.final_score.toFixed(2)} | `;
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
        formatted += `#### ${index + 1}位: ${horse.horse_number}番 ${horse.horse_name}\n`;
        formatted += `- **最終スコア**: ${horse.indices.final_score.toFixed(2)}\n`;
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
                if (odds.data.tansho) {
                    formatted += '**単勝**:\n';
                    formatted += '| 馬番 | オッズ |\n';
                    formatted += '|------|--------|\n';
                    odds.data.tansho.forEach(item => {
                        formatted += `| ${item.horse_num} | ${item.odds}倍 |\n`;
                    });
                }
                // 複勝（全頭）
                if (odds.data.fukusho) {
                    formatted += '\n**複勝**:\n';
                    formatted += '| 馬番 | オッズ |\n';
                    formatted += '|------|--------|\n';
                    odds.data.fukusho.forEach(item => {
                        formatted += `| ${item.horse_num} | ${item.odds.min}-${item.odds.max}倍 |\n`;
                    });
                }
                break;

            case 'wakuren':
                // 枠連（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds}倍`
                ).join('\n') + '\n';
                break;

            case 'umaren':
                // 馬連（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds}倍`
                ).join('\n') + '\n';
                break;

            case 'wide':
                // ワイド（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds.min}-${item.odds.max}倍`
                ).join('\n') + '\n';
                break;

            case 'umatan':
                // 馬単（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds}倍`
                ).join('\n') + '\n';
                break;

            case 'sanrenpuku':
                // 3連複（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds}倍`
                ).join('\n') + '\n';
                break;

            case 'sanrentan':
                // 3連単（全件）
                formatted += odds.data.combinations.map(item => 
                    `- ${item.combination}: ${item.odds}倍`
                ).join('\n') + '\n';
                break;
        }
    });

    return formatted;
}

// ====================
// グローバルに公開
// ====================
window.loadAndRenderOdds = loadAndRenderOdds;
window.runAIAnalysis = runAIAnalysis;