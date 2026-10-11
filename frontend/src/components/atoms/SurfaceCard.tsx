import Card, { type CardProps } from "@mui/material/Card"

export type SurfaceCardProps = CardProps

export default function SurfaceCard({ variant = "outlined", ...props }: SurfaceCardProps) {
  return <Card {...props} variant={variant} elevation={0} />
}
