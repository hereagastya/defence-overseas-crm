import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { FollowupType, FOLLOWUP_TYPE_LABELS, API_ENDPOINTS } from '@doc/shared';
import type { LeadWithCounselor, StudentWithCounselor, EmployeeWithUser } from '@doc/shared';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useCreateFollowUp } from './api';
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
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = z.object({
  type: z.nativeEnum(FollowupType),
  assigned_to: z.string().uuid('Assignee is required'),
  scheduled_at: z.string().min(1, 'Scheduled date and time is required'),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

type EntityType = 'lead' | 'student';
interface SelectedEntity {
  id: string;
  name: string;
}

function EntitySearchField({
  entityType,
  onEntityTypeChange,
  selectedEntity,
  onSelectEntity,
  onClear,
}: {
  entityType: EntityType;
  onEntityTypeChange: (type: EntityType) => void;
  selectedEntity: SelectedEntity | null;
  onSelectEntity: (entity: SelectedEntity) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: leadsData } = useQuery({
    queryKey: ['entity-search', 'leads', search],
    queryFn: () =>
      apiClient
        .get<{ data: { items: LeadWithCounselor[] } }>(API_ENDPOINTS.LEADS.LIST, {
          params: { search, limit: 8, page: 1 },
        })
        .then((r) => r.data.data.items),
    enabled: entityType === 'lead' && search.length >= 2,
    staleTime: 30_000,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['entity-search', 'students', search],
    queryFn: () =>
      apiClient
        .get<{ data: { items: StudentWithCounselor[] } }>(API_ENDPOINTS.STUDENTS.LIST, {
          params: { search, limit: 8, page: 1 },
        })
        .then((r) => r.data.data.items),
    enabled: entityType === 'student' && search.length >= 2,
    staleTime: 30_000,
  });

  const results: SelectedEntity[] =
    entityType === 'lead'
      ? (leadsData ?? []).map((l) => ({ id: l.id, name: l.full_name }))
      : (studentsData ?? []).map((s) => ({ id: s.id, name: s.full_name }));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedEntity) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Badge variant="secondary" className="text-xs capitalize">
          {entityType}
        </Badge>
        <span className="flex-1 text-sm">{selectedEntity.name}</span>
        <button
          type="button"
          onClick={() => {
            onClear();
            setSearch('');
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <Select
          value={entityType}
          onValueChange={(v) => {
            onEntityTypeChange(v as EntityType);
            setSearch('');
            setDropdownOpen(false);
          }}
        >
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={`Search ${entityType}s by name or phone…`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(e.target.value.length >= 2);
          }}
          onFocus={() => {
            if (search.length >= 2) setDropdownOpen(true);
          }}
        />
      </div>
      {dropdownOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelectEntity(r);
                setSearch('');
                setDropdownOpen(false);
              }}
            >
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {entityType}
              </Badge>
              {r.name}
            </button>
          ))}
        </div>
      )}
      {dropdownOpen && search.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 shadow-md">
          <p className="text-sm text-muted-foreground">No {entityType}s found.</p>
        </div>
      )}
    </div>
  );
}

export function CreateFollowUpDialog({ open, onOpenChange }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const { mutate: createFollowUp, isPending } = useCreateFollowUp();

  const [entityType, setEntityType] = useState<EntityType>('lead');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [entityError, setEntityError] = useState('');

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () =>
      apiClient
        .get<{ data: EmployeeWithUser[] }>(API_ENDPOINTS.EMPLOYEES.LIST)
        .then((r) => r.data.data),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: FollowupType.CALL,
      assigned_to: currentUser?.id ?? '',
      scheduled_at: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: FollowupType.CALL,
        assigned_to: currentUser?.id ?? '',
        scheduled_at: '',
        notes: '',
      });
      setSelectedEntity(null);
      setEntityType('lead');
      setEntityError('');
    }
  }, [open, currentUser, form]);

  function onSubmit(values: FormValues) {
    if (!selectedEntity) {
      setEntityError('Please link this follow-up to a lead or student.');
      return;
    }
    setEntityError('');

    const input = {
      type: values.type,
      assigned_to: values.assigned_to,
      scheduled_at: new Date(values.scheduled_at).toISOString(),
      notes: values.notes || undefined,
      lead_id: entityType === 'lead' ? selectedEntity.id : undefined,
      student_id: entityType === 'student' ? selectedEntity.id : undefined,
    };

    createFollowUp(input, {
      onSuccess: () => {
        toast({ title: 'Follow-up scheduled' });
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Follow-up</DialogTitle>
          <DialogDescription>Follow-ups must be linked to a lead or student.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(FollowupType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {FOLLOWUP_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Link To</p>
              <EntitySearchField
                entityType={entityType}
                onEntityTypeChange={(t) => {
                  setEntityType(t);
                  setSelectedEntity(null);
                }}
                selectedEntity={selectedEntity}
                onSelectEntity={(e) => {
                  setSelectedEntity(e);
                  setEntityError('');
                }}
                onClear={() => setSelectedEntity(null)}
              />
              {entityError && <p className="text-sm text-destructive">{entityError}</p>}
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(employees ?? []).map((e) => (
                        <SelectItem key={e.user_id} value={e.user_id}>
                          {e.full_name}
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
              name="scheduled_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled At</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" disabled={isPending} {...field} />
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
                    <Textarea
                      placeholder="Preparation notes…"
                      disabled={isPending}
                      rows={2}
                      className="resize-none"
                      {...field}
                    />
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
                {isPending ? 'Scheduling…' : 'Schedule Follow-up'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
