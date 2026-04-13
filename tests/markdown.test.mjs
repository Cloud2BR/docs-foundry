import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { markdownToHtml, sanitizeUrl, slugify } = require('../src/renderer/markdown');

describe('markdownToHtml', () => {
  it('renders grouped lists instead of loose list items', () => {
    const html = markdownToHtml('- one\n- two\n- [x] done');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<input type="checkbox" disabled checked/> done');
    expect(html).toContain('</ul>');
  });

  it('renders markdown tables', () => {
    const html = markdownToHtml('| Name | Status |\n| --- | --- |\n| Docs | Ready |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>Ready</td>');
  });

  it('neutralizes unsafe link protocols', () => {
    const html = markdownToHtml('[bad](javascript:alert(1))');
    expect(html).toContain('href="#"');
  });

  it('renders strikethrough with ~~', () => {
    const html = markdownToHtml('This is ~~deleted~~ text');
    expect(html).toContain('<del>deleted</del>');
  });

  it('renders highlight with ==', () => {
    const html = markdownToHtml('This is ==important== text');
    expect(html).toContain('<mark>important</mark>');
  });

  it('renders footnote references', () => {
    const html = markdownToHtml('See this[^1] note');
    expect(html).toContain('<sup');
    expect(html).toContain('1');
  });

  it('renders headings h1 through h6', () => {
    expect(markdownToHtml('# H1')).toContain('<h1');
    expect(markdownToHtml('## H2')).toContain('<h2');
    expect(markdownToHtml('### H3')).toContain('<h3');
    expect(markdownToHtml('#### H4')).toContain('<h4');
    expect(markdownToHtml('##### H5')).toContain('<h5');
    expect(markdownToHtml('###### H6')).toContain('<h6');
  });

  it('renders bold and italic inline', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>');
    expect(markdownToHtml('*italic*')).toContain('<em>italic</em>');
  });

  it('renders code blocks with language class', () => {
    const md = '```js\nconsole.log("hi")\n```';
    const html = markdownToHtml(md);
    expect(html).toContain('<code class="language-js">');
    expect(html).toContain('console.log');
  });

  it('renders Mermaid code fences as diagram placeholders', () => {
    const md = '```mermaid\ngraph TD\nA-->B\n```';
    const html = markdownToHtml(md);
    expect(html).toContain('class="mermaid-block"');
    expect(html).toContain('data-mermaid=');
  });

  it('renders inline code', () => {
    const html = markdownToHtml('Use `npm install`');
    expect(html).toContain('<code>npm install</code>');
  });

  it('renders blockquotes', () => {
    const html = markdownToHtml('> A wise quote');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('A wise quote');
  });

  it('renders horizontal rules', () => {
    expect(markdownToHtml('---')).toContain('<hr/>');
    expect(markdownToHtml('***')).toContain('<hr/>');
  });

  it('renders images with alt text', () => {
    const html = markdownToHtml('![alt text](image.png)');
    expect(html).toContain('<img');
    expect(html).toContain('alt="alt text"');
    expect(html).toContain('src="image.png"');
  });

  it('renders links', () => {
    const html = markdownToHtml('[click](https://example.com)');
    expect(html).toContain('<a');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('click</a>');
  });

  it('renders ordered lists', () => {
    const html = markdownToHtml('1. First\n2. Second');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('<li>Second</li>');
    expect(html).toContain('</ol>');
  });

  it('renders task list items', () => {
    const html = markdownToHtml('- [ ] Todo\n- [x] Done');
    expect(html).toContain('<input type="checkbox" disabled/>');
    expect(html).toContain('<input type="checkbox" disabled checked/>');
  });

  it('combines multiple inline styles', () => {
    const html = markdownToHtml('**bold** and ~~struck~~ and ==lit==');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<del>struck</del>');
    expect(html).toContain('<mark>lit</mark>');
  });

  it('adds id attributes to headings', () => {
    const html = markdownToHtml('## My Heading');
    expect(html).toContain('id="my-heading"');
  });

  it('renders footnote definitions as a footer section', () => {
    const md = 'See this[^1] note.\n\n[^1]: This is the footnote content.';
    const html = markdownToHtml(md);
    expect(html).toContain('<section class="footnotes">');
    expect(html).toContain('id="fn-1"');
    expect(html).toContain('This is the footnote content.');
    expect(html).toContain('&crarr;');
  });

  it('deduplicates repeated heading ids', () => {
    const html = markdownToHtml('## Overview\n\n## Overview');
    expect(html).toContain('id="overview"');
    expect(html).toContain('id="overview-2"');
  });

  it('does not render footnote definitions as paragraphs', () => {
    const md = 'Text[^1]\n\n[^1]: Definition here';
    const html = markdownToHtml(md);
    const paragraphs = html.match(/<p>/g) || [];
    // Should have 1 paragraph for "Text[^1]", not 2
    expect(paragraphs.length).toBe(1);
  });
});

describe('sanitizeUrl', () => {
  it('blocks javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeUrl('vbscript:msgbox')).toBe('#');
  });

  it('blocks data:text/html', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('blocks data:image/svg+xml', () => {
    expect(sanitizeUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('#');
  });

  it('blocks blob: protocol', () => {
    expect(sanitizeUrl('blob:http://evil.com/abc')).toBe('#');
  });

  it('blocks file: protocol', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
  });

  it('blocks mhtml: protocol', () => {
    expect(sanitizeUrl('mhtml:http://evil.com')).toBe('#');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('allows relative URLs', () => {
    expect(sanitizeUrl('./image.png')).toBe('./image.png');
  });
});

describe('slugify', () => {
  it('converts text to lowercase kebab-case', () => {
    expect(slugify('My Heading')).toBe('my-heading');
  });

  it('strips special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  spaced  ')).toBe('spaced');
  });
});