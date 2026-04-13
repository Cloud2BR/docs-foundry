import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { markdownToHtml } = require('../src/renderer/markdown');

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
});