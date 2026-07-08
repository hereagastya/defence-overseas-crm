import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateEmployeeSchema, UserRole } from '@doc/shared';
import type { EmployeeWithUser, UpdateEmployeeInput } from '@doc/shared';
import { useUpdateEmployee } from './api';
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
  employee: EmployeeWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.COUNSELOR, label: 'Counselor' },
  { value: UserRole.PRE_COUNSELOR, label: 'Pre-Counselor' },
];

type EditFormValues = {
  full_name: string;
  phone: string;
  role: UserRole;
  designation: string;
};

export function EditEmployeeDialog({ employee, open, onOpenChange }: Props) {
  const { mutate: updateEmployee, isPending } = useUpdateEmployee();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(
      updateEmployeeSchema.pick({ full_name: true, phone: true, role: true, designation: true }),
    ),
    defaultValues: {
      full_name: employee.full_name,
      phone: employee.phone,
      role: employee.role,
      designation: employee.designation ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        full_name: employee.full_name,
        phone: employee.phone,
        role: employee.role,
        designation: employee.designation ?? '',
      });
    }
  }, [open, employee, form]);

  function onSubmit(values: EditFormValues) {
    const input: UpdateEmployeeInput = {
      full_name: values.full_name,
      phone: values.phone,
      role: values.role,
      designation: values.designation === '' ? undefined : values.designation,
    };

    updateEmployee(
      { id: employee.id, input },
      {
        onSuccess: () => {
          toast({ title: 'Employee updated', description: 'Changes have been saved.' });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>Update {employee.full_name}&apos;s profile.</DialogDescription>
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
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Designation <span className="text-muted-foreground text-xs">(optional)</span>
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
