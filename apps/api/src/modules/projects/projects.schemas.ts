// Thin re-export of the canonical schemas in @taskflow/types — see
// modules/auth/auth.schemas.ts for why this indirection exists.
export {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  addProjectMemberSchema,
  projectIdParamsSchema,
  projectMemberParamsSchema,
} from '@taskflow/types'
