(function createMarkdownModule(globalScope, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  globalScope.DocFoundryMarkdown = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function markdownToHtml(source) {
    if (!source || !source.trim()) {
      return '<p class="preview-empty">Open a Markdown file to see the preview.</p>';
    }

    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const html = [];
    const paragraph = [];
    const usedHeadingIds = new Map();

    function flushParagraph() {
      if (paragraph.length === 0) return;
      html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph.length = 0;
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        continue;
      }

      if (trimmed.startsWith('```')) {
        flushParagraph();
        const lang = trimmed.slice(3).trim();
        const codeLines = [];
        index += 1;

        while (index < lines.length && !lines[index].trim().startsWith('```')) {
          codeLines.push(lines[index]);
          index += 1;
        }

        html.push(renderCodeBlock(codeLines.join('\n'), lang));
        continue;
      }

      if (/^#{1,6}\s+/.test(trimmed)) {
        flushParagraph();
        const [, hashes, text] = trimmed.match(/^(#{1,6})\s+(.+)$/);
        const id = createUniqueHeadingId(text, usedHeadingIds);
        html.push(`<h${hashes.length} id="${escapeAttribute(id)}">${renderInline(text)}</h${hashes.length}>`);
        continue;
      }

      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        flushParagraph();
        html.push('<hr/>');
        continue;
      }

      if (isTableStart(lines, index)) {
        flushParagraph();
        const { markup, nextIndex } = renderTable(lines, index);
        html.push(markup);
        index = nextIndex;
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        flushParagraph();
        const quoteLines = [];

        while (index < lines.length) {
          const quoteLine = lines[index];
          if (!quoteLine.trim()) {
            quoteLines.push('');
            index += 1;
            continue;
          }
          if (!/^>\s?/.test(quoteLine.trim())) break;

          quoteLines.push(quoteLine.replace(/^\s*>\s?/, ''));
          index += 1;
        }

        index -= 1;
        html.push(`<blockquote>${markdownToHtml(quoteLines.join('\n'))}</blockquote>`);
        continue;
      }

      if (isListItem(trimmed)) {
        flushParagraph();
        const { markup, nextIndex } = renderList(lines, index);
        html.push(markup);
        index = nextIndex;
        continue;
      }

      // Skip footnote definitions (rendered separately at the end)
      if (/^\[\^\d+\]:\s+/.test(trimmed)) {
        flushParagraph();
        continue;
      }

      paragraph.push(trimmed);
    }

    flushParagraph();

    // Collect footnote definitions and append as a footer section
    const footnoteBlock = collectFootnotes(source);
    if (footnoteBlock) html.push(footnoteBlock);

    return html.join('');
  }

  function collectFootnotes(source) {
    const defs = [];
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    for (const line of lines) {
      const match = line.match(/^\[\^(\d+)\]:\s+(.+)$/);
      if (match) {
        defs.push({ id: match[1], text: match[2] });
      }
    }
    if (defs.length === 0) return '';
    const items = defs.map(d =>
      `<li id="fn-${escapeAttribute(d.id)}"><p>${renderInline(d.text)} <a href="#fnref-${escapeAttribute(d.id)}" class="footnote-back">&crarr;</a></p></li>`
    ).join('');
    return `<section class="footnotes"><hr/><ol>${items}</ol></section>`;
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function createUniqueHeadingId(text, usedHeadingIds) {
    const baseId = slugify(text) || 'section';
    const seen = usedHeadingIds.get(baseId) || 0;
    usedHeadingIds.set(baseId, seen + 1);
    return seen === 0 ? baseId : `${baseId}-${seen + 1}`;
  }

  function renderCodeBlock(code, lang) {
    if ((lang || '').toLowerCase() === 'mermaid') {
      return `<div class="mermaid-block" data-mermaid="${escapeAttribute(code)}"></div>`;
    }
    const languageClass = lang ? ` class="language-${escapeAttribute(lang)}"` : '';
    return `<pre><code${languageClass}>${escapeHtml(code)}</code></pre>`;
  }

  function isListItem(line) {
    return /^([-*+]|\d+\.)\s+/.test(line);
  }

  function renderList(lines, startIndex) {
    const firstLine = lines[startIndex].trim();
    const ordered = /^\d+\./.test(firstLine);
    const tagName = ordered ? 'ol' : 'ul';
    const items = [];
    let index = startIndex;

    while (index < lines.length) {
      const trimmed = lines[index].trim();
      if (!trimmed) break;
      if (!isListItem(trimmed)) break;
      if (ordered !== /^\d+\./.test(trimmed)) break;

      const content = trimmed.replace(/^([-*+]|\d+\.)\s+/, '');
      const taskMatch = content.match(/^\[( |x|X)\]\s+(.+)$/);

      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        items.push(
          `<li class="task-item"><input type="checkbox" disabled${checked ? ' checked' : ''}/> ${renderInline(taskMatch[2])}</li>`
        );
      } else {
        items.push(`<li>${renderInline(content)}</li>`);
      }

      index += 1;
    }

    return {
      markup: `<${tagName}>${items.join('')}</${tagName}>`,
      nextIndex: index - 1
    };
  }

  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;

    const header = lines[index].trim();
    const separator = lines[index + 1].trim();
    return header.includes('|') && /^\|?\s*[:-]+(?:\s*\|\s*[:-]+)+\s*\|?$/.test(separator);
  }

  function renderTable(lines, startIndex) {
    const headerCells = splitTableRow(lines[startIndex]);
    const bodyRows = [];
    let index = startIndex + 2;

    while (index < lines.length) {
      const trimmed = lines[index].trim();
      if (!trimmed || !trimmed.includes('|')) break;
      bodyRows.push(splitTableRow(lines[index]));
      index += 1;
    }

    const headerMarkup = headerCells.map(cell => `<th>${renderInline(cell)}</th>`).join('');
    const bodyMarkup = bodyRows
      .map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
      .join('');

    return {
      markup: `<table><thead><tr>${headerMarkup}</tr></thead><tbody>${bodyMarkup}</tbody></table>`,
      nextIndex: index - 1
    };
  }

  function splitTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  }

  function renderInline(text) {
    let html = escapeHtml(text);
    const tokens = [];

    html = html.replace(/`([^`]+)`/g, (_match, code) => createToken(tokens, `<code>${code}</code>`));

    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => {
      const safeSrc = sanitizeUrl(src);
      return createToken(tokens, `<img alt="${escapeAttribute(alt)}" src="${safeSrc}" style="max-width:100%"/>`);
    });

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = sanitizeUrl(href);
      return createToken(tokens, `<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`);
    });

    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Highlight
    html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    // Footnote references
    html = html.replace(/\[\^(\d+)\]/g, '<sup class="footnote-ref"><a href="#fn-$1" id="fnref-$1">$1</a></sup>');

    return restoreTokens(html, tokens);
  }

  function createToken(tokens, markup) {
    const token = `__DOCFOUNDRY_TOKEN_${tokens.length}__`;
    tokens.push(markup);
    return token;
  }

  function restoreTokens(html, tokens) {
    return tokens.reduce(
      (currentHtml, tokenMarkup, index) => currentHtml.replace(`__DOCFOUNDRY_TOKEN_${index}__`, tokenMarkup),
      html
    );
  }

  function sanitizeUrl(url) {
    const trimmed = url.trim();
    const normalized = trimmed.toLowerCase();

    if (
      normalized.startsWith('javascript:') ||
      normalized.startsWith('vbscript:') ||
      normalized.startsWith('data:text/html') ||
      normalized.startsWith('data:image/svg+xml') ||
      normalized.startsWith('blob:') ||
      normalized.startsWith('file:') ||
      normalized.startsWith('mhtml:')
    ) {
      return '#';
    }

    return escapeAttribute(trimmed);
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, char => {
      const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
      };
      return entities[char];
    });
  }

  function escapeAttribute(text) {
    return escapeHtml(String(text)).replace(/'/g, '&#39;');
  }

  return {
    markdownToHtml,
    escapeHtml,
    sanitizeUrl,
    slugify
  };
});