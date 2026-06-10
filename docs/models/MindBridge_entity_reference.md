# MindBridge — Entity Reference & Implementation Constraints

<!-- Source of truth: ER_3.docx + schema_mindbridge_v1.1.sql + Manual del sistema v1.2 -->
<!-- Last reviewed: June 2026 -->
<!-- When this file and ER_3 conflict, ER_3 prevails. Document discrepancies in blockers.md -->

---

## 1. Entities

| Entity                   | Key attributes (name: type)                                                                                                                                                                                                                                                                                                         | Maps to table              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Student                  | campus: udec_campus; codigoEstudianteEncrypted: string (AES-256-GCM); activePseudonymId: UUID; status: AccountStatus; casoFormalActivo: boolean (default false); optionalData: ComplementaryData                                                                                                                                    | student                    |
| Pseudonym                | text: string (3–30 chars, unique); assignedAt: datetime; status: PseudonymStatus; deactivatedAt: datetime [nullable]                                                                                                                                                                                                                | pseudonym                  |
| ComplementaryData        | fullName: string; academicProgram: string; semester: int (1–12); contactEmail: string                                                                                                                                                                                                                                               | complementary_data         |
| RegistrationConsent      | accepted: boolean (always true); acceptedAt: datetime; documentVersion: string; pseudonymAtAcceptance: string; mechanism: string                                                                                                                                                                                                    | registration_consent       |
| InformedConsentSignature | documentVersion: string; formCode: string (default FO-BU-O13); mechanism: string; pseudonymId: UUID; signedAt: datetime                                                                                                                                                                                                             | informed_consent_signature |
| Psychologist             | name: string; campusInstitutionalEmail: string; campus: udec_campus; shift: ShiftType; status: AccountStatus; emailAlertsSubscribed: boolean (default true); forumParticipationEnabled: boolean (default false); institutionalPseudonym: string (default "Equipo de Bienestar Universitario")                                       | psychologist               |
| Post                     | textContent: string; createdAt: datetime; updatedAt: datetime; status: ContentStatus                                                                                                                                                                                                                                                | post                       |
| Comment                  | textContent: string; citedCommentId: UUID [nullable]; createdAt: datetime; status: ContentStatus                                                                                                                                                                                                                                    | comment                    |
| NlpAnalysis              | analyzedTextSnapshot: string; anxietyProbability: float (0–100); depressiveProbability: float (0–100); suicidalProbability: float (0–100); suicidalOverride: boolean; baseMalaiseIndex: float (0–100); communityRulesInfraction: boolean; contentId: UUID; contentType: ContentType; analyzedAt: datetime; topClinicalLabel: string | nlp_analysis               |
| Alert                    | riskLevel: RiskLevel; status: AlertStatus; assignedPsychologistId: UUID [nullable]; generatedAt: datetime; acceptedAt: datetime [nullable]; closedAt: datetime [nullable]; isComplementary: boolean; aiGeneratedSummary: string; historicalSnapshot: JSONB; campus: udec_campus                                                     | alert                      |
| ClinicalCase             | caseType: CaseType; status: CaseStatus; assignedPsychologistId: UUID [nullable]; openedAt: datetime; adviserExportStatus: AdviserExportStatus; isUnsubscribedFromRecapture: boolean (default false)                                                                                                                                 | clinical_case              |
| ChatRoom                 | status: ChatStatus; openedAt: datetime; lastActivityAt: datetime; closedAt: datetime [nullable]                                                                                                                                                                                                                                     | chat_room                  |
| ChatMessage              | textContent: string; sentAt: datetime; senderRole: MessageSenderRole; read: boolean; messageType: MessageType                                                                                                                                                                                                                       | chat_message               |
| ExportCase               | destinationEmail: string; exportedAt: datetime; sendStatus: AdviserExportStatus; format: ExportFormat; includedOptionalFields: JSONB                                                                                                                                                                                                | export_case                |
| InAppNotification        | message: string; riskLevel: RiskLevel [nullable]; relatedEntityId: UUID [nullable]; read: boolean; createdAt: datetime; userRole: UserRoleType                                                                                                                                                                                      | in_app_notification        |

> **Note on `Student.hashPassword`:** This column is NOT in schema v1.1. If using Supabase Auth (recommended), authentication is delegated to `auth.users`; `student.id` becomes a FK to `auth.users(id)`. If using custom auth, add `password_hash TEXT NOT NULL` back. See design decision in `docs/notes/design-decisions.md`.

---

## 2. Relationships

| From         | Cardinality | To                       | Business rule                                                                                         |
| ------------ | ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Student      | 1:1..\*     | RegistrationConsent      | A new row is created each time the student accepts an updated terms version. Records are immutable.   |
| Student      | 1:0..1      | ComplementaryData        | Optional profile data collected only when exporting a case to Adviser.                                |
| Student      | 1:1..\*     | Pseudonym                | Only one pseudonym can be ACTIVE at a time. Changing pseudonyms does not break the student↔code link. |
| Student      | 1:0..1      | InformedConsentSignature | Created when the psychologist starts the formal care transition process (FO-BU-O13).                  |
| Student      | \*:1        | Rol                      | Fixed at registration. Not mutable by the user.                                                       |
| Psychologist | \*:1        | Rol                      | Fixed at account creation.                                                                            |
| Student      | 1:0..\*     | Post                     | A student can author many posts.                                                                      |
| Student      | 1:0..\*     | Comment                  | A student can author many comments.                                                                   |
| Post         | 1:0..\*     | Comment                  | Every comment belongs to exactly one root post. Max nesting depth: 1.                                 |
| NlpAnalysis  | 1:0..1      | Post                     | Exactly one of post_id or comment_id must be non-null (CHECK in schema).                              |
| NlpAnalysis  | 1:0..1      | Comment                  | Same constraint as above.                                                                             |
| NlpAnalysis  | 1:0..1      | Alert                    | An analysis may originate an alert only when risk_level > LOW.                                        |
| ClinicalCase | 1:1..\*     | Alert                    | A case groups one or more alerts.                                                                     |
| ClinicalCase | 0..\*:1     | Psychologist             | A psychologist can manage many cases. Assigned only after alert acceptance.                           |
| ClinicalCase | 0..\*:1     | Student                  | A case belongs to one student.                                                                        |
| ClinicalCase | 1:0..1      | ChatRoom                 | One active chat per case at any time.                                                                 |
| ClinicalCase | 1:0..1      | ExportCase               | Immutable on creation. One export record per case.                                                    |
| ChatRoom     | 0..1:1      | Alert                    | A chat room originates from an accepted alert.                                                        |
| ChatRoom     | 1:1..\*     | ChatMessage              | A room contains one or more messages.                                                                 |
| Psychologist | 1:0..\*     | Alert                    | A psychologist manages alerts from their campus only.                                                 |

---

## 3. Immutable records

These entities must NEVER receive UPDATE or DELETE. Enforce via RLS policies in Supabase.

| Table                        | Reason                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `nlp_analysis`               | Forensic integrity. Even if the content is edited or deleted, the original analysis must survive. |
| `registration_consent`       | Legal traceability. Document version + timestamp is the audit trail for MINTIC compliance.        |
| `export_case`                | Clinical traceability. The export record proves a case was referred to Adviser.                   |
| `informed_consent_signature` | Legal traceability for FO-BU-O13 compliance.                                                      |

---

## 4. Enums

All values stored in PostgreSQL and returned by the API are in English `UPPER_SNAKE_CASE`.  
**Frontend translates to Spanish** via `src/lib/i18n/` dictionaries. Never hardcode Spanish labels in API responses.

| Enum                | Values                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RiskLevel           | `LOW`, `MEDIUM`, `HIGH`                                                                                                                                                                                        |
| AlertStatus         | `PENDING`, `ACCEPTED`, `SERVED`, `FALSE_POSITIVE`, `COMPLEMENTARY`                                                                                                                                             |
| ContentStatus       | `VISIBLE`, `MODERATED`, `DELETED`                                                                                                                                                                              |
| ChatStatus          | `ACTIVE`, `CLOSED_BY_INACTIVITY`, `ARCHIVED`                                                                                                                                                                   |
| MessageType         | `STANDARD_TEXT`, `APPOINTMENT_PROPOSAL`, `CHARACTERIZATION_LINK`                                                                                                                                               |
| MessageSenderRole   | `STUDENT`, `PSYCHOLOGIST`                                                                                                                                                                                      |
| UserRoleType        | `STUDENT`, `PSYCHOLOGIST`                                                                                                                                                                                      |
| AccountStatus       | `ACTIVE`, `DELETED`, `SUSPENDED`                                                                                                                                                                               |
| PseudonymStatus     | `ACTIVE`, `HISTORICAL`                                                                                                                                                                                         |
| AdviserExportStatus | `NOT_EXPORTED`, `EXPORTED_SUCCESS`, `FAILED`                                                                                                                                                                   |
| CaseStatus          | `OPENED`, `ASSIGNED`, `ARCHIVED`, `RESOLVED`                                                                                                                                                                   |
| CaseType            | `AUTOMATIC_ALERT`, `SELF_REFERRAL`                                                                                                                                                                             |
| ContentType         | `POST`, `COMMENT`                                                                                                                                                                                              |
| ShiftType           | `SHIFT_1` (07:00–14:59:59), `SHIFT_2` (15:00–21:59:59) — timezone: `America/Bogota` (UTC-5)                                                                                                                    |
| ExportFormat        | `PDF`, `XML_PLACEHOLDER`                                                                                                                                                                                       |
| UdecCampus          | `CLAUSTRO_SAN_AGUSTIN`, `ZARAGOCILLA`, `PIEDRA_BOLIVAR`, `CLAUSTRO_LA_MERCED`, `CLAUSTRO_SANTO_DOMINGO`, `EL_CARMEN_DE_BOLIVAR`, `MAGANGUE`, `SAN_JUAN_NEPOMUCENO`, `SANTA_CRUZ_DE_MOMPOS`, `CERETE`, `LORICA` |

> **CampusUdeC display names:** The enum stores `UPPER_SNAKE_CASE` identifiers. The i18n dictionary maps them to human-readable Spanish names (e.g., `PIEDRA_BOLIVAR` → "Campus de Piedra de Bolívar").

---

## 5. Key integrity constraints

These constraints must be enforced both at the database level (CHECK constraints, UNIQUE indexes) and in application service logic.

```
PSEUDONYM
- text is globally unique (index: udx_pseudonym_texto)
- only one ACTIVE pseudonym per student (partial index: udx_pseudonym_one_active_per_student)
- cannot match the student's real name or student code (enforced in application layer, not DB)

STUDENT
- codigo_estudiante_encrypted is globally unique
- registration is invalid without: pseudonym, registration_consent, campus, age_declaration

ALERT
- PENDING status → assigned_psychologist_id must be NULL
- ACCEPTED | SERVED | FALSE_POSITIVE | COMPLEMENTARY → assigned_psychologist_id must NOT be NULL
  (CHECK: chk_alert_psychologist_by_status in schema)
- Only one psychologist can accept an alert (optimistic concurrency control in backend)

CHAT
- Chat room can only be created from a case with status `ASSIGNED` (after an alert has been accepted by a psychologist)
- Students cannot initiate a chat room (RF23, D-34)
- Only one active chat per case at a time (409 CHAT_ALREADY_EXISTS)

CONTENT DELETION
- Deleting a post/comment with HIGH or MEDIUM risk alert: content becomes DELETED in UI
  but the text is preserved internally in nlp_analysis.analyzed_text_snapshot
- Deleting a post/comment with LOW risk alert: cascades to alert + nlp_analysis
- Editing content creates a new NLP cycle; original analysis record is preserved, immutable

EXPORT
- Requires: case `ASSIGNED` + at least one chat initiated + psychologist institutional email configured
- 409 CHAT_REQUIRED_BEFORE_EXPORT if no chat exists

INFORMED CONSENT (FO-BU-O13)
- One per case (UNIQUE on case_id in informed_consent_signature)
- Delivered as a Google Forms external link from within the chat (CHARACTERIZATION_LINK message type)
- MindBridge does not store the signature; Adviser does. Sending the link is what the system tracks.
```

---

## 6. NLP pipeline rules (IMB formula and thresholds)

These values are configuration constants read from `config.py` (Python) or `config.ts` (TypeScript). Never hardcode them. Never expose them to the UI for modification (RF13).

```
IMB = 0.6 × p_depression + 0.4 × p_anxiety

Risk stratification (in strict priority order):
  1. text < 20 words AND matches immediate_risk_expressions.txt → SAFETY_FILTER_TRIGGERED (→ HIGH alert)
  2. text < 20 words AND no match                               → risk_level = null (no alert)
  3. p_suicidal ≥ 60                                           → HIGH (suicidal override, IMB ignored)
  4. IMB 0–39                                                  → LOW
  5. IMB 40–69                                                 → MEDIUM
  6. IMB ≥ 70                                                  → HIGH

Community norms classifier output: cumple_normas (boolean)
  - false = content contains aggression toward others, insults, doxxing, hate speech
  - true = everything else, INCLUDING suicidal ideation, depression, distress of the author
  The author's own suffering NEVER triggers a community violation (validated with psychologist).
```

---

## 7. Notification routing rules

```
For students:
  → in_app notification to new comments on their posts, new messages on the chat.

For psychologists

Alert risk level LOW | MEDIUM:
  → in_app notification to psychologists in the ACTIVE SHIFT of the student's campus

Alert risk level HIGH:
  → in_app notification to ALL psychologists on the student's campus (ignores shift)
  → Gmail API email to psychologists with email_alerts_subscribed = true on that campus
  → Cannot be silenced until a psychologist accepts the case

Active shift calculation: server time in America/Bogota (UTC-5)
  SHIFT_1: 07:00–14:59:59
  SHIFT_2: 15:00–21:59:59
  Outside both shifts: LOW/MEDIUM alerts are queued to next shift start;
                       HIGH alerts are sent immediately regardless
```

---

## 8. Functional requirements summary

Prioritization: **Alta** (critical), **Media** (necessary), **Baja** (complementary).

| Code | Name                                                    | Priority | Key implementation note                                                                                                                                                                                                                |
| ---- | ------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF01 | Student account registration                            | Alta     | Pseudonym unique check at type-time (real-time validation). Student code encrypted AES-256-GCM before persistence. Age minimum: **14 years** (not 18). Age verified via declaration checkbox + inference from student code digits 4–5. |
| RF02 | Terms and conditions acceptance                         | Alta     | Stored in `registration_consent` (immutable). Must contain 6 elements: purpose, NLP analysis, identity reveal conditions, voluntariness, legal framework, complementarity declaration.                                                 |
| RF03 | Appointment scheduling via Google Calendar              | Baja     | Integration pending technical feasibility check (D-33). Must always have a plain text date/time field as fallback.                                                                                                                     |
| RF04 | Case export PDF for Adviser                             | Media    | Requires: accepted case + one chat initiated. PDF generated with `pdf-lib`. Sent via Gmail API. Fixed field: `Origen = "MindBridge — contacto inicial vía foro bajo seudónimo"`.                                                       |
| RF05 | FO-BU-O13 consent facilitation                          | Media    | Backend injects Google Forms URL as CHARACTERIZATION_LINK message. System does not store the signature result.                                                                                                                         |
| RF06 | Psychologist forum participation (default disabled)     | Baja     | `forum_participation_enabled = false` at account creation. Re-enablement mechanism defined in design phase.                                                                                                                            |
| RF07 | Forum post creation                                     | Alta     | Visible immediately (0-second moderation). NLP pipeline triggers asynchronously. Content must remain visible if NLP times out.                                                                                                         |
| RF08 | Comment interaction                                     | Media    | Max nesting depth: 1 level. Comments can cite earlier comments from the same post, but cannot receive nested replies.                                                                                                                  |
| RF09 | Retroactive content moderation                          | Alta     | Automatic (NLP) or manual (actor TBD in design). Content is hidden by changing `status`, not deleted.                                                                                                                                  |
| RF10 | Community norms evaluation                              | Media    | Runs in parallel with clinical analysis. Violation result is independent of clinical risk level.                                                                                                                                       |
| RF11 | Content deletion with conditional preservation          | Media    | See key constraints in section 5.                                                                                                                                                                                                      |
| RF12 | Content editing with new NLP cycle                      | Media    | Original `nlp_analysis` record is immutable. Edit creates a new `nlp_analysis` linked to the updated version.                                                                                                                          |
| RF13 | Real-time linguistic analysis                           | Alta     | NLP thresholds are config constants, not UI-configurable. Minimum 20 words for semantic analysis.                                                                                                                                      |
| RF14 | Psychologist view of analyzed content                   | Alta     | Default view: trigger text + risk level + NLP scores. Extended view (on request): full chronological post history + previous alerts.                                                                                                   |
| RF15 | Differentiated notifications by risk, campus, shift     | Alta     | See section 7.                                                                                                                                                                                                                         |
| RF16 | Structured alert generation with acceptance model       | Alta     | Summary view (visible to all campus psychologists, no identity data). Detail view (only for accepting psychologist).                                                                                                                   |
| RF17 | Manual formal case flagging + complementary alerts      | Media    | Psychologist sets `student.caso_formal_activo = true`. Irreversible from UI. New alerts auto-tagged `COMPLEMENTARY`.                                                                                                                   |
| RF19 | Case acceptance with inter-psychologist confidentiality | Alta     | Optimistic concurrency: only one psychologist can accept. Alert disappears from peers' panels after acceptance.                                                                                                                        |
| RF20 | Recapture protocol for inactive chats                   | Baja     | Retry every 7 days (all channels). LOW/MEDIUM: archive after 30 days. HIGH: notify psychologist → backup email → delete 7 days later.                                                                                                  |
| RF21 | Identity reveal on case acceptance                      | Alta     | Automatic on acceptance. Reveals: student code (decrypted), campus, and complementary data if available. No notification sent to student.                                                                                              |
| RF22 | Privacy management for subsequent posts                 | Media    | De-anonymized student's new posts appear normally in forum. Link re-activates only when a new alert is accepted.                                                                                                                       |
| RF23 | Psychologist–student chat channel                       | Alta     | Only psychologist can initiate. Student identified as "Equipo de Bienestar Universitario" to student.                                                                                                                                  |
| RF24 | Psychologist actions split between alert panel and chat | Media    | Panel actions: mark served, mark false positive, close case (requires chat + double confirmation). Chat actions: propose appointment, attach resource, close conversation.                                                             |

---

## 9. Design constraints (RD)

These are non-negotiable. No implementation decision can violate them.

| Code  | Constraint                                   | Implementation impact                                                                                                                                                          |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RD-01 | AI component mandatory for risk detection    | NLP microservice is not optional. Cannot be skipped even in testing environments. Use ModelStub in tests.                                                                      |
| RD-02 | Complementary to institutional processes     | System never replaces Adviser. Export generates documents for manual entry in Adviser; no direct API integration.                                                              |
| RD-03 | Privacy and data protection regulations      | Ley 1581 (Colombia). Encrypted student codes. Controlled identity reveal. Audit-trail tables never deleted. RLS on all tables.                                                 |
| RD-04 | Controlled anonymity as structural principle | Identity and pseudonym separated at data model level. Only `ISecurityAndAccess.deanonymize()` can bridge them. NLP never receives real identity.                               |
| RD-05 | Mandatory external service integrations      | Google Calendar (RF03), Google Forms (RF05), Gmail (RF04, RF15).                                                                                                               |
| RD-06 | Role-based access control                    | All endpoints require valid JWT. Campus check on all psychologist endpoints. RLS enforces campus isolation at DB level.                                                        |
| RD-07 | Availability for critical scenarios          | HIGH alerts must reach all campus psychologists even if delivery infrastructure partially fails. Retry logic with fallback.                                                    |
| RD-08 | Mandatory technology stack                   | PostgreSQL via Supabase, Node.js/Fastify backend, Python/FastAPI NLP service. Frontend framework (Next.js 15) is a design decision, not a constraint, but is considered final. |

---

## 10. Limitations (L) — open decisions that constrain implementation

These are unresolved items from ER_3. Do NOT implement assumptions around them without explicit team decision.

| Code | Limitation                                                | Current status                                                                                                 | Impact on implementation                                                                                                                                               |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-01 | FO-BU-O13 digital signature mechanism                     | Preferred: Google Forms external link (confirmed by psychologist). Alternative: HTML canvas trace, typed name. | Use Google Forms URL from env variable. Inject as CHARACTERIZATION_LINK message type.                                                                                  |
| L-02 | Technology stack                                          | Resolved — RD-08.                                                                                              | No impact.                                                                                                                                                             |
| L-03 | Backend ↔ NLP communication protocol                      | REST (synchronous) vs. message queues (async).                                                                 | Current design: REST with 5s timeout + retry queue in backend. Async queue is future option.                                                                           |
| L-04 | Legal text of consent notice                              | Pending institutional review.                                                                                  | Consent text is in env config, not hardcoded. Structure requires 6 elements (section 8, RF02).                                                                         |
| L-05 | XML format for Adviser                                    | Future extension.                                                                                              | Export is PDF only in MVP. Schema has `XML_PLACEHOLDER` enum value reserved.                                                                                           |
| L-06 | NLP scope limited to 3 dimensions                         | Depression, anxiety, suicidal ideation only.                                                                   | Other disorders (bipolar, eating disorders, etc.) are future scope.                                                                                                    |
| L-07 | System does not exercise clinical judgment                | NLP scores are decision support, not diagnosis.                                                                | Never display NLP output as diagnoses. Always frame as "indicadores de riesgo".                                                                                        |
| L-08 | Ethics validation for non-notification of identity reveal | Confirmed with psychologist: yes, inform in consent.                                                           | Terms of service must state identity can be revealed without notice.                                                                                                   |
| L-09 | Minimum age 14 (not 18)                                   | Based on Resolution 309/2025 (Ministerio de Salud). Regulatory decree pending (Ley 2489/2025).                 | Registration form must ask "¿Tengo 14 años o más?" — NOT "¿Tengo 18 años o más?". Age verified via declaration + student code year inference. No ID document required. |
| L-10 | Frontend: web-first, responsive, mobile-first             | Next.js 15 with responsive design. No native mobile app in MVP.                                                | Use Tailwind responsive utilities. Student views designed mobile-first. Psychologist dashboard designed desktop-first.                                                 |
| L-11 | Password recovery without email                           | Recovery requires contacting institutional support. Admin resets hash.                                         | No self-service recovery flow. UI must show "Contacta al soporte técnico" message.                                                                                     |

---

## 11. Assumptions and dependencies (SA)

Preconditions the system assumes to be true. If any of these change, requirements are affected.

| Code  | Assumption                                                             | What breaks if violated                                                                              |
| ----- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| SA-01 | At least one active psychologist per campus                            | HIGH alerts have no recipient. System logs CRITICAL but cannot handle internally.                    |
| SA-02 | NLP thresholds (0.6/0.4 weights, 60 suicidal override) are acceptable  | Risk classification changes. Requires re-validation with psychologist before changing.               |
| SA-03 | Campus psychologists agree on who handles HIGH alerts among themselves | System sends to all. Assignment is a human process, not a system process.                            |
| SA-04 | Manual moderation actor will be defined in design phase                | RF09 backend logic must be extensible to any role. Do not hardcode "admin" as moderator.             |
| SA-05 | Case transfer between psychologists is out of scope for MVP            | No transfer endpoint. If needed, requires direct DB intervention + design decision.                  |
| SA-06 | Account deletion / psychologist turnover is managed externally         | No reassignment logic. Alerts from inactive psychologists remain orphaned until manual intervention. |
| SA-07 | Psychologist forum participation will remain disabled in MVP           | No enablement UI needed in MVP frontend.                                                             |
| SA-08 | Institutional support channel exists for password recovery             | If no support channel, L-11 mitigation does not work.                                                |

---

## 12. Security constraints (implementation checklist)

```
ENCRYPTION
- Student code: AES-256-GCM, key in STUDENT_CODE_ENCRYPTION_KEY env var
- Passwords: handled by Supabase Auth (if Supabase Auth path) or bcrypt/argon2 (if custom auth)
- JWT: RS256, issued and verified by Supabase Auth

TRANSPORT
- All client ↔ backend communication over HTTPS
- JWT in HttpOnly cookies managed by Next.js BFF (never in localStorage)
- Inter-service calls (backend → NLP): static Bearer token, high entropy, TLS 1.3

RLS
- All tables have RLS enabled
- auth.uid() in policies (Supabase Auth path)
- Campus isolation: psychologist cannot access student data from other campuses
- Student isolation: student can only read their own posts, comments, chat messages

AUDIT
- nlp_analysis, registration_consent, export_case: immutable (no UPDATE/DELETE via RLS)
- Deanonymization events logged (alert.accepted_at + assigned_psychologist_id)
```

---

## 13. Attribute name corrections (schema v1.1 canonical names)

The following names appear inconsistently across documents. The schema v1.1 column names are canonical.

| Old name (in some diagrams) | Canonical name (schema v1.1)   | Table                           |
| --------------------------- | ------------------------------ | ------------------------------- |
| `codigostudianteconpasw`    | `codigo_estudiante_encrypted`  | student                         |
| `hashPassword`              | — (removed; use Supabase Auth) | student                         |
| `analyzedTextOption`        | `analyzed_text_snapshot`       | nlp_analysis                    |
| `baseMeterIndex`            | `base_malaise_index`           | nlp_analysis                    |
| `suicidalBehavior`          | `suicidal_override`            | nlp_analysis                    |
| `checkcomment`              | `cited_comment_id`             | comment                         |
| `turno`                     | `shift`                        | psychologist                    |
| `case`                      | `clinical_case`                | — (reserved word in PostgreSQL) |
