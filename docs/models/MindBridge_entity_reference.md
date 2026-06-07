## Entities

| Entity | Key attributes (name: type) | Maps to table |
|---|---|---|
| Estudiante | encrypted_code: string; pseudonym: string; seat: Seat; password_hash: string; case_formal_active: boolean | Estudiante |
| Psicólogo | full_name: string; institutional_email: string; seat: Seat; institutional_pseudonym: string | Psicólogo |
| Publicación | author: Estudiante; text: string; posted_at: datetime; status: ContentStatus | Publicación |
| Comentario | author: Estudiante; root_post: Publicación; text: string; posted_at: datetime; status: ContentStatus | Comentario |
| AnalisisNLP | source_content: Publicación/Comentario; p_depresion: number; p_ansiedad: number; p_suicida: number; imb: number; override_suicida: boolean; risk_level: RiskLevel | AnalisisNLP |
| Alerta | trigger_analysis: AnalisisNLP; student: Estudiante; seat: Seat; risk_level: RiskLevel; status: AlertStatus; accepted_by: Psicólogo? | Alerta |
| Chat | alert: Alerta; initiator: Psicólogo; student: Estudiante; status: ChatStatus; last_message_at: datetime | Chat |
| MensajeChat | chat: Chat; sender: Estudiante/Psicólogo; message_type: MessageType; text: string; sent_at: datetime | MensajeChat |
| ConsentimientoRegistro | student: Estudiante; pseudonym_at_acceptance: string; doc_version: string; accepted_at: datetime | ConsentimientoRegistro |
| ExportacionCaso | alert: Alerta; psychologist: Psicólogo; exported_at: datetime | ExportacionCaso |

## Relationships

| From | Cardinality | To | Business rule (one sentence) |
|---|---|---|---|
| Seat | 1:N | Estudiante | Each student belongs to one seat, and each seat groups many students. |
| Seat | 1:N | Psicólogo | Each psychologist is assigned to one seat. |
| Estudiante | 1:N | Publicación | A student can author many posts, and each post has one author. |
| Estudiante | 1:N | Comentario | A student can author many comments, and each comment has one author. |
| Publicación | 1:N | Comentario | Every comment belongs to one root post; second-level replies are not allowed. |
| Publicación/Comentario | 1:0..1 | AnalisisNLP | A content item generates at most one analysis record. |
| AnalisisNLP | 1:0..1 | Alerta | Only qualifying analyses create an alert. |
| Alerta | 1:0..1 | Psicólogo | A pending alert has no assignee; an accepted alert has exactly one psychologist. |
| Alerta | 1:0..1 | Chat | Only an accepted alert can open a chat. |
| Chat | 1:N | MensajeChat | A chat contains the exchanged messages. |
| Alerta | 1:0..1 | ExportacionCaso | Export is optional and one-time per case. |
| Psicólogo | 1:N | ExportacionCaso | One psychologist can export many cases, but each export belongs to one psychologist. |
| Estudiante | 1:N | ConsentimientoRegistro | A student can have multiple consent records. |

## Immutable records

- AnalisisNLP
- ConsentimientoRegistro
- ExportacionCaso

## Key constraints

- Pseudonym must be unique among active accounts and cannot match the student’s real name or code.
- Encrypted student code must be unique; no two active student accounts can share it.
- Student registration is invalid without a seat and consent.
- An accepted alert must have exactly one psychologist; a pending alert must have none.
- A chat can only exist from an accepted alert; students cannot start one.
- Deleting a low-risk post or comment cascades to its alert; medium and high risk content are preserved.
- Editing content creates a new NLP cycle and does not modify the original analysis.
- Consent updates require re-acceptance before continued use.
- Case export requires an accepted case, one chat, and the psychologist’s institutional email.

## Enums

| Enum name | Values (comma-separated) |
|---|---|
| RiskLevel | LOW, MEDIUM, HIGH |
| AlertStatus | PENDING, ACCEPTED, ATTENDED, FALSE_POSITIVE, COMPLEMENTARY |
| ContentStatus | VISIBLE, MODERATED, DELETED |
| ChatStatus | ACTIVE, ARCHIVED, DELETED |
| MessageType | TEXT, APPOINTMENT_PROPOSAL, WELLBEING_RESOURCE |
