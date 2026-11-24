import { CodeBlock, type CodeBlockProps } from '@ayunis/chat/markdown';
import { useTheme } from '@/features/theme';

export default function ThemedCodeBlock(props: Readonly<CodeBlockProps>) {
  const { theme } = useTheme();
  return <CodeBlock {...props} isDark={theme === 'dark'} />;
}
