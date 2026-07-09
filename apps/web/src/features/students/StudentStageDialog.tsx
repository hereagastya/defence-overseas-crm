import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateStudentStageSchema, STUDENT_STAGE_LABELS, STUDENT_STAGE_ORDER } from '@doc/shared';
import type { StudentStage, StudentWithCounselor, UpdateStudentStageInput } from '@doc/shared';
import { useUpdateStudentStage } from './api';
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
  student: StudentWithCounselor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentStageDialog({ student, open, onOpenChange }: Props) {
  const { mutate: updateStage, isPending } = useUpdateStudentStage();

  const form = useForm<UpdateStudentStageInput>({
    resolver: zodResolver(updateStudentStageSchema),
    defaultValues: {
      student_stage: student.student_stage as StudentStage,
      notes: '',
    },
  });

  function onSubmit(values: UpdateStudentStageInput) {
    updateStage(
      { id: student.id, input: { ...values, notes: values.notes || undefined } },
      {
        onSuccess: (updated) => {
          toast({
            title: 'Stage updated',
            description: `Stage changed to ${STUDENT_STAGE_LABELS[updated.student_stage]}.`,
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
          <DialogDescription>Change the journey stage for {student.full_name}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="student_stage"
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
                      {STUDENT_STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STUDENT_STAGE_LABELS[s]}
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
