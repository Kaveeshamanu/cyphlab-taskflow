# Working rules for this project

## Version control — hard boundary
- **NEVER run git commands.** No `git add`, `git commit`, `git push`, `git branch`, `git checkout`, `gh`.
- **NEVER** add `Co-Authored-By` trailers, "Generated with Claude Code" footers, or any AI attribution to any file, commit, or PR.
- **NEVER** create or edit anything inside `.github/` without asking me first and showing me the file contents.
- I handle all version control myself. If you think something should be committed, say so and stop.

## Working style
- **Plan before code.** State what you'll build, wait for my OK, then build.
- **One phase per turn.** Do not run ahead into the next phase.
- At the end of each phase: give me a summary of every file you created or changed, and **stop**.
- If you're unsure about a requirement, **ask** — do not invent it.
- If a phase is running long, tell me and propose what to cut.
- Never leave the project in a non-building state.

## Code standards
- TypeScript strict mode everywhere. `tsc --noEmit` must pass.
- No secrets in code. Everything through `.env`, mirrored in `.env.example`.
- Enforce authorization **server-side** on every route. Hiding a UI button is not security.
- Every endpoint gets: a Zod validation schema, an OpenAPI annotation, and at least one test.
- Keep files small and single-purpose. If a file passes ~250 lines, split it.
- Ask before adding any dependency that isn't already in the stack.

## Explaining the work
I am being interviewed on this code. After each phase, if I ask "explain X", walk me through it
properly — I need to be able to defend every decision without you in the room.
