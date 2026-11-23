import { memo } from 'react';
import { Markdown, type MarkdownProps } from '@ayunis/chat/markdown';
import CodeBlock from './Codeblock';

function AppMarkdown(props: Readonly<MarkdownProps>) {
  return <Markdown {...props} codeBlock={CodeBlock} />;
}

export default memo(AppMarkdown);
