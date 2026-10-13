# TURN and call audit — 13 October 2026

## Current production evidence

- Repository `main`: `eacb297ae26524505c0f5970de18aaa6747aa177`.
- Supabase project: Meditaly, `ejlhgtodmcadmdhbujkf`, healthy. `voice-call` is active, deployment version 6, `verify_jwt=false`. Its downloaded source exactly matches the repository's baseline source. The function validates POST sessions itself with `auth.getUser`; disabling the gateway JWT check does not by itself grant credentials.
- Live GET returned HTTP 200 and `{"calls_configured":true,"provider":"cloudflare"}`. Both Cloudflare settings are therefore nonempty and the key ID passes the code's format check. Their actual validity, account ownership, expiry/revocation and TURN traffic have **not** been verified. No permanent key or temporary credential was retrieved or exposed.
- Live POST without a bearer and with an invalid synthetic bearer both returned HTTP 401 `NOT_AUTHORIZED`.
- Production RLS is enabled on `voice_calls`, `voice_call_signals` and the private quota table. Calls/signals are readable only through a participant predicate which also checks active accounts and the active patient–clinician link. Device token policies are scoped to their owner. TURN requests use a scoped RPC for authorization and serialized per-account quotas: six/minute, 100/UTC day.
- `private.is_clinician_aal2()` currently checks only the Clinician role, **not** JWT assurance level. The Android web client explicitly has `APP_MFA_ENABLED=false` (temporary suspension). Therefore the earlier documentation's MFA guarantee is not true for the current deployment. Re-enabling MFA requires a coordinated authentication change across the clinician dashboard, client and database; this PR does not silently change the existing login policy.

## Demonstrated failures and fixes

1. Failed push attempts (missing Firebase configuration, missing device tokens or zero accepted deliveries) left `push_claimed_at` set. A retry falsely returned `ok:true` without sending. Release the claim after zero confirmed deliveries using a timestamp comparison, retain it after an accepted delivery, and report an existing claim conservatively rather than treating it as delivery evidence. Add expiry to the atomic claim predicate and eight-second OAuth/FCM request deadlines. A timeout is an ambiguous delivery: a retry can redeliver; Android uses the same notification ID for the same call. A runtime crash before cleanup can still leave a claim; no background retry job is introduced.
2. A failed answer RPC after applying the remote offer was never retried, because the offer was skipped once `remoteDescription` existed. Preserve the generated answer and retry its publication. Treat the database's duplicate-answer acknowledgement as success after an uncertain response.
3. ICE candidates were removed in bulk before `addIceCandidate` completed. Failure discarded the failed candidate and all remaining candidates. Remove each candidate only after successful application. Persistent invalid candidates may still prevent connection and need device-level diagnosis.

Five regression scenarios failed on the baseline (missing Firebase retry, absent token cleanup, ICE retry, answer retry, generic FCM 404 token invalidation) and pass with these changes.

4. A generic FCM HTTP 404 deactivated device tokens even when the error did not identify a stale registration. Deactivate only on the structured FCM `UNREGISTERED` error, preserving valid devices during project/configuration failures.

## Executed checks

```sh
npm ci --prefix tests/interactive --ignore-scripts --no-audit --no-fund
node --test tests/communications/*.test.cjs
```

Result: **33/33 passing** on Node 24.19.0. These use synthetic credentials, mocked Cloudflare/FCM, fake media/RTC and JSDOM. They cover auth rejection, invalid/partial configuration, one-hour credential issuance, sanitized failures, coturn compatibility, push failure/retry/deduplication, data-only high-priority FCM payloads, consent, audio/video controls, permission denial and signaling retries. They do not measure actual media transport or Android delivery. The new PR workflow runs this suite without production secrets.

`database-rollback.sql` ran against the current Meditaly database in a single transaction using generated synthetic UUIDs. PASS: audio/video creation, busy guard, participant isolation, no answer before acceptance, accept/reject/end, signal cleanup, linked TURN authorization, minute/day quotas, window reset and relationship revocation. The transaction ends with ROLLBACK; no test users, relationships, calls, signals or quota rows remain. SQL JWT claims simulate roles; they are not signed sessions and cannot validate the live credential endpoint.

The five runnable existing interactive suites also passed **25/25**. Running the entire existing interactive glob fails because `gemini.test.cjs` references `supabase/functions/medi-patient-gemini/index.ts`, which is absent from this repository. This unrelated missing-source issue is not hidden or repaired by downloading production code. The historical nine TURN/backend and 19 communication scenarios mentioned in the old README are not provided as runnable call test files in this checkout; this PR adds a reproducible suite.

`git diff --check` and JavaScript syntax checks pass. An Android build/device test was not executed: this environment has no Android SDK, adb or connected phones. No production deployment, database migration, secret update or main-branch merge was performed.

## Android closed-app notification review

Source review confirms a data-only high-priority FCM invitation with call UUID, expiry and audio/video mode; `MeditalyMessagingService` dispatches it to `VoiceCallNotifications`. The notification expires with the invitation, uses a private lock-screen presentation and opens the activity with answer/reject actions. Native WebView capture requires the trusted origin and Android microphone/camera permissions. Release tasks require the original `google-services.json`; debug CI can build without Firebase if its secret is missing.

Actual Firebase backend configuration, installed build resources, device token registration, notification permission, channel sound/importance, OEM battery policy, cold-start navigation and delivery have not been verified on devices. An app process being closed is distinct from Android force-stop; a force-stopped app is not a supported reliable incoming-call condition until reopened. A stale notification can remain until its timeout if the caller ends early (there is no cancellation push). The microphone foreground service does not establish that WebView video survives backgrounding; that also requires device testing.

## Exact outstanding access/configuration checks

No missing Cloudflare secret is demonstrated: GET establishes both values are present. Needed to finish verification:

- A linked, active synthetic Patient session and synthetic Clinician session in an isolated test environment, including the intended MFA policy. The connector's SQL/admin access does not supply a signed end-user token. Real clinical accounts/data were not used.
- Authenticated `voice-call` POST `{action:"config"}` to prove the configured key/token pair can generate current ICE credentials. Cloudflare dashboard access is unavailable here, and no permanent Cloudflare token is available locally. Check the TURN key is active and its API token belongs to that key. Do not paste permanent tokens into source, logs or chat.
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` exists and matches the Android Firebase project, FCM API is enabled, and its service account can send messages. The current GET endpoint does not expose Firebase configuration; this audit cannot infer presence or absence from it.
- Verify `app/google-services.json` in the actual installed version 82 (package `com.ciromaiello.meditaly`) and, for CI builds, the repository secret `MEDITALY_GOOGLE_SERVICES_JSON`. Verify synthetic device registration and Android notification permission/channel settings. No real device tokens were read.

## Remaining relay and device acceptance test

In an authenticated synthetic test client, load `relay-probe.js` and call `await probeMeditalyRelay(testClient)`. It requests temporary credentials through the real endpoint, forces `iceTransportPolicy:'relay'` on two peers, exchanges a fixed synthetic marker and returns only boolean evidence. This probe has **not** been run. It proves same-client TURN data relay only; it is not a cross-network audio/video or push test. Keep ICE credentials, SDP and IP addresses out of the report.

For full acceptance, use an isolated clinician dashboard on Wi-Fi and synthetic patient Android on mobile data; repeat with networks reversed and with UDP blocked to test TURN/TLS on 443. Force relay in a test-only client and verify the selected candidate type plus increasing inbound/outbound RTP counters with `getStats`, reporting no addresses or SDP. Test audio and video in both directions; answer, refuse, caller cancellation, hang-up by either party, mute/unmute, camera off/on, denied permissions, unavailable devices, connection loss and track/service cleanup. Repeat incoming audio/video notifications with the Android app in the background, its process terminated normally and the phone locked. Verify the notification buttons restore the authenticated session and correct call. Separately record the force-stop limitation and expired/ended invitation behavior.

The operational verdict remains: **Cloudflare configuration present; live credential issuance, media relay and Android closed-app delivery not yet certified by this audit.**

Reference contracts checked during the audit:
- https://developers.cloudflare.com/realtime/turn/generate-credentials/
- https://firebase.google.com/docs/cloud-messaging/android/receive-messages
- https://supabase.com/changelog/cbc-tls-ciphers-deprecated (future legacy TLS cipher removal; no evidence it caused these failures)
