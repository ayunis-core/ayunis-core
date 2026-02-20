import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

interface InstallErrorStateProps {
  title: string;
  description: string;
}

export function InstallErrorState({
  title,
  description,
}: Readonly<InstallErrorStateProps>) {
  const { t } = useTranslation('install');

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button variant="outline" asChild>
          <Link to="/skills">{t('action.backToSkills')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
