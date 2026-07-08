import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  GitBranch,
  Globe,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  UserRole,
  LeadStage,
  LEAD_STAGE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_SCORE_LABELS,
  LEAD_SOURCE_LABELS,
  LeadStatus,
  LeadScore,
} from '@doc/shared';
import type { LeadWithCounselor, LeadSource } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { useLead } from './api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EditLeadDialog } from './EditLeadDialog';
import { StageUpdateDialog } from './StageUpdateDialog';
import { AssignCounselorDialog } from './AssignCounselorDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LeadNotes } from './LeadNotes';
import { LeadTasks } from './LeadTasks';
import { LeadFollowUps } from './LeadFollowUps';
import { LeadActivity } from './LeadActivity';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

const STAGE_BADGE_VARIANTS: Record<LeadStage, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    [LeadStage.NEW_INQUIRY]: 'outline',
    [LeadStage.PRE_COUNSELING]: 'secondary',
    [LeadStage.ONE_TO_ONE_COUNSELING]: 'secondary',
    [LeadStage.MOCK_TEST]: 'secondary',
    [LeadStage.WEBINAR]: 'secondary',
    [LeadStage.REGISTRATION]: 'default',
    [LeadStage.POST_COUNSELING]: 'default',
    [LeadStage.REGISTRATION_COMPLETED]: 'default',
    [LeadStage.CONVERTED_TO_STUDENT]: 'destructive',
  };

const STATUS_BADGE_VARIANTS: Record<
  LeadStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [LeadStatus.INTERESTED]: 'default',
  [LeadStatus.NOT_ANSWERED]: 'outline',
  [LeadStatus.CALL_BACK]: 'secondary',
  [LeadStatus.NOT_INTERESTED]: 'secondary',
  [LeadStatus.NEXT_YEAR]: 'secondary',
  [LeadStatus.DEAD]: 'destructive',
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

const TABS = [
  { id: 'notes', label: 'Notes', icon: BookOpen },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'followups', label: 'Follow-ups', icon: Calendar },
  { id: 'activity', label: 'Activity', icon: ClipboardList },
] as const;

type TabId = (typeof TABS)[number]['id'];

function LeadHeader({
  lead,
  isAdmin,
  canEdit,
  onEdit,
  onStageUpdate,
  onAssign,
  onConvert,
}: {
  lead: LeadWithCounselor;
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onStageUpdate: () => void;
  onAssign: () => void;
  onConvert: () => void;
}) {
  const navigate = useNavigate();
  const isConverted = lead.lead_stage === LeadStage.CONVERTED_TO_STUDENT;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/leads')}
          aria-label="Back to leads"
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{lead.full_name}</h1>
            <Badge variant={STAGE_BADGE_VARIANTS[lead.lead_stage]}>
              {LEAD_STAGE_LABELS[lead.lead_stage]}
            </Badge>
            <Badge variant={STATUS_BADGE_VARIANTS[lead.lead_status]}>
              {LEAD_STATUS_LABELS[lead.lead_status]}
            </Badge>
            <Badge
              variant={
                lead.lead_score === LeadScore.HOT
                  ? 'destructive'
                  : lead.lead_score === LeadScore.WARM
                    ? 'default'
                    : 'secondary'
              }
            >
              {LEAD_SCORE_LABELS[lead.lead_score]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ''}
          </p>
        </div>
      </div>

      {(canEdit || isAdmin) && !isConverted && (
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onStageUpdate} className="gap-2">
                <GitBranch className="h-3.5 w-3.5" />
                Stage
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onAssign} className="gap-2">
              <UserCheck className="h-3.5 w-3.5" />
              Assign
            </Button>
          )}
          {canEdit && (
            <Button variant="default" size="sm" onClick={onConvert} className="gap-2">
              <GraduationCap className="h-3.5 w-3.5" />
              Convert
            </Button>
          )}
        </div>
      )}

      {isConverted && lead.converted_to_student_id && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/students/${lead.converted_to_student_id}`)}
          className="gap-2"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          View Student
        </Button>
      )}
    </div>
  );
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const { data: lead, isLoading, isError } = useLead(id ?? '');

  const [editOpen, setEditOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('notes');

  if (isLoading) return <DetailSkeleton />;

  if (isError || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <UserX className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Lead not found.</p>
      </div>
    );
  }

  const canEdit =
    isAdmin ||
    lead.assigned_counselor_id === currentUser?.id ||
    lead.assigned_counselor_id === null;

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'activity') return isAdmin;
    return true;
  });

  return (
    <div className="space-y-6">
      <LeadHeader
        lead={lead}
        isAdmin={isAdmin}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
        onStageUpdate={() => setStageOpen(true)}
        onAssign={() => setAssignOpen(true)}
        onConvert={() => setConvertOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow icon={User} label="Full Name" value={lead.full_name} />
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Mail} label="Email" value={lead.email ?? '—'} />
            <InfoRow icon={Globe} label="Country" value={lead.country ?? '—'} />
            <InfoRow icon={Globe} label="Nationality" value={lead.nationality ?? '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow
              icon={BookOpen}
              label="Source"
              value={LEAD_SOURCE_LABELS[lead.lead_source as LeadSource] ?? lead.lead_source}
            />
            <InfoRow icon={GraduationCap} label="Course" value={lead.course ?? '—'} />
            <InfoRow
              icon={UserCheck}
              label="Counselor"
              value={
                lead.counselor_name ?? (
                  <span className="italic text-muted-foreground">Unassigned</span>
                )
              }
            />
            <InfoRow icon={Calendar} label="Created" value={formatDate(lead.created_at)} />
            <InfoRow icon={Calendar} label="Updated" value={formatDate(lead.updated_at)} />
            {lead.converted_at && (
              <InfoRow
                icon={GraduationCap}
                label="Converted"
                value={formatDate(lead.converted_at)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab navigation */}
      <div className="border-b">
        <div className="flex gap-0">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'notes' && <LeadNotes leadId={lead.id} />}
        {activeTab === 'tasks' && <LeadTasks leadId={lead.id} />}
        {activeTab === 'followups' && <LeadFollowUps leadId={lead.id} />}
        {activeTab === 'activity' && isAdmin && <LeadActivity leadId={lead.id} />}
      </div>

      {editOpen && <EditLeadDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />}
      {stageOpen && <StageUpdateDialog lead={lead} open={stageOpen} onOpenChange={setStageOpen} />}
      {isAdmin && assignOpen && (
        <AssignCounselorDialog lead={lead} open={assignOpen} onOpenChange={setAssignOpen} />
      )}
      {convertOpen && (
        <ConvertLeadDialog lead={lead} open={convertOpen} onOpenChange={setConvertOpen} />
      )}
    </div>
  );
}
