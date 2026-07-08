import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateLeadStageSchema, LeadStage, LEAD_STAGE_LABELS, LEAD_STAGE_ORDER } from '@doc/shared';
import type { LeadWithCounselor, UpdateLeadStageInput } from '@doc/shared';
import { useUpdateLeadStage } from './api';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  lead: LeadWithCounselor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALLOWED_STAGES = LEAD_STAGE_ORDER.filter((s) => s !== LeadStage.CONVERTED_TO_STUDENT);

export function StageUpdateDialog({ lead, open, onOpenChange }: Props) {
  const { mutate: updateStage, isPending } = useUpdateLeadStage();

  const form = useForm<UpdateLeadStageInput>({
    resolver: zodResolver(updateLeadStageSchema),
    defaultValues: {
      lead_stage: lead.lead_stage as LeadStage,
      notes: '',
    },
  });

  function onSubmit(values: UpdateLeadStageInput) {
    updateStage(
      { id: lead.id, input: { ...values, notes: values.notes || undefined } },
      {
        onSuccess: (updated) => {
          toast({
            title: 'Stage updated',
            description: `Stage changed to ${LEAD_STAGE_LABELS[updated.lead_stage]}.`,
          });
          onOpenChange(false);
          form.reset();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stage</DialogTitle>
          <DialogDescription>Change the pipeline stage for {lead.full_name}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="lead_stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALLOWED_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STAGE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Reason for stage change…" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating…' : 'Update Stage'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
