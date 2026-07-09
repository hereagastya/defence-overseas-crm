import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateApplicationSchema, ApplicationStatus, APPLICATION_STATUS_LABELS } from '@doc/shared';
import type { UniversityApplication, UpdateApplicationInput } from '@doc/shared';
import { useUpdateApplication } from './api';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  studentId: string;
  application: UniversityApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormValues = {
  university_name: string;
  country: string;
  course: string;
  status: ApplicationStatus;
  applied_at: string;
  offer_received_at: string;
  offer_responded_at: string;
  notes: string;
};

export function EditApplicationDialog({ studentId, application, open, onOpenChange }: Props) {
  const { mutate: updateApplication, isPending } = useUpdateApplication(studentId);

  const form = useForm<FormValues>({
    resolver: zodResolver(updateApplicationSchema),
    defaultValues: {
      university_name: application.university_name,
      country: application.country,
      course: application.course,
      status: application.status as ApplicationStatus,
      applied_at: application.applied_at ?? '',
      offer_received_at: application.offer_received_at ?? '',
      offer_responded_at: application.offer_responded_at ?? '',
      notes: application.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        university_name: application.university_name,
        country: application.country,
        course: application.course,
        status: application.status as ApplicationStatus,
        applied_at: application.applied_at ?? '',
        offer_received_at: application.offer_received_at ?? '',
        offer_responded_at: application.offer_responded_at ?? '',
        notes: application.notes ?? '',
      });
    }
  }, [open, application, form]);

  function onSubmit(values: FormValues) {
    const input: UpdateApplicationInput = {
      university_name: values.university_name || undefined,
      country: values.country || undefined,
      course: values.course || undefined,
      status: values.status,
      applied_at: values.applied_at || undefined,
      offer_received_at: values.offer_received_at || undefined,
      offer_responded_at: values.offer_responded_at || undefined,
      notes: values.notes || undefined,
    };

    updateApplication(
      { id: application.id, input },
      {
        onSuccess: () => {
          toast({ title: 'Application updated' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
          <DialogDescription>Update {application.university_name}.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="university_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>University</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(ApplicationStatus).map((s) => (
                        <SelectItem key={s} value={s}>
                          {APPLICATION_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="applied_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Applied Date <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="offer_received_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Offer Received{' '}
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="offer_responded_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Offer Response Date{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isPending} {...field} />
                  </FormControl>
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
                    <Textarea disabled={isPending} rows={3} className="resize-none" {...field} />
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
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
