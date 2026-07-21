import { useState } from 'react';
import { useAssignLead } from './api';
import { useEmployees } from '@/features/employees/api';
import { toast } from '@/components/ui/use-toast';
import type { LeadWithCounselor } from '@doc/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Props {
  lead: LeadWithCounselor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignCounselorDialog({ lead, open, onOpenChange }: Props) {
  const { mutate: assignLead, isPending } = useAssignLead();
  const { data: employees, isLoading: employeesLoading } = useEmployees();

  const [selectedId, setSelectedId] = useState<string>(lead.assigned_counselor_id ?? '');

  const activeEmployees = (employees ?? []).filter((e) => e.is_active);

  function handleSubmit() {
    if (!selectedId) return;
    assignLead(
      { id: lead.id, counselor_id: selectedId },
      {
        onSuccess: (updated) => {
          toast({
            title: 'Counselor assigned',
            description: `Lead assigned to ${updated.counselor_name ?? 'counselor'}.`,
          });
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Counselor</DialogTitle>
          <DialogDescription>
            Assign a counselor to {lead.full_name}.
            {lead.counselor_name && (
              <span className="block mt-1 text-xs">
                Currently: <strong>{lead.counselor_name}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="counselor-select">Counselor</Label>
          <Select
            value={selectedId}
            onValueChange={setSelectedId}
            disabled={isPending || employeesLoading}
          >
            <SelectTrigger id="counselor-select">
              <SelectValue placeholder="Select a counselor…" />
            </SelectTrigger>
            <SelectContent>
              {activeEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.user_id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !selectedId}>
            {isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
