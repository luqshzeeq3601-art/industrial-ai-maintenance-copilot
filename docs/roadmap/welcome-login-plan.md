# Welcome Login Plan (mockup steps 1-3 + HITL wiring)

Gap: `AuthModal.tsx` + `ActionApprovalCard.tsx` exist but App never renders them.
`App.tsx` has no `currentUser`, `handleSend` drops `pending_action`, no `/me` check.
Mockup wants full-page step 1 Login | step 2 Fleet Rail | step 3 Asset Header.

## Implementation
1. `workspace/WelcomePage.tsx` (new): 3-column onboarding matching mockup.
   Login card posts `POST {apiBase}/api/v1/auth/login` (credentials include),
   shows JWT Role Active badge. Fleet Rail preview from `equipment` prop.
   Asset Header preview from `selectedMachine` + fault props + Check Alarm -> `onCheckAlarm`.
2. `workspace/types.ts`: `Message` += `pending_action?: PendingActionPayload`, `action_result?`.
   Import type from `ActionApprovalCard` (already exports `PendingActionPayload`).
3. `workspace/ConversationThread.tsx`: props += `currentUser, apiBase, onOpenAuth`;
   render `<ActionApprovalCard action={msg.pending_action} .../>` under assistant bubble.
4. `App.tsx`: `currentUser` + `authOpen` state, `/me` fetch on mount,
   `handleSend` sends `credentials: include`, stores `pending_action`/`action_result`,
   gates `if (!currentUser) return <WelcomePage/>`, header role badge + Sign in/out,
   renders `<AuthModal/>`. Keeps existing tabs/fleet/chat untouched.

## Accept
- Logged-out first paint = mockup 3-column welcome; login tech1/supervisor1 works.
- Logged-in sees workspace; approval card appears on `approval_required` with role gate.
- `npm run lint` green; `npm run build` green.
