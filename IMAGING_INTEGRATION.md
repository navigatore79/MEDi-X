# MEDIapp DICOM client integration

The central intake and validator run on the existing Supabase project and Vercel med-italy project. No separate server is required. Canonical backend configuration and deployment checks are maintained in MedItaly PR #11: https://github.com/navigatore79/MedItaly/pull/11.

The backend integration is not yet commissioned. Vercel team authorization and successful container/antivirus tests are required before enabling patient delivery. No APK has been produced or published by this draft.

## Build the bundled viewer

From this Android repository root:

```sh
npm ci --prefix tools/imaging-viewer
npm run build --prefix tools/imaging-viewer
```

The generated assets go to app/src/main/assets/imaging-viewer-dist. Gradle preBuild blocks a missing viewer. GitHub Actions builds these assets before Gradle. The original package, Firebase configuration and version 85 are unchanged.

## Patient flow

The report archive includes Prestazioni del centro and a local ZIP opener. Received documents require account-scoped backend access and short-lived file URLs. Local ZIP import never submits a document to the center. The first serverless intake accepts 64 MiB total compressed input; local ZIP opening accepts 64 MiB compressed / 128 MiB expanded / 1,000 entries. Single image instances above 64 MiB are not displayed by this first viewer. No automatic plaintext offline cache is introduced.

Validate compressed and multiframe studies, Android WebView memory, real device behavior and notification delivery before release. The current backend creates an in-app notification; automated FCM dispatch is still pending. Viewing is for patient consultation, not a validated diagnostic workstation.
