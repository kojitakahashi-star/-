/**
 * 森林認証ナレッジ AIアシスタント（社内Webページ）
 *
 * Notion のナレッジベース（ナレッジ記事・指摘事例・テンプレート集）を定期的に取り込み、
 * 質問に関連する記事だけを Claude に渡して、出典付きで回答する。
 * 解決しなかった質問は Notion の質問箱に登録できる。
 *
 * 必要なスクリプトプロパティ（プロジェクトの設定 > スクリプト プロパティ）:
 *   ANTHROPIC_API_KEY  Claude API キー
 *   CLAUDE_MODEL       使用するモデル名
 *   NOTION_TOKEN       Notion インテグレーションのシークレット
 * 任意（未設定なら下の DEFAULT_DB を使う）:
 *   NOTION_DB_ARTICLES / NOTION_DB_CASES / NOTION_DB_TEMPLATES / NOTION_DB_QUESTIONS
 *   HOURLY_LIMIT       1人あたり1時間の質問上限（既定 30）
 */

const DEFAULT_DB = {
  articles: '67ea24af86c149d8bee403d6b413276f',
  cases: 'b65ebba282d246a6953b91e2bf95c22d',
  templates: 'fda168e13ae74432b10d83541f0c5980',
  questions: 'e2a70dbc0d0643919a139e84415718ed',
};

const DB_LABEL = { articles: 'ナレッジ記事', cases: '指摘事例', templates: 'テンプレート' };

const NOTION_VERSION = '2022-06-28';
const MAX_CONTEXT_CHARS = 60000; // Claude に渡す資料の上限（文字数）
const MAX_DOCS = 12;
const CACHE_FILE_NAME = 'forest-kb-assistant-cache.json';
const LOG_SHEET_NAME = '森林認証AIアシスタント_利用ログ';

const SYSTEM_PROMPT = [
  'あなたは森林認証（FSC、SGEC/PEFC）コンサルティング会社の社内アシスタントです。',
  '利用者は主に新人コンサルタントです。',
  '',
  '回答のルール:',
  '- 回答は、渡された <document> の内容だけを根拠にしてください。一般知識で規格の内容を補ってはいけません。',
  '- 根拠にした資料は、文末に [1] のように資料番号で示してください。',
  '- 資料に答えがない、または資料だけでは判断できない場合は、はっきり「ナレッジベースには該当する情報がありません」と伝え、',
  '  分かる範囲だけを述べたうえで、「質問箱に送る」ボタンでベテランに質問するよう案内してください。',
  '- status が「下書き」「レビュー待ち」の資料を根拠にした場合は、「未レビューの情報を含みます」と一言添えてください。',
  '- 規格の版数が資料に書かれていれば、回答にも版数を明記してください。',
  '- 顧客の会社名や個人名は書かないでください。',
  '- 結論を最初に述べ、そのあと必要な手順や注意点を箇条書きで簡潔にまとめてください。',
  '- 日本語で回答してください。',
].join('\n');

// ---------------------------------------------------------------------------
// Web アプリ
// ---------------------------------------------------------------------------

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('森林認証ナレッジ AIアシスタント')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 画面から呼ばれる。history は [{role:'user'|'assistant', text:string}] の直近の会話。
 */
function ask(question, history) {
  question = String(question || '').trim();
  if (!question) throw new Error('質問を入力してください。');
  if (question.length > 2000) throw new Error('質問は2000文字以内にしてください。');

  const user = currentUserEmail_();
  checkRateLimit_(user);

  const kb = loadCache_();
  if (!kb.records.length) {
    throw new Error('ナレッジがまだ取り込まれていません。管理者に syncKnowledge の実行を依頼してください。');
  }

  // 直前の質問も検索語に含め、「それは？」のような追加質問でも関連資料を拾えるようにする
  const recentUserText = (history || [])
    .filter(function (h) { return h.role === 'user'; })
    .slice(-1)
    .map(function (h) { return h.text; })
    .join(' ');
  const docs = selectDocuments_(kb.records, question + ' ' + recentUserText);

  const answer = callClaude_(question, history || [], docs);
  const cited = citedSources_(answer, docs);

  logUsage_(user, question, cited.length, false);
  return { answer: answer, sources: cited };
}

/**
 * 「解決しなかった → 質問箱に送る」ボタン。
 */
function reportUnresolved(question, aiAnswer, note) {
  const user = currentUserEmail_();
  const background = [
    'AIアシスタント経由の質問',
    '質問者: ' + (user || '不明'),
    note ? '補足: ' + note : '',
    '',
    'AIの回答:',
    String(aiAnswer || '').slice(0, 1200),
  ].filter(function (s) { return s !== null; }).join('\n');

  const dbId = prop_('NOTION_DB_QUESTIONS', DEFAULT_DB.questions);
  notionFetch_('post', '/pages', {
    parent: { database_id: dbId },
    properties: {
      '質問': { title: [{ text: { content: String(question).slice(0, 200) } }] },
      '背景・状況': { rich_text: [{ text: { content: background.slice(0, 1900) } }] },
      'ステータス': { select: { name: '未回答' } },
      '急ぎ度': { select: { name: 'いつでも' } },
    },
  });
  logUsage_(user, question, 0, true);
  return true;
}

// ---------------------------------------------------------------------------
// Notion からの取り込み（時間主導トリガーで定期実行）
// ---------------------------------------------------------------------------

/**
 * 初回に1度だけ手動で実行する。トリガー登録と初回の取り込みを行う。
 */
function setup() {
  ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'NOTION_TOKEN'].forEach(function (k) {
    if (!PropertiesService.getScriptProperties().getProperty(k)) {
      throw new Error('スクリプトプロパティ ' + k + ' が設定されていません。');
    }
  });
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncKnowledge') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncKnowledge').timeBased().everyHours(1).create();
  syncKnowledge();
}

/**
 * Notion の各DBを読み込み、Drive 上のキャッシュファイルに保存する。
 * 本文は、前回から更新されたページだけ取り直す。
 */
function syncKnowledge() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // 前回の取り込みがまだ動いている
  try {
    const previous = loadCache_();
    const prevById = {};
    previous.records.forEach(function (r) { prevById[r.id] = r; });

    const records = [];
    ['articles', 'cases', 'templates'].forEach(function (key) {
      const dbId = prop_('NOTION_DB_' + key.toUpperCase(), DEFAULT_DB[key]);
      queryDatabase_(dbId).forEach(function (page) {
        const old = prevById[page.id];
        const body = old && old.edited === page.last_edited_time
          ? old.body
          : pageText_(page.id);
        records.push(toRecord_(key, page, body));
      });
    });

    saveCache_({ syncedAt: new Date().toISOString(), records: records });
    console.log('取り込み完了: ' + records.length + '件');
  } finally {
    lock.releaseLock();
  }
}

function queryDatabase_(dbId) {
  const pages = [];
  let cursor = null;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = notionFetch_('post', '/databases/' + dbId + '/query', body);
    Array.prototype.push.apply(pages, res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return pages;
}

function pageText_(blockId, depth) {
  depth = depth || 0;
  const lines = [];
  let cursor = null;
  do {
    const res = notionFetch_('get', '/blocks/' + blockId + '/children?page_size=100' +
      (cursor ? '&start_cursor=' + cursor : ''));
    res.results.forEach(function (b) {
      const line = blockText_(b);
      if (line) lines.push(indent_(depth) + line);
      // 子データベースや子ページの中身までは辿らない
      if (b.has_children && depth < 2 && b.type !== 'child_page' && b.type !== 'child_database') {
        const child = pageText_(b.id, depth + 1);
        if (child) lines.push(child);
      }
    });
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return lines.join('\n');
}

function blockText_(b) {
  const data = b[b.type] || {};
  const text = richText_(data.rich_text || []);
  switch (b.type) {
    case 'heading_1': return '# ' + text;
    case 'heading_2': return '## ' + text;
    case 'heading_3': return '### ' + text;
    case 'bulleted_list_item': return '- ' + text;
    case 'numbered_list_item': return '1. ' + text;
    case 'to_do': return (data.checked ? '- [x] ' : '- [ ] ') + text;
    case 'quote':
    case 'callout':
    case 'toggle':
    case 'paragraph': return text;
    case 'code': return text;
    case 'table_row':
      return '| ' + (data.cells || []).map(richText_).join(' | ') + ' |';
    case 'bookmark':
    case 'link_preview':
    case 'embed': return data.url || '';
    case 'child_page': return '（子ページ: ' + (data.title || '') + '）';
    default: return text;
  }
}

function toRecord_(dbKey, page, body) {
  const props = {};
  let title = '';
  Object.keys(page.properties).forEach(function (name) {
    const p = page.properties[name];
    if (p.type === 'title') {
      title = richText_(p.title);
      return;
    }
    const v = propValue_(p);
    if (v !== '' && v !== null) props[name] = v;
  });
  return {
    id: page.id,
    db: dbKey,
    url: page.url,
    title: title,
    props: props,
    body: body || '',
    edited: page.last_edited_time,
  };
}

function propValue_(p) {
  switch (p.type) {
    case 'rich_text': return richText_(p.rich_text);
    case 'select': return p.select ? p.select.name : '';
    case 'status': return p.status ? p.status.name : '';
    case 'multi_select': return p.multi_select.map(function (o) { return o.name; }).join(', ');
    case 'number': return p.number === null ? '' : String(p.number);
    case 'checkbox': return p.checkbox ? 'はい' : '';
    case 'url': return p.url || '';
    case 'date': return p.date ? p.date.start : '';
    case 'unique_id': return p.unique_id ? (p.unique_id.prefix ? p.unique_id.prefix + '-' : '') + p.unique_id.number : '';
    default: return ''; // people / relation / files / 自動日時 などは回答に使わない
  }
}

function richText_(arr) {
  return (arr || []).map(function (t) { return t.plain_text; }).join('');
}

function indent_(depth) {
  return new Array(depth + 1).join('  ');
}

function notionFetch_(method, path, payload) {
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + prop_('NOTION_TOKEN'),
      'Notion-Version': NOTION_VERSION,
    },
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = UrlFetchApp.fetch('https://api.notion.com/v1' + path, options);
    const code = res.getResponseCode();
    if (code === 429 || code >= 500) {
      Utilities.sleep(1000 * Math.pow(2, attempt));
      continue;
    }
    if (code >= 400) {
      throw new Error('Notion API エラー ' + code + ': ' + res.getContentText().slice(0, 300));
    }
    Utilities.sleep(340); // Notion の上限（毎秒3リクエスト）に合わせる
    return JSON.parse(res.getContentText());
  }
  throw new Error('Notion API が混み合っています。時間をおいて再実行してください。');
}

// ---------------------------------------------------------------------------
// 関連資料の選択（日本語は2文字ずつに分けて照合する簡易検索）
// ---------------------------------------------------------------------------

function selectDocuments_(records, query) {
  const totalChars = records.reduce(function (n, r) { return n + docText_(r).length; }, 0);
  if (totalChars <= MAX_CONTEXT_CHARS) return records.slice(); // 全件渡せる量ならそのまま

  const qTerms = terms_(query);
  if (!qTerms.length) return [];

  const docTerms = records.map(function (r) {
    return { title: termSet_(r.title + ' ' + (r.props['結論'] || '')), all: termSet_(docText_(r)) };
  });
  const df = {};
  docTerms.forEach(function (d) {
    Object.keys(d.all).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
  });
  const n = records.length;

  const scored = records.map(function (r, i) {
    let score = 0;
    qTerms.forEach(function (t) {
      if (!docTerms[i].all[t]) return;
      const idf = Math.log(1 + n / df[t]);
      score += idf * (docTerms[i].title[t] ? 3 : 1);
    });
    if (r.props['ステータス'] === 'レビュー済' || r.props['ステータス'] === '最新') score *= 1.2;
    return { record: r, score: score };
  }).filter(function (s) { return s.score > 0; });

  scored.sort(function (a, b) { return b.score - a.score; });

  const picked = [];
  let used = 0;
  for (let i = 0; i < scored.length && picked.length < MAX_DOCS; i++) {
    const len = docText_(scored[i].record).length;
    if (used + len > MAX_CONTEXT_CHARS && picked.length) continue;
    picked.push(scored[i].record);
    used += len;
  }
  return picked;
}

function terms_(text) {
  const normalized = String(text).toLowerCase().normalize('NFKC');
  const out = [];
  // 英数字（FSC、CoC、40-004 など）は単語単位
  (normalized.match(/[a-z0-9][a-z0-9.\-]*/g) || []).forEach(function (w) {
    if (w.length >= 2) out.push(w);
  });
  // 日本語は2文字ずつ
  const jp = normalized.replace(/[a-z0-9.\-\s、。・「」（）()【】\[\]:：,，!?！？]+/g, ' ');
  jp.split(' ').forEach(function (chunk) {
    for (let i = 0; i < chunk.length - 1; i++) out.push(chunk.substr(i, 2));
  });
  return out;
}

function termSet_(text) {
  const set = {};
  terms_(text).forEach(function (t) { set[t] = true; });
  return set;
}

function docText_(r) {
  const props = Object.keys(r.props).map(function (k) { return k + ': ' + r.props[k]; }).join('\n');
  return r.title + '\n' + props + '\n' + r.body;
}

// ---------------------------------------------------------------------------
// Claude API
// ---------------------------------------------------------------------------

function callClaude_(question, history, docs) {
  const docBlock = docs.length
    ? docs.map(function (r, i) {
        const status = r.props['ステータス'] || '';
        return '<document index="' + (i + 1) + '" type="' + DB_LABEL[r.db] + '" status="' + status + '">\n' +
          docText_(r) + '\n</document>';
      }).join('\n\n')
    : '（関連する資料は見つかりませんでした）';

  // 会話履歴は直近6往復まで。資料は最新の質問にだけ添える。
  const messages = [];
  (history || []).slice(-12).forEach(function (h) {
    if (h.role !== 'user' && h.role !== 'assistant') return;
    const text = String(h.text || '').slice(0, 4000);
    if (!text) return;
    if (messages.length && messages[messages.length - 1].role === h.role) {
      messages[messages.length - 1].content += '\n\n' + text;
    } else {
      messages.push({ role: h.role, content: text });
    }
  });
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();

  messages.push({
    role: 'user',
    content: '<documents>\n' + docBlock + '\n</documents>\n\n質問: ' + question,
  });

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {
      'x-api-key': prop_('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    payload: JSON.stringify({
      model: prop_('CLAUDE_MODEL'),
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'low' },
      fallbacks: 'default',
      messages: messages,
    }),
  });

  const code = res.getResponseCode();
  if (code === 429 || code === 529) {
    throw new Error('AIが混み合っています。少し待ってからもう一度お試しください。');
  }
  if (code >= 400) {
    console.error('Claude API エラー ' + code + ': ' + res.getContentText());
    throw new Error('AIの呼び出しに失敗しました（' + code + '）。管理者に連絡してください。');
  }

  const data = JSON.parse(res.getContentText());
  if (data.stop_reason === 'refusal') {
    return 'この質問にはAIが回答できませんでした。質問の表現を変えるか、「質問箱に送る」でベテランに質問してください。';
  }
  const text = (data.content || [])
    .filter(function (b) { return b.type === 'text'; })
    .map(function (b) { return b.text; })
    .join('');
  if (data.stop_reason === 'max_tokens') {
    return text + '\n\n（回答が長いため途中で終わっています。質問を絞ってもう一度お試しください。）';
  }
  return text;
}

function citedSources_(answer, docs) {
  const seen = {};
  const out = [];
  const re = /\[(\d+)\]/g;
  let m;
  while ((m = re.exec(answer)) !== null) {
    const i = Number(m[1]) - 1;
    if (docs[i] && !seen[i]) {
      seen[i] = true;
      out.push({
        index: i + 1,
        title: docs[i].title,
        url: docs[i].url,
        type: DB_LABEL[docs[i].db],
        status: docs[i].props['ステータス'] || '',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// キャッシュ・ログ・設定
// ---------------------------------------------------------------------------

function loadCache_() {
  const id = PropertiesService.getScriptProperties().getProperty('CACHE_FILE_ID');
  if (!id) return { syncedAt: null, records: [] };
  try {
    return JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    return { syncedAt: null, records: [] };
  }
}

function saveCache_(data) {
  const props = PropertiesService.getScriptProperties();
  const json = JSON.stringify(data);
  const id = props.getProperty('CACHE_FILE_ID');
  if (id) {
    try {
      DriveApp.getFileById(id).setContent(json);
      return;
    } catch (e) {
      // ファイルが消されていたら作り直す
    }
  }
  const file = DriveApp.createFile(CACHE_FILE_NAME, json, MimeType.PLAIN_TEXT);
  props.setProperty('CACHE_FILE_ID', file.getId());
}

function logUsage_(user, question, sourceCount, unresolved) {
  try {
    const props = PropertiesService.getScriptProperties();
    let id = props.getProperty('LOG_SHEET_ID');
    let sheet;
    if (id) {
      sheet = SpreadsheetApp.openById(id).getSheets()[0];
    } else {
      const ss = SpreadsheetApp.create(LOG_SHEET_NAME);
      sheet = ss.getSheets()[0];
      sheet.appendRow(['日時', '利用者', '質問', '出典の数', '質問箱に送信']);
      props.setProperty('LOG_SHEET_ID', ss.getId());
    }
    sheet.appendRow([new Date(), user, String(question).slice(0, 500), sourceCount, unresolved ? 'はい' : '']);
  } catch (e) {
    console.error('ログの記録に失敗: ' + e);
  }
}

function checkRateLimit_(user) {
  const limit = Number(prop_('HOURLY_LIMIT', '30'));
  const cache = CacheService.getScriptCache();
  const key = 'rate_' + (user || 'anonymous') + '_' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHH');
  const count = Number(cache.get(key) || '0');
  if (count >= limit) {
    throw new Error('1時間あたりの質問回数の上限（' + limit + '回）に達しました。時間をおいてお試しください。');
  }
  cache.put(key, String(count + 1), 3600);
}

function currentUserEmail_() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (e) {
    return '';
  }
}

function prop_(key, fallback) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (v) return v;
  if (fallback !== undefined) return fallback;
  throw new Error('スクリプトプロパティ ' + key + ' が設定されていません。');
}

/** 画面のヘッダーに最終取り込み日時を出すため */
function getStatus() {
  const kb = loadCache_();
  return { syncedAt: kb.syncedAt, count: kb.records.length };
}
