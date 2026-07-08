import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { convertLeadSchema } from '@doc/shared';
import type { LeadWithCounselor, ConvertLeadInput } from '@doc/shared';
import { useConvertLead } from './api';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  lead: LeadWithCounselor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertLeadDialog({ lead, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { mutate: convertLead, isPending } = useConvertLead();

  const form = useForm<ConvertLeadInput>({
    resolver: zodResolver(convertLeadSchema),
    defaultValues: {
      date_of_birth: '',
      course: lead.course ?? '',
      country: lead.country ?? '',
    },
  });

  function onSubmit(values: ConvertLeadInput) {
    const input: ConvertLeadInput = {
      date_of_birth: values.date_of_birth === '' ? undefined : values.date_of_birth,
      course: values.course === '' ? undefined : values.course,
      country: values.country === '' ? undefined : values.country,
    };

    convertLead(
      { id: lead.id, input },
      {
        onSuccess: (result) => {
          toast({
            title: 'Lead converted',
            description: `${lead.full_name} has been converted to a student.`,
          });
          onOpenChange(false);
          form.reset();
          if (result.student_id) {
            navigate(`/students/${result.student_id}`);
          }
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to Student</AlertDialogTitle>
          <AlertDialogDescription>
            Convert <strong>{lead.full_name}</strong> from a lead to a student record. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form id="convert-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date of Birth <span className="text-muted-foreground text-xs">(optional)</span>
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
              name="course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Course <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="MBBS" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Country <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Russia" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form="convert-form"
            disabled={isPending}
            className="bg-primary text-primary-foreground"
          >
            {isPending ? 'Converting…' : 'Convert to Student'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
