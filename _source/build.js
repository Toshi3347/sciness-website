// Build the static Sciness website from the Claude Design artboard (Main.dc.html).
// Usage: node build.js <Main.dc.html> <outDir> [formEndpoint]
// Produces: index.html (ja), en/index.html (en). Assets are copied separately.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SRC = process.argv[2];
const OUT = process.argv[3];
const FORM_ENDPOINT = process.argv[4] || 'https://formspree.io/f/YOUR_FORM_ID';
const SITE = 'https://www.sciness.co.jp';
const PHOTO_BLOB = /\/_blob\/[0-9a-f]{32}/g;

const src = fs.readFileSync(SRC, 'utf8');

// ---- 1. Evaluate the component script to get the copy for each language
const script = src.match(/<script type="text\/x-dc" data-dc-script[^>]*data-props='([^']*)'[^>]*>([\s\S]*?)<\/script>/);
const props = JSON.parse(script[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
global.DCLogic = class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} };
global.navigator = { languages: ['ja'] };
const Component = new Function(script[2] + '\nreturn Component;')();
function valsFor(lang) {
  const c = new Component({ accent: props.accent && props.accent.default, lang: 'auto' });
  c.state = { lang };
  return c.renderVals();
}

// ---- 2. Template pieces
const xdc = src.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1];
const helmet = (xdc.match(/<helmet>([\s\S]*?)<\/helmet>/) || ['', ''])[1];
const body = xdc.replace(/<helmet>[\s\S]*?<\/helmet>/, '');

function lookup(scope, expr) {
  expr = expr.trim();
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
  return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function interp(str, scope) {
  return str.replace(/\{\{([^}]+)\}\}/g, (_, e) => {
    const v = lookup(scope, e);
    return v == null || typeof v === 'function' ? '' : String(v);
  });
}

function renderChildren($, parent, scope) {
  $(parent).contents().toArray().forEach((node) => renderNode($, node, scope));
}
function renderNode($, node, scope) {
  if (node.type === 'text') {
    if (node.data.includes('{{')) node.data = interp(node.data, scope);
    return;
  }
  if (node.type !== 'tag') return;
  const el = $(node);
  const tag = node.name;
  if (tag === 'sc-if') {
    const m = (el.attr('value') || '').match(/\{\{([^}]+)\}\}/);
    const ok = m ? !!lookup(scope, m[1]) : false;
    if (!ok) { el.remove(); return; }
    renderChildren($, node, scope);
    el.replaceWith(el.contents());
    return;
  }
  if (tag === 'sc-for') {
    const m = (el.attr('list') || '').match(/\{\{([^}]+)\}\}/);
    const list = (m && lookup(scope, m[1])) || [];
    const as = el.attr('as') || 'item';
    const tpl = el.html();
    const frags = list.map((item, i) => {
      const wrap = $('<div></div>').html(tpl);
      renderChildren($, wrap[0], Object.assign({}, scope, { [as]: item, $index: i }));
      return wrap.html();
    });
    el.replaceWith(frags.join(''));
    return;
  }
  for (const [name, value] of Object.entries(node.attribs || {})) {
    if (/^on[A-Z]/.test(name) || /^on[a-z]+$/.test(name) || name.startsWith('hint-')) { el.removeAttr(name); continue; }
    if (value.includes('{{')) el.attr(name, interp(value, scope));
  }
  renderChildren($, node, scope);
}

// ---- 3. Page assembly
function page(lang) {
  const v = valsFor(lang);
  const t = v.t;
  const prefix = lang === 'en' ? '../' : '';
  const $ = cheerio.load(body, { decodeEntities: false }, false);
  renderChildren($, $.root()[0], v);

  // Apply the approved logo during every build, including after a canvas refresh.
  const headerBrand = $('header a[href="#top"]');
  const footerBrand = $('footer > div > span').filter((_, el) => $(el).text().trim() === 'SCINESS, LLC.');
  if (headerBrand.length !== 1 || footerBrand.length !== 1) {
    throw new Error('Expected one header brand and one footer brand in Main.dc.html');
  }
  const logo = (width) => `<img src="${prefix}assets/sciness-logo-white.svg" alt="SCINESS, LLC." width="1397" height="315" style="display: block; width: ${width}px; max-width: 100%; height: auto">`;
  headerBrand.html(logo(178));
  footerBrand.html(logo(142));

  // Photo
  $('img').each((_, img) => {
    const s = $(img).attr('src') || '';
    if (PHOTO_BLOB.test(s)) $(img).attr('src', (lang === 'en' ? '../' : '') + 'assets/ceo.jpg').attr('width', '1024').attr('height', '768');
    PHOTO_BLOB.lastIndex = 0;
  });

  // Language switch: real links instead of state buttons
  const other = lang === 'ja' ? 'en' : 'ja';
  const hrefJa = lang === 'ja' ? './' : '../';
  const hrefEn = lang === 'ja' ? 'en/' : './';
  const on = `background: #ffffff; color: ${v.accent}; text-decoration: none; padding: 0 12px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center`;
  const off = `background: transparent; color: #c3cddd; text-decoration: none; padding: 0 12px; min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center`;
  $('[role="group"][aria-label="Language"]').html(
    `<a href="${hrefJa}" hreflang="ja" lang="ja" data-setlang="ja" ${lang === 'ja' ? 'aria-current="page"' : ''} style="${lang === 'ja' ? on : off}">JP</a>` +
    `<a href="${hrefEn}" hreflang="en" lang="en" data-setlang="en" ${lang === 'en' ? 'aria-current="page"' : ''} style="${lang === 'en' ? on : off}">EN</a>`
  );

  // Form wiring
  const form = $('form').first();
  form.attr('id', 'contact-form').attr('action', FORM_ENDPOINT).attr('method', 'POST');
  $('#f-name').attr('name', 'name').attr('autocomplete', 'name');
  $('#f-org').attr('name', 'organization').attr('autocomplete', 'organization');
  $('#f-mail').attr('name', 'email').attr('autocomplete', 'email');
  // HTML parsing drops the custom sc-for inside select, so build these options directly.
  const topic = $('#f-type').attr('name', 'topic').empty();
  topic.append($('<option></option>').attr('value', '').text(t.fTypePlaceholder));
  t.options.forEach((label) => {
    topic.append($('<option></option>').attr('value', label).text(label));
  });
  $('#f-body').attr('name', 'message').attr('required', '');
  form.prepend(
    `<input type="hidden" name="_subject" value="${lang === 'ja' ? '【サイネスHP】お問い合わせ' : '[Sciness website] Inquiry'}">` +
    `<input type="hidden" name="language" value="${lang}">` +
    `<input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px; width: 1px; height: 1px">`
  );
  form.append(`<p id="form-status" role="status" aria-live="polite" style="margin: 0; font-size: 14px; color: #ffffff; min-height: 1.5em"></p>`);
  form.find('button[type="submit"]').attr('id', 'form-submit');
  form.css('position', 'relative');

  // Brand link to page top
  $('a[href="#top"]').first().attr('href', '#top');

  const title = lang === 'ja' ? 'サイネス合同会社｜Sciness, LLC. — サイエンス「を」ビジネスに' : 'Sciness, LLC. — Science, into business.';
  const desc = lang === 'ja'
    ? 'サイネス合同会社は、ヘルスケア・ライフサイエンス領域の新規事業プロデュースと、創薬・バイオ系スタートアップの事業計画、資金調達、アライアンスを支援します。'
    : 'Sciness builds new ventures in healthcare and life sciences and partners with drug discovery and biotech startups on business planning, fundraising and strategic alliances.';
  const url = lang === 'ja' ? SITE + '/' : SITE + '/en/';
  const msgs = lang === 'ja'
    ? { sending: '送信しています…', ok: 'お問い合わせを受け付けました。内容を確認のうえ、ご連絡いたします。', ng: '送信できませんでした。時間をおいて再度お試しいただくか、メールにてご連絡ください。' }
    : { sending: 'Sending…', ok: 'Thank you. We have received your message and will be in touch shortly.', ng: 'Sorry, your message could not be sent. Please try again later or contact us by email.' };

  const autoLang = lang === 'ja' ? `
(function(){try{var p=localStorage.getItem('sciness-lang');if(p==='en'){location.replace('en/');return;}if(p)return;var l=(navigator.languages&&navigator.languages[0])||navigator.language||'ja';if(String(l).toLowerCase().indexOf('ja')!==0){location.replace('en/');}}catch(e){}})();` : '';

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ja" href="${SITE}/">
<link rel="alternate" hreflang="en" href="${SITE}/en/">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sciness, LLC.">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/og.png">
<meta property="og:locale" content="${lang === 'ja' ? 'ja_JP' : 'en_US'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${prefix}favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${prefix}assets/sciness-apple-touch-icon.png">
<meta name="theme-color" content="${v.accent}">
${autoLang ? `<script>${autoLang}</script>` : ''}
${helmet.trim()}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Sciness, LLC.', alternateName: 'サイネス合同会社', url: SITE + '/', logo: SITE + '/assets/sciness-logo.svg', founder: { '@type': 'Person', name: 'Toshinori Mishina', alternateName: '三品 聡範' }, address: { '@type': 'PostalAddress', addressLocality: 'Chuo-ku', addressRegion: 'Tokyo', addressCountry: 'JP' } })}</script>
</head>
<body>
${$.html().trim()}
<script>
(function(){
  document.querySelectorAll('[data-setlang]').forEach(function(a){a.addEventListener('click',function(){try{localStorage.setItem('sciness-lang',a.getAttribute('data-setlang'));}catch(e){}});});
  var f=document.getElementById('contact-form');if(!f)return;
  var s=document.getElementById('form-status'),b=document.getElementById('form-submit');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    if(f.action.indexOf('YOUR_FORM_ID')>-1){s.textContent=${JSON.stringify(msgs.ng)};return;}
    b.disabled=true;s.textContent=${JSON.stringify(msgs.sending)};
    fetch(f.action,{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}})
      .then(function(r){if(!r.ok)throw new Error(r.status);f.reset();s.textContent=${JSON.stringify(msgs.ok)};})
      .catch(function(){s.textContent=${JSON.stringify(msgs.ng)};})
      .then(function(){b.disabled=false;});
  });
})();
</script>
</body>
</html>
`;
}

fs.mkdirSync(path.join(OUT, 'en'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), page('ja'));
fs.writeFileSync(path.join(OUT, 'en', 'index.html'), page('en'));
console.log('built', OUT, 'form:', FORM_ENDPOINT);
