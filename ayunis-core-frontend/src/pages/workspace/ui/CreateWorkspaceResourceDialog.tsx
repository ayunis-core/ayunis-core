import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';

export interface WorkspaceResourceFormData {
  name: string;
  description: string;
  instructions: string;
}

interface Props {
  buttonText: string;
  title: string;
  description: string;
  nameLabel: string;
  descriptionLabel: string;
  instructionsLabel?: string;
  confirmText: string;
  onCreate: (data: WorkspaceResourceFormData) => Promise<unknown>;
}

export function CreateWorkspaceResourceDialog(props: Readonly<Props>) {
  const { t } = useTranslation('workspace');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<WorkspaceResourceFormData>({
    name: '',
    description: '',
    instructions: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async () => {
    setIsSubmitting(true);
    try {
      await props.onCreate(data);
      setData({ name: '', description: '', instructions: '' });
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> {props.buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <ResourceFields data={data} onChange={setData} {...props} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('context.addDialog.cancel')}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={isSubmitting || !data.name || !data.description}
          >
            {props.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourceFields({
  data,
  onChange,
  nameLabel,
  descriptionLabel,
  instructionsLabel,
}: Readonly<
  Pick<Props, 'nameLabel' | 'descriptionLabel' | 'instructionsLabel'> & {
    data: WorkspaceResourceFormData;
    onChange: (data: WorkspaceResourceFormData) => void;
  }
>) {
  return (
    <div className="space-y-4">
      <Field label={nameLabel}>
        <Input
          value={data.name}
          onChange={(event) => onChange({ ...data, name: event.target.value })}
        />
      </Field>
      <Field label={descriptionLabel}>
        <Textarea
          value={data.description}
          onChange={(event) =>
            onChange({ ...data, description: event.target.value })
          }
        />
      </Field>
      {instructionsLabel ? (
        <Field label={instructionsLabel}>
          <Textarea
            value={data.instructions}
            onChange={(event) =>
              onChange({ ...data, instructions: event.target.value })
            }
          />
        </Field>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
