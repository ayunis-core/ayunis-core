import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Input } from '@ayunis/ui/components/input';

export function SkillStarterCard() {
  const { t } = useTranslation('skills');
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const examples = t('starter.examples', { returnObjects: true }) as string[];

  function start() {
    const trimmed = topic.trim();
    const prompt = trimmed
      ? `${t('createMenu.guidedPrompt')} ${t('starter.topicSuffix', { topic: trimmed })}`
      : t('createMenu.guidedPrompt');
    void navigate({ to: '/chat', search: { prompt } });
  }

  return (
    <Card data-testid="skill-starter-card">
      <CardHeader>
        <CardTitle>{t('starter.title')}</CardTitle>
        <CardDescription>{t('starter.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            start();
          }}
        >
          <Input
            aria-label={t('starter.title')}
            placeholder={t('starter.placeholder')}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            data-testid="skill-starter-topic"
          />
          <Button type="submit" data-testid="skill-starter-submit">
            {t('starter.submit')}
            <ArrowRight />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button
              key={example}
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setTopic(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
