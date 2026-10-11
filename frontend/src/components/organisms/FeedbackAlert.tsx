import Alert, { type AlertProps } from "@mui/material/Alert"

export type FeedbackAlertProps = AlertProps

export default function FeedbackAlert(props: FeedbackAlertProps) {
  return <Alert {...props} variant="outlined" />
}
