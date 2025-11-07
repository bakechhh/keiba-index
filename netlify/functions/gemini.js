/**
 * Netlify Function: Gemini API呼び出し
 * 競馬データとオッズデータを分析して馬券推奨を返す
 */

import { GoogleGenAI } from "@google/genai";

export const handler = async (event, context) => {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト（プリフライト）への対応
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POSTリクエストのみ許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // リクエストボディを解析
    const { raceData, oddsData, userParams } = JSON.parse(event.body);

    // 必須パラメータのチェック
    if (!raceData || !oddsData || !userParams) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Gemini AI初期化
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // プロンプト作成
    const prompt = createPrompt(raceData, oddsData, userParams);

    // Gemini API呼び出し
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // 成功レスポンス
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: response.text,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Gemini API Error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error'
      })
    };
  }
};

/**
 * プロンプトを作成
 */
function createPrompt(raceData, oddsData, userParams) {
  const {
    budget,
    betTypes,
    minReturn,
    targetReturn
  } = userParams;

  return `あなたは競馬予想AIです。以下のデータを分析して、馬券購入の推奨を提供してください。

## レース情報
- レース名: ${raceData.race_name}
- 開催場所: ${raceData.place}
- 距離: ${raceData.distance}
- 馬場状態: ${raceData.track_condition}
- 出走頭数: ${raceData.horses.length}頭

## 出走馬データ
${formatHorsesData(raceData.horses)}

## オッズデータ
${formatOddsData(oddsData)}

## ユーザー条件
- **予算**: ${budget}円
- **購入方式**: ${betTypes.join(', ')}
- **下限回収率**: ${minReturn}%
- **目標回収率**: ${targetReturn}%

## 出力形式
以下の形式でMarkdownで出力してください：

### 📊 総評
- レース全体の傾向
- 注目すべきポイント
- リスク要因

### 🎯 推奨馬券
各購入方式ごとに、以下の情報を含めてください：
- 馬券の組み合わせ
- 購入金額
- 期待回収率
- 推奨理由

### 💰 資金配分
- 本線（メイン購入）
- 抑え（サブ購入）
- 合計金額と期待値

### ⚠️ 注意事項
- リスクとリターンのバランス
- 推奨しない理由（該当する場合）

---

**重要**: 
- 予算${budget}円を超えないこと
- 下限回収率${minReturn}%を下回らないこと
- 可能な限り目標回収率${targetReturn}%を目指すこと
- 現実的で実行可能な馬券を推奨すること
`;
}

/**
 * 出走馬データをフォーマット
 */
function formatHorsesData(horses) {
  return horses.map((horse, index) => {
    return `
### ${index + 1}位: ${horse.horse_number}番 ${horse.horse_name}
- **最終スコア**: ${horse.indices.final_score.toFixed(2)}
- **マイニング指数**: ${horse.indices.mining_index.toFixed(1)}
- **騎手**: ${horse.jockey.name} (${horse.jockey.weight}kg)
- **騎手勝率**: ${horse.jockey.this_year.win_rate.toFixed(1)}%
- **調教師**: ${horse.trainer.name}
- **前走指数**: ${horse.zi_index.toFixed(1)}
- **出走間隔**: ${horse.interval}週
`;
  }).join('\n');
}

/**
 * オッズデータをフォーマット
 */
function formatOddsData(oddsData) {
  let formatted = '';

  oddsData.forEach(odds => {
    formatted += `\n### ${odds.odds_type_name}\n`;

    switch (odds.odds_type) {
      case 'tfw':
        // 単勝・複勝
        if (odds.data.tansho) {
          formatted += '\n**単勝**:\n';
          odds.data.tansho.forEach(item => {
            formatted += `- ${item.horse_number}番: ${item.odds}倍\n`;
          });
        }
        if (odds.data.fukusho) {
          formatted += '\n**複勝**:\n';
          odds.data.fukusho.forEach(item => {
            formatted += `- ${item.horse_number}番: ${item.odds_min}-${item.odds_max}倍\n`;
          });
        }
        break;

      case 'wakuren':
        // 枠連（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds}倍`
        ).join('\n') + '\n';
        break;

      case 'umaren':
        // 馬連（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds}倍`
        ).join('\n') + '\n';
        break;

      case 'wide':
        // ワイド（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds.min}-${item.odds.max}倍`
        ).join('\n') + '\n';
        break;

      case 'umatan':
        // 馬単（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds}倍`
        ).join('\n') + '\n';
        break;

      case 'sanrenpuku':
        // 3連複（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds}倍`
        ).join('\n') + '\n';
        break;

      case 'sanrentan':
        // 3連単（上位10件のみ）
        formatted += odds.data.combinations.slice(0, 10).map(item => 
          `- ${item.combination}: ${item.odds}倍`
        ).join('\n') + '\n';
        break;
    }
  });

  return formatted;
}