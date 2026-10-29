---
name: backend-api-feedback
description: Handle API responses in the delivery marketplace UI and show clear status-aware user feedback in web and Android clients.
---

# Backend API feedback

Use this when changing API calls, form submissions, authentication, or user-visible request feedback in the frontend or Android seller app.

## Response behavior

- For successful user actions (2xx), show a concise green success toast/snackbar. Do not show success feedback for routine background reads.
- Treat HTTP 400, 409, and 422 as business or validation feedback: show a yellow warning with the backend's useful message.
- Treat network failures, unavailable services, and HTTP 5xx as errors: show a red error with a useful message and a retry-oriented fallback.
- On HTTP 401, clear the saved session and return the user to login where the flow supports authentication. Do not confuse this with an ordinary validation warning.
- Parse common Spring response fields such as `message`, `detail`, `title`, `errors`, and `violations`. Prefer a clear backend message; ignore generic labels such as “Bad Request” and “Internal Server Error” in favor of a useful fallback. Never display stack traces or raw technical diagnostics.
- Keep field validation visible near the relevant fields when possible, and also use the warning feedback for submission-level errors.

## Project conventions

- Web: use `apiRequest` from `frontend/src/lib/apiClient.ts` and `toast.apiError` from `ToastProvider`; use `BusinessRuleError` for client-side business validation.
- Android seller app: classify failures in `AppViewModel` and display `UiFeedback` through the root snackbar host in `AppNav.kt`. Use green for success, pale yellow with dark text for warnings, and red for errors.
- Preserve a specific, user-friendly success message for each action. Avoid replacing API failures with demo data or reporting a failed request as successful.
