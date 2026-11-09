export function FieldError({
  name,
  message,
}: {
  name: string;
  message?: string;
}) {
  return message ? (
    <span className="field-error" role="alert" id={`${name}-error`}>
      {message}
    </span>
  ) : null;
}
