# How to write

Rule: if it can be deleted without losing anything, delete it.
Applies to plans, `.md` files, comments, commits and PRs.

## Plans

❌ Long:

> To implement this feature, we will first analyze the current structure of the authentication module, considering the different alternatives available in the Next.js ecosystem, and then we will proceed to create a new component that will be in charge of managing...

✅ Short:

> **What:** logout button in the header.
> **Why:** today you can only log out from /dashboard.
> **How:** reuses the `logout` action in `(auth)/actions.ts`.

## Code comments

❌ `// This function gets the user's role from the database using the id`
✅ `// Queried on every request so a role change applies instantly.`

The code says what. The comment says why. No why, no comment.

## Questions

❌ "How do you want to handle permissions?"
✅ "Who can delete a project?

1. Admin only (recommended): simple, zero risk.
2. Admin + owner: more flexible, needs an `owner_id` column."

## Commits

- `feat: logout in the header`
- `fix: redirect loop with an expired token`
- English, lowercase, present tense, at most ~60 characters.
