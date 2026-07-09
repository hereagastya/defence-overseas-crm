import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateStudentSchema, LeadScore, LEAD_SCORE_LABELS } from '@doc/shared';
import type { StudentWithCounselor, UpdateStudentInput } from '@doc/shared';
import { useUpdateStudent } from './api';
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

type EditFormValues = {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  country: string;
  nationality: string;
  course: string;
  passport_number: string;
  lead_score: LeadScore;
};

export function EditStudentDialog({ student, open, onOpenChange }: Props) {
  const { mutate: updateStudent, isPending } = useUpdateStudent();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(
      updateStudentSchema.pick({
        full_name: true,
        email: true,
        phone: true,
        date_of_birth: true,
        country: true,
        nationality: true,
        course: true,
        passport_number: true,
        lead_score: true,
      }),
    ),
    defaultValues: {
      full_name: student.full_name,
      email: student.email ?? '',
      phone: student.phone,
      date_of_birth: student.date_of_birth ?? '',
      country: student.country ?? '',
      nationality: student.nationality ?? '',
      course: student.course ?? '',
      passport_number: student.passport_number ?? '',
      lead_score: student.lead_score as LeadScore,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: student.full_name,
        email: student.email ?? '',
        phone: student.phone,
        date_of_birth: student.date_of_birth ?? '',
        country: student.country ?? '',
        nationality: student.nationality ?? '',
        course: student.course ?? '',
        passport_number: student.passport_number ?? '',
        lead_score: student.lead_score as LeadScore,
      });
    }
  }, [open, student, form]);

  function onSubmit(values: EditFormValues) {
    const input: UpdateStudentInput = {
      full_name: values.full_name,
      email: values.email === '' ? undefined : values.email,
      phone: values.phone,
      date_of_birth: values.date_of_birth === '' ? undefined : values.date_of_birth,
      country: values.country === '' ? undefined : values.country,
      nationality: values.nationality === '' ? undefined : values.nationality,
      course: values.course === '' ? undefined : values.course,
      passport_number: values.passport_number === '' ? undefined : values.passport_number,
      lead_score: values.lead_score,
    };

    updateStudent(
      { id: student.id, input },
      {
        onSuccess: () => {
          toast({ title: 'Student updated', description: 'Changes have been saved.' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>Update {student.full_name}&apos;s information.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date of Birth{' '}
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
                name="passport_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Passport <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="P1234567" disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Country <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nationality <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="course"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Course <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lead_score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(LeadScore).map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAD_SCORE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
