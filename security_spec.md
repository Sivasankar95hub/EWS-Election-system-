# Firestore Security Specification

This document defines the zero-trust security architecture, data invariants, and the "Dirty Dozen" penetration test cases for the Edify Student Election System.

## 1. Data Invariants

1. **Election Settings Isolation**: Election settings can only be created, modified, or reset by verified Administrators (`shiva@ewskurnool.com` or `shiva957347@gmail.com`). Public clients have read-only access.
2. **Double-Voting Prevention**: Once a student's `hasVoted` field is set to `true`, it is terminal and immutable. No subsequent updates are allowed to their record under any circumstances.
3. **Secrecy of Ballots**: While the system increments a candidate's `votesCount` and logs the event, the voter document itself does **not** store who the voter chose. It only marks `hasVoted: true`. There is no link between candidate votes and voter records.
4. **Candidate Integrity**: Only authorized Administrators can add, edit, or delete candidates. Public users can ONLY increment a candidate's `votesCount` by exactly `1` in a single update operation.
5. **Activity Log Feed Append-Only**: Public users can create activity logs, but cannot update or delete existing log entries. Logs must contain correct student detail keys and use the authoritative server timestamp.

---

## 2. The "Dirty Dozen" Payloads

The following malicious payloads must be rejected (`PERMISSION_DENIED`):

| Test ID | Path | Action | Description / Payload Attack | Expected Result |
|---|---|---|---|---|
| **01** | `settings/config` | `write` | **Unauthorized Settings Update**: Non-admin user trying to update school name or status. | **DENIED** |
| **02** | `candidates/cand_1` | `create` | **Fake Candidate Registration**: Non-admin injecting their own candidate record. | **DENIED** |
| **03** | `candidates/cand_1` | `delete` | **Sabotage Candidate**: Non-admin deleting an active candidate doc. | **DENIED** |
| **04** | `candidates/cand_1` | `update` | **Candidate Spoof/Self-Vote Inflation**: Non-admin modifying candidate's `name` or manually setting `votesCount` to 5000 directly. | **DENIED** |
| **05** | `voters/EWS-1001` | `create` | **Malicious Voter Injection**: Non-admin register fake voters. | **DENIED** |
| **06** | `voters/EWS-1001` | `delete` | **Disenfranchise Voter**: Non-admin deleting registered voters. | **DENIED** |
| **07** | `voters/EWS-1001` | `update` | **Double-Voting Bypass**: Non-admin resetting `hasVoted: false` to vote twice. | **DENIED** |
| **08** | `voters/EWS-1001` | `update` | **Voter Detail Tampering**: Modify student name or section. | **DENIED** |
| **09** | `voters/EWS-1001` | `update` | **Client-Side Future Timestamp Inject**: Injecting a future timestamp in `votedAt` instead of `request.time`. | **DENIED** |
| **10** | `activity/log_1` | `delete` | **Audit Erasure**: Non-admin deleting live audit trail logs. | **DENIED** |
| **11** | `activity/log_1` | `update` | **Audit Tampering**: Modifying or altering existing activity log fields. | **DENIED** |
| **12** | `activity/log_1` | `create` | **Vandalism Log Entry**: Injecting log entries with extra/ghost fields (e.g. `isAdmin: true`). | **DENIED** |

---

## 3. Test Definitions (`firestore.rules.test.ts`)

The rules are validated using a simulated Firestore unit testing suite verifying all rules and ensuring maximum security.
