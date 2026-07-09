import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckSquare,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  GraduationCap,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  User,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import {
  UserRole,
  STUDENT_STAGE_LABELS,
  LEAD_SCORE_LABELS,
  StudentStage,
  LeadScore,
} from '@doc/shared';
import type { StudentWithCounselor } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { useStudent } from './api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EditStudentDialog } from './EditStudentDialog';
import { StudentStageDialog } from './StudentStageDialog';
import { StudentAssignDialog } from './StudentAssignDialog';
import { StudentNotes } from './StudentNotes';
import { StudentTasks } from './StudentTasks';
import { StudentFollowUps } from './StudentFollowUps';
import { StudentTimeline } from './StudentTimeline';
import { StudentActivity } from './StudentActivity';
import { StudentApplications } from './StudentApplications';
import { StudentDocuments } from './StudentDocuments';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

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
  { id: 'notes', label: 'Notes', icon: MessageSquare },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'followups', label: 'Follow-ups', icon: CalendarClock },
  { id: 'applications', label: 'Applications', icon: FolderOpen },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'timeline', label: 'Timeline', icon: Activity },
  { id: 'activity', label: 'Activity', icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]['id'];

function StudentHeader({
  student,
  isAdmin,
  canEdit,
  onEdit,
  onStageUpdate,
  onAssign,
}: {
  student: StudentWithCounselor;
  isAdmin: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onStageUpdate: () => void;
  onAssign: () => void;
}) {
  const navigate = useNavigate();
  const isClosed = student.student_stage === StudentStage.CASE_CLOSED;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/students')}
          aria-label="Back to students"
          className="mt-0.5 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{student.full_name}</h1>
            <Badge variant={isClosed ? 'destructive' : 'secondary'}>
              {STUDENT_STAGE_LABELS[student.student_stage] ?? student.student_stage}
            </Badge>
            <Badge
              variant={
                student.lead_score === LeadScore.HOT
                  ? 'destructive'
                  : student.lead_score === LeadScore.WARM
                    ? 'default'
                    : 'secondary'
              }
            >
              {LEAD_SCORE_LABELS[student.lead_score as LeadScore] ?? student.lead_score}
            </Badge>
            {student.case_closed_at && (
              <Badge variant="outline" className="text-destructive border-destructive/40 gap-1">
                <XCircle className="h-3 w-3" />
                Case Closed
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {student.phone}
            {student.email ? ` · ${student.email}` : ''}
          </p>
        </div>
      </div>

      {(canEdit || isAdmin) && (
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
          {student.lead_id && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to={`/leads/${student.lead_id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                View Lead
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const { data: student, isLoading, isError } = useStudent(id ?? '');

  const [editOpen, setEditOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('notes');

  if (isLoading) return <DetailSkeleton />;

  if (isError || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <UserX className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Student not found.</p>
      </div>
    );
  }

  const canEdit =
    isAdmin ||
    student.assigned_counselor_id === currentUser?.id ||
    student.assigned_counselor_id === null;

  const isCounselor = currentUser?.role === UserRole.COUNSELOR;
  const canAccessApplicationsAndDocs = isAdmin || isCounselor;

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'activity') return isAdmin;
    if (t.id === 'applications' || t.id === 'documents') return canAccessApplicationsAndDocs;
    return true;
  });

  return (
    <div className="space-y-6">
      <StudentHeader
        student={student}
        isAdmin={isAdmin}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
        onStageUpdate={() => setStageOpen(true)}
        onAssign={() => setAssignOpen(true)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow icon={User} label="Full Name" value={student.full_name} />
            <InfoRow icon={Phone} label="Phone" value={student.phone} />
            <InfoRow icon={Mail} label="Email" value={student.email ?? '—'} />
            <InfoRow icon={Globe} label="Country" value={student.country ?? '—'} />
            <InfoRow icon={Globe} label="Nationality" value={student.nationality ?? '—'} />
            {student.date_of_birth && (
              <InfoRow icon={Calendar} label="Date of Birth" value={student.date_of_birth} />
            )}
            {student.passport_number && (
              <InfoRow icon={BookOpen} label="Passport" value={student.passport_number} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Student Details</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <InfoRow icon={GraduationCap} label="Course" value={student.course ?? '—'} />
            <InfoRow
              icon={UserCheck}
              label="Counselor"
              value={
                student.counselor_name ?? (
                  <span className="italic text-muted-foreground">Unassigned</span>
                )
              }
            />
            <InfoRow icon={Calendar} label="Created" value={formatDate(student.created_at)} />
            <InfoRow icon={Calendar} label="Updated" value={formatDate(student.updated_at)} />
            {student.case_closed_at && (
              <InfoRow
                icon={XCircle}
                label="Case Closed"
                value={formatDate(student.case_closed_at)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tab navigation */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
        {activeTab === 'notes' && <StudentNotes studentId={student.id} />}
        {activeTab === 'tasks' && <StudentTasks studentId={student.id} />}
        {activeTab === 'followups' && <StudentFollowUps studentId={student.id} />}
        {activeTab === 'applications' && canAccessApplicationsAndDocs && (
          <StudentApplications studentId={student.id} />
        )}
        {activeTab === 'documents' && canAccessApplicationsAndDocs && (
          <StudentDocuments studentId={student.id} />
        )}
        {activeTab === 'timeline' && <StudentTimeline studentId={student.id} />}
        {activeTab === 'activity' && isAdmin && <StudentActivity studentId={student.id} />}
      </div>

      {editOpen && (
        <EditStudentDialog student={student} open={editOpen} onOpenChange={setEditOpen} />
      )}
      {stageOpen && (
        <StudentStageDialog student={student} open={stageOpen} onOpenChange={setStageOpen} />
      )}
      {isAdmin && assignOpen && (
        <StudentAssignDialog student={student} open={assignOpen} onOpenChange={setAssignOpen} />
      )}
    </div>
  );
}
