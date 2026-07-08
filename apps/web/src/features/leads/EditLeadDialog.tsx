import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateLeadSchema,
  LeadStatus,
  LeadScore,
  LeadStage,
  LEAD_STATUS_LABELS,
  LEAD_SCORE_LABELS,
  LEAD_STAGE_LABELS,
  LEAD_STAGE_ORDER,
} from '@doc/shared';
import type { LeadWithCounselor, UpdateLeadInput } from '@doc/shared';
import { useUpdateLead } from './api';
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

type EditFormValues = {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  nationality: string;
  course: string;
  passport_number: string;
  lead_stage: LeadStage;
  lead_status: LeadStatus;
  lead_score: LeadScore;
  notes: string;
};

const EDITABLE_STAGES = LEAD_STAGE_ORDER.filter((s) => s !== LeadStage.CONVERTED_TO_STUDENT);

export function EditLeadDialog({ lead, open, onOpenChange }: Props) {
  const { mutate: updateLead, isPending } = useUpdateLead();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(
      updateLeadSchema.pick({
        full_name: true,
        email: true,
        phone: true,
        country: true,
        nationality: true,
        course: true,
        passport_number: true,
        lead_stage: true,
        lead_status: true,
        lead_score: true,
        notes: true,
      }),
    ),
    defaultValues: {
      full_name: lead.full_name,
      email: lead.email ?? '',
      phone: lead.phone,
      country: lead.country ?? '',
      nationality: lead.nationality ?? '',
      course: lead.course ?? '',
      passport_number: lead.passport_number ?? '',
      lead_stage: lead.lead_stage,
      lead_status: lead.lead_status,
      lead_score: lead.lead_score,
      notes: lead.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: lead.full_name,
        email: lead.email ?? '',
        phone: lead.phone,
        country: lead.country ?? '',
        nationality: lead.nationality ?? '',
        course: lead.course ?? '',
        passport_number: lead.passport_number ?? '',
        lead_stage: lead.lead_stage,
        lead_status: lead.lead_status,
        lead_score: lead.lead_score,
        notes: lead.notes ?? '',
      });
    }
  }, [open, lead, form]);

  function onSubmit(values: EditFormValues) {
    const input: UpdateLeadInput = {
      full_name: values.full_name,
      email: values.email === '' ? undefined : values.email,
      phone: values.phone,
      country: values.country === '' ? undefined : values.country,
      nationality: values.nationality === '' ? undefined : values.nationality,
      course: values.course === '' ? undefined : values.course,
      passport_number: values.passport_number === '' ? undefined : values.passport_number,
      lead_stage: values.lead_stage,
      lead_status: values.lead_status,
      lead_score: values.lead_score,
      notes: values.notes === '' ? undefined : values.notes,
    };

    updateLead(
      { id: lead.id, input },
      {
        onSuccess: () => {
          toast({ title: 'Lead updated', description: 'Changes have been saved.' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>Update {lead.full_name}&apos;s information.</DialogDescription>
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
                name="passport_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Passport <span className="text-muted-foreground text-xs">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="lead_stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EDITABLE_STAGES.map((s) => (
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
                name="lead_status"
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
                        {Object.values(LeadStatus).map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAD_STATUS_LABELS[s]}
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input disabled={isPending} {...field} />
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
