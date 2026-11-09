import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({
  id,
  visibilityLabel = "contraseña",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { visibilityLabel?: string }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-field">
      <input {...props} id={inputId} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-controls={inputId}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={19} aria-hidden="true" />
        ) : (
          <Eye size={19} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
