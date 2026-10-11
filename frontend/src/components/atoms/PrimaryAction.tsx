import Button, { type ButtonProps } from "@mui/material/Button"

export type PrimaryActionProps = Omit<ButtonProps, "variant" | "color">

export default function PrimaryAction(props: PrimaryActionProps) {
  return <Button {...props} variant="contained" color="secondary" disableElevation />
}
