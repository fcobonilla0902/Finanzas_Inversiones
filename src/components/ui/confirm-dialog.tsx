import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import { Button } from "./button";

export function ConfirmDialog({
  description,
  close,
  confirm,
}: {
  description: string;
  close: () => void;
  confirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="confirmation-dialog">
        <span className="confirmation-icon">
          <Trash2 size={22} />
        </span>
        <DialogTitle>¿Eliminar este movimiento?</DialogTitle>
        <DialogDescription className="muted">
          Se eliminará «{description}» y se recalcularán los saldos de las
          cuentas relacionadas.
        </DialogDescription>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button variant="outline" onClick={close} disabled={busy}>
            Conservar
          </Button>
          <Button
            className="danger-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await confirm();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Eliminando…" : "Eliminar movimiento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
