import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, SkipForward, Upload, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ImportLeadRow, ImportLeadsSummary } from '@doc/shared';
import { useImportLeads, useCheckImportPhones, LEADS_KEY } from './api';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

// ── Session persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'doc-lead-import-session';
const SESSION_STALE_MS = 10 * 60 * 1000;

type StoredSession =
  | { phase: 'importing'; total: number; startedAt: number }
  | { phase: 'complete'; summary: ImportLeadsSummary };

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Phone normalization — must match lead.service.ts normalizePhone exactly ───

function normalizePhone(raw: string): string {
  // Strip spaces, dashes, dots, parentheses (same regex as backend)
  let p = raw.replace(/[\s\-.()]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  // Bare 10-digit Indian mobile (must start 6-9, same guard as backend)
  if (/^[6-9]\d{9}$/.test(p)) return '+91' + p;
  // 12-digit with 91 prefix but no + (e.g. 919XXXXXXXXX)
  if (/^91[6-9]\d{9}$/.test(p)) return '+' + p;
  return p;
}

// ── Constants + field options ─────────────────────────────────────────────────

const PREVIEW_ROWS = 5;

const LEAD_FIELD_OPTIONS = [
  { value: 'full_name', label: 'Full Name *' },
  { value: 'phone', label: 'Phone *' },
  { value: 'email', label: 'Email' },
  { value: 'course', label: 'Course' },
  { value: 'country', label: 'Country' },
  { value: 'nationality', label: 'Nationality' },
  { value: 'passport_number', label: 'Passport No.' },
  { value: 'notes', label: 'Notes / Remarks (merged)' },
  { value: 'ignore', label: '— Ignore —' },
] as const;

type LeadFieldValue = (typeof LEAD_FIELD_OPTIONS)[number]['value'];

const FIELD_ALIASES: Record<string, LeadFieldValue> = {
  name: 'full_name',
  'full name': 'full_name',
  'student name': 'full_name',
  'lead name': 'full_name',
  'candidate name': 'full_name',
  student: 'full_name',
  full_name: 'full_name',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  'mobile no': 'phone',
  'mobile number': 'phone',
  contact: 'phone',
  'contact no': 'phone',
  'phone no': 'phone',
  mob: 'phone',
  email: 'email',
  'email id': 'email',
  'email address': 'email',
  'e-mail': 'email',
  course: 'course',
  program: 'course',
  programme: 'course',
  stream: 'course',
  country: 'country',
  nation: 'country',
  destination: 'country',
  nationality: 'nationality',
  passport: 'passport_number',
  'passport no': 'passport_number',
  'passport number': 'passport_number',
  passport_number: 'passport_number',
  remarks: 'notes',
  remark: 'notes',
  comment: 'notes',
  comments: 'notes',
  note: 'notes',
  notes: 'notes',
  observation: 'notes',
  feedback: 'notes',
};

function autoMap(headers: string[]): Record<string, LeadFieldValue> {
  const result: Record<string, LeadFieldValue> = {};
  for (const header of headers) {
    const key = header.toLowerCase().trim();
    if (FIELD_ALIASES[key]) {
      result[header] = FIELD_ALIASES[key];
      continue;
    }
    const match = Object.entries(FIELD_ALIASES).find(
      ([alias]) => key.includes(alias) || alias.includes(key),
    );
    result[header] = match ? match[1] : 'ignore';
  }
  return result;
}

// ── File parsing ──────────────────────────────────────────────────────────────

async function parseSpreadsheet(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Spreadsheet has no sheets');
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (json.length === 0) throw new Error('Spreadsheet has no data rows');
  const headers = Object.keys(json[0]);
  const rows = json.map((r) => {
    const row: Record<string, string> = {};
    for (const h of headers) row[h] = String(r[h] ?? '').trim();
    return row;
  });
  return { headers, rows };
}

// ── Row transformation ────────────────────────────────────────────────────────

function buildImportRows(
  rawRows: Record<string, string>[],
  mapping: Record<string, LeadFieldValue>,
): ImportLeadRow[] {
  return rawRows.map((raw) => {
    const lead: Record<string, string> = {};
    const noteParts: string[] = [];
    for (const [col, field] of Object.entries(mapping)) {
      if (field === 'ignore') continue;
      const value = (raw[col] ?? '').trim();
      if (!value) continue;
      if (field === 'notes') {
        noteParts.push(value);
      } else {
        lead[field] = value;
      }
    }
    if (noteParts.length > 0) lead.notes = noteParts.join('\n');
    return lead as ImportLeadRow;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'result' | 'interrupted';

export function ImportLeadsDialog({ open, onOpenChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, LeadFieldValue>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportLeadsSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [interruptedTotal, setInterruptedTotal] = useState(0);

  // Dedup analysis state
  const [candidates, setCandidates] = useState<ImportLeadRow[]>([]);
  const [existingCount, setExistingCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  // Debug counters shown in preview (temporary verification aid)
  const [debugInfo, setDebugInfo] = useState<{
    totalCrmLeads: number;
    matchedByPhone: number;
    matchedByEmail: number;
  } | null>(null);

  const { mutate: importLeads } = useImportLeads();
  const { mutate: checkPhones } = useCheckImportPhones();

  // On open: detect an import interrupted by a page refresh or another tab
  useEffect(() => {
    if (!open) return;
    const session = readSession();
    if (!session || session.phase !== 'importing') return;
    const age = Date.now() - session.startedAt;
    if (age < SESSION_STALE_MS) {
      setInterruptedTotal(session.total);
      setStep('interrupted');
    } else {
      clearSession();
    }
  }, [open]);

  // Simulated progress animation while the HTTP request is in flight
  useEffect(() => {
    if (step !== 'importing') {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    setProgress(0);
    const estimatedMs = Math.max(4000, candidates.length * 30);
    const tickMs = 150;
    const CAP = 83;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (CAP / estimatedMs) * tickMs;
        return Math.min(next, CAP);
      });
    }, tickMs);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [step, candidates.length]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetDialog() {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParseError(null);
    setSummary(null);
    setProgress(0);
    setInterruptedTotal(0);
    setCandidates([]);
    setExistingCount(0);
    setInvalidCount(0);
    setIsAnalyzing(false);
    setAnalyzeError(null);
    setDebugInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen && step === 'importing') return;
    if (!nextOpen) {
      clearSession();
      resetDialog();
    }
    onOpenChange(nextOpen);
  }

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setParseError(null);
    setIsParsing(true);
    try {
      const { headers: h, rows: r } = await parseSpreadsheet(selected);
      setHeaders(h);
      setRawRows(r); // ALL rows — no cap
      setMapping(autoMap(h));
      setStep('mapping');
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read file');
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelected(f);
  }

  function handleAnalyze() {
    if (isAnalyzing) return;
    setAnalyzeError(null);
    setIsAnalyzing(true);

    const allRows = buildImportRows(rawRows, mapping);

    // Pass 1: filter invalid rows, normalize identifiers, deduplicate within the file
    let invalid = 0;
    let withinFileDups = 0;
    const seenPhones = new Set<string>();
    const validCandidates: ImportLeadRow[] = [];

    for (const row of allRows) {
      if (!row.full_name?.trim() || !row.phone?.trim()) {
        invalid++;
        continue;
      }
      const normalizedPhone = normalizePhone(row.phone);
      if (seenPhones.has(normalizedPhone)) {
        withinFileDups++;
        continue;
      }
      seenPhones.add(normalizedPhone);
      // Normalize email too (trim + lowercase)
      const normalizedEmail = row.email?.toLowerCase().trim() || undefined;
      validCandidates.push({ ...row, phone: normalizedPhone, email: normalizedEmail });
    }

    const phonesToCheck = validCandidates.map((r) => r.phone!);
    const emailsToCheck = validCandidates.map((r) => r.email ?? '').filter(Boolean);

    // If no valid rows, skip the API call
    if (phonesToCheck.length === 0) {
      setInvalidCount(invalid);
      setExistingCount(withinFileDups);
      setCandidates([]);
      setDebugInfo(null);
      setIsAnalyzing(false);
      setStep('preview');
      return;
    }

    // Pass 2: check all identifiers against the full CRM dataset (server fetches all, no .in() URL limit)
    checkPhones(
      { phones: phonesToCheck, emails: emailsToCheck },
      {
        onSuccess: (result) => {
          const existingPhoneSet = new Set(result.existing);
          const existingEmailSet = new Set(result.existingByEmail);

          // A candidate is "existing" if its phone OR email already exists in the CRM
          const newCandidates = validCandidates.filter(
            (r) => !existingPhoneSet.has(r.phone!) && !(r.email && existingEmailSet.has(r.email)),
          );
          const crmDups = validCandidates.length - newCandidates.length;

          setInvalidCount(invalid);
          setExistingCount(withinFileDups + crmDups);
          setCandidates(newCandidates);
          setDebugInfo(result.debug);
          setIsAnalyzing(false);
          setStep('preview');
        },
        onError: () => {
          setIsAnalyzing(false);
          setAnalyzeError('Could not check against existing leads. Please try again.');
        },
      },
    );
  }

  function handleImport() {
    if (step === 'importing' || candidates.length === 0) return;

    writeSession({ phase: 'importing', total: candidates.length, startedAt: Date.now() });
    setStep('importing');

    importLeads(candidates, {
      onSuccess: (result) => {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        clearSession();
        setProgress(100);
        setSummary(result);
        transitionTimerRef.current = setTimeout(() => setStep('result'), 400);
      },
      onError: (error: unknown) => {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        clearSession();

        // A server rejection has a `.response` body — that is an explicit failure.
        // Network timeouts and dropped connections have no `.response`: the server may
        // have continued inserting rows, so we must not report "Import failed".
        const isServerRejection =
          error !== null &&
          typeof error === 'object' &&
          'response' in error &&
          (error as { response?: unknown }).response != null;

        if (isServerRejection) {
          toast({
            title: 'Import failed',
            description: 'The server rejected the request. Check the file and try again.',
            variant: 'destructive',
          });
          setStep('preview');
        } else {
          queryClient.invalidateQueries({ queryKey: LEADS_KEY });
          setInterruptedTotal(candidates.length);
          setStep('interrupted');
        }
      },
    });
  }

  const canProceed =
    Object.values(mapping).includes('full_name') && Object.values(mapping).includes('phone');

  const simulatedCount = Math.floor((progress / 100) * candidates.length);

  // ── Step: Upload ──────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <>
        <div className="py-4 space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload spreadsheet"
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
          >
            <div className="rounded-full bg-muted p-3">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx and .csv — any size</p>
            </div>
            {isParsing && (
              <p className="text-xs text-muted-foreground animate-pulse">Reading file…</p>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          {file && !parseError && !isParsing && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground truncate flex-1">{file.name}</p>
              <button
                onClick={resetDialog}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step: Mapping ─────────────────────────────────────────────────────────

  function renderMapping() {
    return (
      <>
        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              <strong className="text-foreground">{rawRows.length}</strong> rows detected
            </span>
            <span className="text-xs text-muted-foreground">Source: {file?.name}</span>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Column Mapping
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-medium px-3 py-2 text-xs text-muted-foreground">
                      Spreadsheet Column
                    </th>
                    <th className="text-left font-medium px-3 py-2 text-xs text-muted-foreground">
                      Maps To
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header} className="border-t">
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                        {header}
                      </td>
                      <td className="px-3 py-1.5">
                        <Select
                          value={mapping[header] ?? 'ignore'}
                          onValueChange={(v) =>
                            setMapping((prev) => ({ ...prev, [header]: v as LeadFieldValue }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_FIELD_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!canProceed && (
              <p className="text-xs text-destructive mt-1.5">
                Map at least <strong>Full Name</strong> and <strong>Phone</strong> to continue.
              </p>
            )}
          </div>

          {analyzeError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{analyzeError}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setStep('upload')}>
            ← Back
          </Button>
          <Button onClick={handleAnalyze} disabled={!canProceed || isAnalyzing}>
            {isAnalyzing ? 'Checking…' : 'Continue →'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step: Preview ─────────────────────────────────────────────────────────

  function renderPreview() {
    const mappedHeaders = headers.filter((h) => mapping[h] !== 'ignore');
    const previewCandidates = candidates.slice(0, PREVIEW_ROWS);

    return (
      <>
        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total rows" value={rawRows.length} icon="total" />
            <StatCard label="New leads" value={candidates.length} icon="success" />
            <StatCard label="Already existing" value={existingCount} icon="duplicate" />
            <StatCard label="Invalid" value={invalidCount} icon="error" />
          </div>

          {/* Debug verification panel — visible during development */}
          {debugInfo && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2 text-xs space-y-1 font-mono">
              <p className="font-semibold text-blue-700 dark:text-blue-400 not-italic">
                [Debug] Duplicate check results
              </p>
              <p className="text-muted-foreground">
                Total spreadsheet rows: <strong>{rawRows.length}</strong>
              </p>
              <p className="text-muted-foreground">
                Total CRM leads fetched: <strong>{debugInfo.totalCrmLeads}</strong>
              </p>
              <p className="text-muted-foreground">
                Matched by phone: <strong>{debugInfo.matchedByPhone}</strong>
              </p>
              <p className="text-muted-foreground">
                Matched by email: <strong>{debugInfo.matchedByEmail}</strong>
              </p>
              <p className="text-muted-foreground">
                Invalid / skipped (no name or phone): <strong>{invalidCount}</strong>
              </p>
              <p className="text-muted-foreground">
                New leads (unmatched): <strong>{candidates.length}</strong>
              </p>
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                All leads in this file already exist in the CRM. Nothing to import.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Preview of new leads (first {Math.min(PREVIEW_ROWS, candidates.length)})
              </p>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {mappedHeaders.map((h) => (
                        <th
                          key={h}
                          className="text-left font-medium px-3 py-2 text-muted-foreground whitespace-nowrap"
                        >
                          {h}
                          <span className="ml-1 text-[10px] text-primary/70">
                            →{' '}
                            {LEAD_FIELD_OPTIONS.find((o) => o.value === mapping[h])?.label.replace(
                              ' *',
                              '',
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewCandidates.map((row, i) => (
                      <tr key={i} className="border-t">
                        {mappedHeaders.map((h) => {
                          const field = mapping[h];
                          const value =
                            field !== 'ignore'
                              ? String((row as Record<string, unknown>)[field] ?? '')
                              : '';
                          return (
                            <td
                              key={h}
                              className="px-3 py-1.5 max-w-[200px] truncate text-muted-foreground"
                            >
                              {value || <span className="italic opacity-50">empty</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            ← Back
          </Button>
          <Button onClick={handleImport} disabled={candidates.length === 0}>
            Import {candidates.length} new lead{candidates.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step: Importing ───────────────────────────────────────────────────────

  function renderImporting() {
    return (
      <>
        <div className="py-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Importing leads…</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {simulatedCount} / {candidates.length} rows processed
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Please keep this window open until the import finishes.
          </p>
        </div>

        <DialogFooter>
          <Button disabled>Importing…</Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step: Interrupted ─────────────────────────────────────────────────────

  function renderInterrupted() {
    return (
      <>
        <div className="py-4 space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Import was interrupted
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500">
                An import of {interruptedTotal} leads was in progress when this session was
                interrupted. Some leads may already have been saved.
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Check the leads list to confirm which leads were imported before starting a new import.
            Re-importing the same file is safe — duplicate phone numbers are skipped automatically.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              clearSession();
              queryClient.invalidateQueries({ queryKey: LEADS_KEY });
              handleClose(false);
            }}
          >
            Check Leads List
          </Button>
          <Button
            onClick={() => {
              clearSession();
              resetDialog();
            }}
          >
            Start New Import
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Step: Result ──────────────────────────────────────────────────────────

  function renderResult() {
    if (!summary) return null;

    // Combine pre-check skips with any race-condition dups the backend caught
    const totalExisting = existingCount + summary.duplicates;
    const totalInvalid = invalidCount + summary.errors.length;
    const allClean = summary.imported > 0 && totalExisting === 0 && totalInvalid === 0;

    return (
      <>
        <div className="py-4 space-y-5">
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total" value={rawRows.length} icon="total" />
            <StatCard label="Imported" value={summary.imported} icon="success" />
            <StatCard label="Existing" value={totalExisting} icon="duplicate" />
            <StatCard label="Invalid" value={totalInvalid} icon="error" />
          </div>

          {allClean && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                All {summary.imported} leads imported as <strong>New</strong>. The leads list has
                been refreshed.
              </p>
            </div>
          )}

          {summary.errors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Failed rows ({summary.errors.length})
              </p>
              <div className="rounded-md border max-h-48 overflow-y-auto">
                {summary.errors.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 text-xs border-t first:border-t-0"
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong>Row {e.row}</strong> — {e.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              handleClose(false);
              toast({
                title: 'Import complete',
                description: `${summary.imported} lead${summary.imported !== 1 ? 's' : ''} imported${totalExisting > 0 ? `, ${totalExisting} existing skipped` : ''}.`,
              });
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const titles: Record<Step, string> = {
    upload: 'Import Leads',
    mapping: 'Map Columns',
    preview: 'Review Import',
    importing: 'Importing…',
    result: 'Import Complete',
    interrupted: 'Import Interrupted',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            {titles[step]}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && renderUpload()}
        {step === 'mapping' && renderMapping()}
        {step === 'preview' && renderPreview()}
        {step === 'importing' && renderImporting()}
        {step === 'result' && renderResult()}
        {step === 'interrupted' && renderInterrupted()}
      </DialogContent>
    </Dialog>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

type StatIcon = 'total' | 'success' | 'duplicate' | 'error';

function StatCard({ label, value, icon }: { label: string; value: number; icon: StatIcon }) {
  const styles: Record<StatIcon, string> = {
    total: 'bg-muted/50',
    success: 'bg-green-500/10 text-green-700 dark:text-green-400',
    duplicate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    error: 'bg-destructive/10 text-destructive',
  };

  const icons: Record<StatIcon, React.ReactNode> = {
    total: null,
    success: <CheckCircle2 className="h-3.5 w-3.5" />,
    duplicate: <SkipForward className="h-3.5 w-3.5" />,
    error: <AlertCircle className="h-3.5 w-3.5" />,
  };

  return (
    <div className={`rounded-md border p-3 ${styles[icon]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icons[icon]}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
