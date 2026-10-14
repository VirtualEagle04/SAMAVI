import Stack from "@mui/material/Stack"
import Typography from "@mui/material/Typography"
import type { ReactNode } from "react"

export type SectionHeadingProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function SectionHeading({ title, description, action }: SectionHeadingProps) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
      </Stack>
      {action}
    </Stack>
  )
}
